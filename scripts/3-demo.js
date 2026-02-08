const hre = require("hardhat");

async function main() {
  const KYA_ADDRESS = process.env.KYA_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  console.log("=== KYA Protocol Demo (v2 with Enhanced Reputation) ===\n");
  console.log("KYA:", KYA_ADDRESS);
  console.log("USDC:", USDC_ADDRESS, "\n");

  const kya = await hre.ethers.getContractAt("KYA", KYA_ADDRESS);
  const usdc = await hre.ethers.getContractAt("TestUSDC", USDC_ADDRESS);
  const [deployer] = await hre.ethers.getSigners();

  // Check current balance
  let usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");

  // Check if already registered
  const existingAgent = await kya.agents(deployer.address);
  if (existingAgent.active) {
    console.log("\n✅ Already registered as agent!");
    const info = await kya.getAgentInfo(deployer.address);
    console.log("Stake:", hre.ethers.formatUnits(info.stake, 6), "USDC");
    console.log("Trust Score:", info.trustScore.toString());
    console.log("Tier:", ["Bronze", "Silver", "Gold", "Platinum"][Number(info.tier)]);
    console.log("Max Transaction:", hre.ethers.formatUnits(info.maxTransaction, 6), "USDC");

    // Show endorsements if any
    const endorsements = await kya.getEndorsements(deployer.address);
    if (endorsements.length > 0) {
      console.log("\n--- Endorsements Received ---");
      for (const e of endorsements) {
        console.log(`  - ${e.skill} (weight: ${e.weight}x) from ${e.endorser.slice(0,8)}...`);
        if (e.comment) console.log(`    "${e.comment}"`);
      }
    }
    return;
  }

  // Register as agent with $50 USDC
  console.log("\n--- Registering as Agent ---");
  const stakeAmount = 50n * 10n ** 6n; // $50 USDC

  console.log("Approving USDC...");
  const approveTx = await usdc.approve(KYA_ADDRESS, stakeAmount);
  await approveTx.wait();
  console.log("✅ Approved");

  console.log("Registering with $50 stake...");
  const registerTx = await kya.register(stakeAmount);
  await registerTx.wait();
  console.log("✅ Registered! TX:", registerTx.hash);

  // Get agent info
  console.log("\n--- Agent Info ---");
  const info = await kya.getAgentInfo(deployer.address);

  console.log("Address:", deployer.address);
  console.log("Stake:", hre.ethers.formatUnits(info.stake, 6), "USDC");
  console.log("Endorsements:", info.endorsementCount.toString());
  console.log("Reports:", info.reportCount.toString());
  console.log("Trust Score:", info.trustScore.toString());
  console.log("Tier:", ["Bronze", "Silver", "Gold", "Platinum"][Number(info.tier)]);
  console.log("Max Transaction:", hre.ethers.formatUnits(info.maxTransaction, 6), "USDC");

  console.log("\n🔥 NOVEL MECHANISM:");
  console.log("$50 stake + 0 trust = Silver tier (4x) = $200 max capacity");
  console.log("With endorsements → Gold (7x) or Platinum (10x) = up to $500!");

  console.log("\n📊 ENHANCED REPUTATION:");
  console.log("- Skill-specific endorsements (trading, research, execution)");
  console.log("- Weighted by endorser trust (1-3x)");
  console.log("- Comments and timestamps stored on-chain");

  // Protocol stats
  const stats = await kya.getProtocolStats();
  console.log("\n--- Protocol Stats ---");
  console.log("Total Staked:", hre.ethers.formatUnits(stats._totalStaked, 6), "USDC");
  console.log("Total Agents:", stats._agentCount.toString());

  console.log("\n=== Demo Complete ===");
  console.log("\nView on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${KYA_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
