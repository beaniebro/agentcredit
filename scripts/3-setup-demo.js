const hre = require("hardhat");

/**
 * Step 1: Register demo agents on Base Sepolia.
 * Run this first, then wait 1 hour, then run 4-endorse-demo.js
 */
async function main() {
  const KYA_ADDRESS = process.env.KYA_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  if (!KYA_ADDRESS || !USDC_ADDRESS) {
    throw new Error("KYA_ADDRESS and USDC_ADDRESS must be set in .env");
  }

  console.log("=== Setting Up Demo Agents on Base Sepolia ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const kya = await hre.ethers.getContractAt("KYA", KYA_ADDRESS);
  const usdc = await hre.ethers.getContractAt("TestUSDC", USDC_ADDRESS);

  // Check if deployer is already registered
  const deployerInfo = await kya.getAgentInfo(deployer.address);
  if (deployerInfo.active) {
    console.log("Deployer already registered, skipping...");
  } else {
    // Get USDC from faucet
    console.log("1. Claiming USDC from faucet...");
    const faucetTx = await usdc.faucet();
    await faucetTx.wait();
    console.log("   Got 1000 USDC");

    // Register deployer as main demo agent with $100 stake
    console.log("2. Registering deployer as agent ($100 stake)...");
    const approveTx = await usdc.approve(KYA_ADDRESS, 100n * 10n ** 6n);
    await approveTx.wait();
    const registerTx = await kya.register(100n * 10n ** 6n);
    await registerTx.wait();
    console.log("   Registered!");
  }

  // Create 3 helper wallets for endorsements
  const helpers = [];
  for (let i = 0; i < 3; i++) {
    const wallet = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
    helpers.push(wallet);
  }

  console.log("\n3. Funding and registering 3 helper wallets (one at a time)...");
  for (let i = 0; i < helpers.length; i++) {
    const helper = helpers[i];
    console.log(`\n   Helper ${i + 1}: ${helper.address}`);

    // Send ETH for gas (0.003 ETH each — enough for approve + register)
    console.log("   Sending ETH...");
    const ethTx = await deployer.sendTransaction({
      to: helper.address,
      value: hre.ethers.parseEther("0.003"),
    });
    await ethTx.wait();

    // Mint USDC to helper (deployer calls mint)
    console.log("   Minting USDC...");
    const mintTx = await usdc.mint(helper.address, 50n * 10n ** 6n);
    await mintTx.wait();

    // Now helper does their own transactions with explicit nonces
    const usdcAsHelper = usdc.connect(helper);
    const kyaAsHelper = kya.connect(helper);

    console.log("   Approving USDC...");
    const approveTx = await usdcAsHelper.approve(KYA_ADDRESS, 10n * 10n ** 6n, { nonce: 0 });
    await approveTx.wait();

    console.log("   Registering...");
    const registerTx = await kyaAsHelper.register(10n * 10n ** 6n, { nonce: 1 });
    await registerTx.wait();

    console.log(`   Done! Registered with $10 stake`);
  }

  // Save helper keys for the endorsement script
  const helperKeys = helpers.map((h) => h.privateKey);
  const fs = require("fs");
  fs.writeFileSync(
    "scripts/.demo-helpers.json",
    JSON.stringify({
      deployer: deployer.address,
      helpers: helpers.map((h, i) => ({
        address: h.address,
        privateKey: h.privateKey,
      })),
      createdAt: new Date().toISOString(),
      endorseAfter: new Date(Date.now() + 3600 * 1000).toISOString(),
    }, null, 2)
  );

  console.log("\n=== Demo Setup Complete ===");
  console.log(`Main agent: ${deployer.address}`);
  console.log(`Helpers: ${helpers.map(h => h.address).join(", ")}`);
  console.log(`\nHelper keys saved to scripts/.demo-helpers.json`);
  console.log(`\nNEXT STEP: Wait 1 hour, then run:`);
  console.log(`  npx hardhat run scripts/4-endorse-demo.js --network baseSepolia`);
  console.log(`  This will add endorsements and boost trust score.`);

  // Show current state
  const info = await kya.getAgentInfo(deployer.address);
  const stats = await kya.getProtocolStats();
  console.log(`\n--- Current State ---`);
  console.log(`Deployer: $${Number(info.stake) / 1e6} stake, ${info.trustScore} trust, tier ${info.tier}, $${Number(info.maxTransaction) / 1e6} capacity`);
  console.log(`Protocol: $${Number(stats._totalStaked) / 1e6} total staked, ${stats._agentCount} agents`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
