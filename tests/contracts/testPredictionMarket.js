import { expect } from "chai";
import { network } from "hardhat";

async function latestTimestamp(ethers) {
  const block = await ethers.provider.getBlock("latest");
  return Number(block.timestamp);
}

describe("PredictionMarket", function () {
  let ethers;
  let networkHelpers;

  beforeEach(async function () {
    ({ ethers, networkHelpers } = await network.connect());
  });

  it("should deploy successfully", async function () {
    const [owner] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(owner.address);
    await pm.waitForDeployment();
    expect(await pm.getAddress()).to.be.properAddress;
    expect(await pm.resolver()).to.equal(owner.address);
  });

  it("creates a market and emits MarketCreated", async function () {
    const [resolver] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();

    const t = await latestTimestamp(ethers);
    const closeTime = t + 1_000;
    const resolveTime = t + 2_000;
    const tx = await pm.createMarket("Test question?", closeTime, resolveTime);
    const receipt = await tx.wait();
    expect(receipt.logs.length).to.be.greaterThan(0);

    const market = await pm.getMarket(1);
    expect(market.question).to.equal("Test question?");
    expect(market.status).to.equal(0); // Open
  });

  it("reverts createMarket when closeTime is not in the future", async function () {
    const [resolver] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();

    const t = await latestTimestamp(ethers);
    await expect(pm.createMarket("Q", t - 1, t + 100)).to.be.revertedWith(
      "closeTime in past",
    );
  });

  it("places a bet, resolves, and winner claims payout", async function () {
    const [resolver, bettor] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();

    const t = await latestTimestamp(ethers);
    const closeTime = t + 1_000;
    const resolveTime = t + 2_000;
    await pm.createMarket("Will tests pass?", closeTime, resolveTime);

    const marketId = 1n;
    const stake = ethers.parseEther("1.0");
    await expect(pm.connect(bettor).placeBet(marketId, 1, { value: stake }))
      .to.emit(pm, "BetPlaced")
      .withArgs(marketId, bettor.address, 1, stake);

    await networkHelpers.time.setNextBlockTimestamp(resolveTime + 1);
    await networkHelpers.mine();

    await expect(pm.connect(resolver).resolveMarket(marketId, 1)).to.emit(
      pm,
      "MarketResolved",
    );

    const balBefore = await ethers.provider.getBalance(bettor.address);
    const tx = await pm.connect(bettor).claimPayout(marketId);
    const receipt = await tx.wait();
    const gasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
    const gas = receipt.gasUsed * gasPrice;
    const balAfter = await ethers.provider.getBalance(bettor.address);
    expect(balAfter + gas).to.be.gt(balBefore);
  });

  it("reverts placeBet with zero value", async function () {
    const [resolver] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();

    const t = await latestTimestamp(ethers);
    await pm.createMarket("Q", t + 100, t + 200);
    await expect(pm.placeBet(1, 1, { value: 0 })).to.be.revertedWithCustomError(
      pm,
      "ZeroStake",
    );
  });

  it("only resolver can resolve", async function () {
    const [resolver, other] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();

    const t = await latestTimestamp(ethers);
    await pm.createMarket("Q", t + 100, t + 200);
    await networkHelpers.time.setNextBlockTimestamp(t + 201);
    await networkHelpers.mine();

    await expect(pm.connect(other).resolveMarket(1, 1)).to.be.revertedWith(
      "Only resolver",
    );
  });
});
