const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  if (!USDC_ADDRESS) {
    throw new Error("USDC_ADDRESS not set in .env");
  }

  console.log("=== Deploying KYA Protocol to Base Sepolia ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("Using USDC at:", USDC_ADDRESS, "\n");

  // Deploy KYA
  console.log("Deploying KYA Protocol...");
  const KYA = await hre.ethers.getContractFactory("KYA");
  const kya = await KYA.deploy(USDC_ADDRESS);
  await kya.waitForDeployment();

  const kyaAddress = await kya.getAddress();
  console.log("✅ KYA deployed to:", kyaAddress);

  console.log("\n=== Deployment Complete ===");
  console.log("KYA Address:", kyaAddress);
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("\nAdd to .env:");
  console.log(`KYA_ADDRESS=${kyaAddress}`);

  return kyaAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
