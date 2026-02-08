const hre = require("hardhat");

async function main() {
  console.log("=== Deploying TestUSDC to Base Sepolia ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy TestUSDC
  console.log("Deploying TestUSDC...");
  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();
  await usdc.waitForDeployment();

  const usdcAddress = await usdc.getAddress();
  console.log("✅ TestUSDC deployed to:", usdcAddress);

  // Mint initial supply to deployer
  console.log("\nMinting initial supply...");
  const mintTx = await usdc.mint(deployer.address, 10000n * 10n**6n); // 10,000 USDC
  await mintTx.wait();
  console.log("✅ Minted 10,000 USDC to deployer");

  // Verify balance
  const deployerBalance = await usdc.balanceOf(deployer.address);
  console.log("Deployer USDC balance:", hre.ethers.formatUnits(deployerBalance, 6), "USDC");

  console.log("\n=== Deployment Complete ===");
  console.log("TestUSDC Address:", usdcAddress);
  console.log("\nAdd to .env:");
  console.log(`USDC_ADDRESS=${usdcAddress}`);

  return usdcAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
