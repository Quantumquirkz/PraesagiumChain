const { expect } = require("chai");
const hre = require("hardhat");

describe("CREWorkflow", function () {
  let predictionMarket, creWorkflow, oracleConsumer;
  let owner, user1, user2;
  let marketId;

  before(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
    const CREWorkflow = await hre.ethers.getContractFactory("CREWorkflow");
    const OracleConsumer = await hre.ethers.getContractFactory("OracleConsumer");

    predictionMarket = await PredictionMarket.deploy(owner.address);
    await predictionMarket.waitForDeployment();

    creWorkflow = await CREWorkflow.deploy(await predictionMarket.getAddress(), owner.address);
    await creWorkflow.waitForDeployment();

    oracleConsumer = await OracleConsumer.deploy(await creWorkflow.getAddress());
    await oracleConsumer.waitForDeployment();

    await creWorkflow.setOracle(await oracleConsumer.getAddress());
    await predictionMarket.setResolver(await creWorkflow.getAddress());
    await oracleConsumer.setAuthorizedCallback(owner.address);
  });

  it("should create a market and allow bets", async function () {
    const closeTime = Math.floor(Date.now() / 1000) + 3600;
    const resolveTime = closeTime + 300;

    const tx = await predictionMarket.connect(owner).createMarket(
      "Will Bitcoin exceed $50,000?",
      closeTime,
      resolveTime
    );
    const receipt = await tx.wait();
    const created = receipt.logs.find((l) => l.fragment?.name === "MarketCreated");
    expect(created).to.not.be.undefined;
    marketId = created.args[0];
    expect(marketId).to.equal(1n);

    await expect(
      predictionMarket.connect(user1).placeBet(marketId, 1, { value: hre.ethers.parseEther("0.1") })
    ).to.not.be.reverted;
    await expect(
      predictionMarket.connect(user2).placeBet(marketId, 2, { value: hre.ethers.parseEther("0.2") })
    ).to.not.be.reverted;

    const market = await predictionMarket.getMarket(marketId);
    expect(market.totalYesStake).to.equal(hre.ethers.parseEther("0.1"));
    expect(market.totalNoStake).to.equal(hre.ethers.parseEther("0.2"));
  });

  it("should not allow resolve from a non-oracle address", async function () {
    await expect(
      creWorkflow.connect(user1).resolveFromOracle(marketId, 1)
    ).to.be.revertedWith("Only oracle");
  });

  it("should resolve the market when the oracle calls oracleCallback", async function () {
    // oracleCallback restricted to authorizedCallback (set to owner in setup).
    // In production, set to Chainlink Functions Router.
    await expect(
      oracleConsumer.connect(owner).oracleCallback(marketId, 1)
    ).to.be.reverted; // fails because resolveTime has not been reached yet

    // Avanzar tiempo (Hardhat)
    await hre.network.provider.send("evm_increaseTime", [7200]);
    await hre.network.provider.send("evm_mine", []);

    await expect(oracleConsumer.connect(owner).oracleCallback(marketId, 1)).to.not.be.reverted;

    const market = await predictionMarket.getMarket(marketId);
    expect(market.status).to.equal(2); // Resolved
    expect(market.outcome).to.equal(1); // Yes
  });

  it("should allow winners to claim payout", async function () {
    const balanceBefore = await hre.ethers.provider.getBalance(user1.address);
    const tx = await predictionMarket.connect(user1).claimPayout(marketId);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await hre.ethers.provider.getBalance(user1.address);

    // user1 staked 0.1 ETH on Yes; pool total 0.3; Yes wins -> receives (0.1/0.1)*0.3 = 0.3
    expect(balanceAfter).to.equal(balanceBefore + hre.ethers.parseEther("0.3") - gasUsed);
  });
});
