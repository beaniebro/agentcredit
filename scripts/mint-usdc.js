const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0xe83CA885FeE1f1660BB45fcaa540ab91FF785B95";

  const usdc = await hre.ethers.getContractAt("TestUSDC", USDC_ADDRESS);
  const [deployer] = await hre.ethers.getSigners();

  console.log("Minting to:", deployer.address);
  const tx = await usdc.mint(deployer.address, 10000n * 10n**6n);
  await tx.wait();
  console.log("Mint tx:", tx.hash);

  const bal = await usdc.balanceOf(deployer.address);
  console.log("Balance:", hre.ethers.formatUnits(bal, 6), "USDC");
}

main().catch(console.error);
