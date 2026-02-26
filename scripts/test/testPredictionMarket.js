const { expect } = require("chai");
const hre = require("hardhat");

describe("PredictionMarket", function () {
  it("should deploy successfully", async function () {
    const [owner] = await hre.ethers.getSigners();
    const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
    const pm = await PredictionMarket.deploy(owner.address);
    await pm.waitForDeployment();
    expect(await pm.getAddress()).to.be.properAddress;
    expect(await pm.resolver()).to.equal(owner.address);
  });
});

