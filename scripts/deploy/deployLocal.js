const hre = require("hardhat");

async function main() {
  // TODO: Desplegar contratos en red local (Hardhat/Anvil)
  console.log("Deploying contracts to local network...");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

