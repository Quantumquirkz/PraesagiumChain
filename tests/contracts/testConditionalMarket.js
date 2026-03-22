import { expect } from "chai";
import { network } from "hardhat";

async function latestTimestamp(ethers) {
  const block = await ethers.provider.getBlock("latest");
  return Number(block.timestamp);
}

describe("ConditionalMarket", function () {
  it("deploys and creates a conditional market linked to a resolved parent market", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const [resolver, bettor] = await ethers.getSigners();

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(resolver.address);
    await pm.waitForDeployment();
    const pmAddr = await pm.getAddress();

    const t = await latestTimestamp(ethers);
    const parentClose = t + 500;
    const parentResolve = t + 1_000;
    await pm.createMarket("Parent condition?", parentClose, parentResolve);

    await pm.connect(bettor).placeBet(1n, 1, { value: ethers.parseEther("0.1") });

    await networkHelpers.time.setNextBlockTimestamp(parentResolve + 1);
    await networkHelpers.mine();

    await pm.connect(resolver).resolveMarket(1n, 1);

    const ConditionalMarket = await ethers.getContractFactory("ConditionalMarket");
    const cm = await ConditionalMarket.deploy(resolver.address);
    await cm.waitForDeployment();

    const tAfterParent = await latestTimestamp(ethers);
    const condClose = tAfterParent + 200;
    const condResolve = tAfterParent + 2_000;
    const conditions = [
      {
        marketContract: pmAddr,
        marketId: 1n,
        expectedOutcome: 1,
      },
    ];

    const tx = await cm
      .connect(bettor)
      .createConditionalMarket("If parent is Yes?", condClose, condResolve, conditions);
    const receipt = await tx.wait();
    const created = receipt.logs.find((l) => l.fragment?.name === "ConditionalMarketCreated");
    expect(created).to.not.be.undefined;

    await cm.connect(bettor).placeBet(1n, 1, { value: ethers.parseEther("0.05") });

    await cm.connect(resolver).lockMarket(1n);

    await networkHelpers.time.setNextBlockTimestamp(condResolve + 1);
    await networkHelpers.mine();

    await expect(cm.connect(resolver).resolveMarket(1n)).to.emit(cm, "MarketResolved");

    const m = await cm.getMarket(1n);
    expect(m.status).to.equal(2);
    expect(m.outcome).to.equal(1);
  });
});
