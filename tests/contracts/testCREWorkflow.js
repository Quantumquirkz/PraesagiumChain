import { expect } from "chai";
import { network } from "hardhat";

describe("CREWorkflow", function () {
  this.timeout(120000);

  let predictionMarket, creWorkflow, oracleConsumer;
  let owner, user1, user2;
  let marketId;
  let ethers;
  let networkHelpers;

  before(async function () {
    ({ ethers, networkHelpers } = await network.connect());
    [owner, user1, user2] = await ethers.getSigners();

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const CREWorkflow = await ethers.getContractFactory("CREWorkflow");
    const OracleConsumer = await ethers.getContractFactory("OracleConsumer");

    predictionMarket = await PredictionMarket.deploy(owner.address);
    await predictionMarket.waitForDeployment();

    creWorkflow = await CREWorkflow.deploy(
      await predictionMarket.getAddress(),
      owner.address,
    );
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
      resolveTime,
    );
    const receipt = await tx.wait();
    const created = receipt.logs.find((l) => l.fragment?.name === "MarketCreated");
    expect(created).to.not.be.undefined;
    marketId = created.args[0];
    expect(marketId).to.equal(1n);

    await expect(
      predictionMarket.connect(user1).placeBet(marketId, 1, {
        value: ethers.parseEther("0.1"),
      }),
    ).not.to.revert(ethers);
    await expect(
      predictionMarket.connect(user2).placeBet(marketId, 2, {
        value: ethers.parseEther("0.2"),
      }),
    ).not.to.revert(ethers);

    const market = await predictionMarket.getMarket(marketId);
    expect(market.totalYesStake).to.equal(ethers.parseEther("0.1"));
    expect(market.totalNoStake).to.equal(ethers.parseEther("0.2"));
  });

  it("should not allow resolve from a non-oracle address", async function () {
    await expect(
      creWorkflow.connect(user1).resolveFromOracle(marketId, 1),
    ).to.be.revertedWith("Only oracle");
  });

  it("should resolve the market when the oracle calls oracleCallback", async function () {
    await expect(oracleConsumer.connect(owner).oracleCallback(marketId, 1)).to.revert(
      ethers,
    );

    const m0 = await predictionMarket.getMarket(marketId);
    await networkHelpers.time.setNextBlockTimestamp(Number(m0.resolveTime) + 1);
    await networkHelpers.mine();

    await expect(oracleConsumer.connect(owner).oracleCallback(marketId, 1)).not.to.revert(
      ethers,
    );

    const market = await predictionMarket.getMarket(marketId);
    expect(market.status).to.equal(2); // Resolved
    expect(market.outcome).to.equal(1); // Yes
  });

  it("should allow winners to claim payout", async function () {
    const balanceBefore = await ethers.provider.getBalance(user1.address);
    const tx = await predictionMarket.connect(user1).claimPayout(marketId);
    const receipt = await tx.wait();
    const gasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
    const gasUsed = receipt.gasUsed * gasPrice;
    const balanceAfter = await ethers.provider.getBalance(user1.address);

    expect(balanceAfter).to.equal(
      balanceBefore + ethers.parseEther("0.3") - gasUsed,
    );
  });
});
