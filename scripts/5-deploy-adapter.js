const hre = require("hardhat");

async function main() {
  const KYA_ADDRESS = process.env.KYA_ADDRESS;
  if (!KYA_ADDRESS) throw new Error("KYA_ADDRESS must be set in .env");

  console.log("=== Deploying KYA ERC-8004 Reputation Adapter ===\n");
  console.log(`KYA Protocol: ${KYA_ADDRESS}`);

  const Adapter = await hre.ethers.getContractFactory("KYAReputationAdapter");
  const adapter = await Adapter.deploy(KYA_ADDRESS);
  await adapter.waitForDeployment();

  const address = await adapter.getAddress();
  console.log(`\nAdapter deployed: ${address}`);
  console.log(`\nThis adapter exposes KYA reputation through the ERC-8004 interface.`);
  console.log(`Any ERC-8004 app can now query KYA trust scores.\n`);

  // Verify it works
  const demo = "0x85Ec36E7f863066032f0f51013Bc9F02231684Be";
  const agentId = BigInt(demo);

  try {
    const [count, summaryValue, decimals] = await adapter.getSummary(agentId, [], "", "");
    console.log(`Verification — getSummary(${demo}):`);
    console.log(`  Endorsements: ${count}`);
    console.log(`  Trust Score:  ${summaryValue}`);

    const capacity = await adapter.getCapacity(agentId);
    console.log(`  Capacity:     $${Number(capacity) / 1e6}`);

    const canHandle100 = await adapter.canHandleTransaction(agentId, 100n * 10n ** 6n);
    console.log(`  canHandle $100: ${canHandle100}`);
  } catch (e) {
    console.log(`Verification skipped (demo agent may not exist): ${e.message}`);
  }

  console.log(`\n=== Add to .env ===`);
  console.log(`ADAPTER_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
