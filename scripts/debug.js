const hre = require("hardhat");

async function main() {
  const KYA_ADDRESS = process.env.KYA_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  const kya = await hre.ethers.getContractAt("KYA", KYA_ADDRESS);
  const usdc = await hre.ethers.getContractAt("TestUSDC", USDC_ADDRESS);
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("USDC Balance:", hre.ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("KYA USDC Balance:", hre.ethers.formatUnits(await usdc.balanceOf(KYA_ADDRESS), 6));
  console.log("Allowance to KYA:", hre.ethers.formatUnits(await usdc.allowance(deployer.address, KYA_ADDRESS), 6));

  const agent = await kya.agents(deployer.address);
  console.log("\nAgent state:");
  console.log("  active:", agent.active);
  console.log("  stake:", hre.ethers.formatUnits(agent.stake, 6));

  // Try registering again with explicit approval
  console.log("\n--- Trying fresh registration ---");
  const stakeAmount = 50n * 10n ** 6n;

  console.log("Approving...");
  const approveTx = await usdc.approve(KYA_ADDRESS, stakeAmount);
  await approveTx.wait();
  console.log("Approved. New allowance:", hre.ethers.formatUnits(await usdc.allowance(deployer.address, KYA_ADDRESS), 6));

  // Check if already registered
  if (agent.active) {
    console.log("\nAlready registered. Trying to add stake...");
    const addTx = await kya.addStake(stakeAmount);
    await addTx.wait();
    console.log("Added stake TX:", addTx.hash);
  } else {
    console.log("\nRegistering...");
    const registerTx = await kya.register(stakeAmount);
    await registerTx.wait();
    console.log("Register TX:", registerTx.hash);
  }

  // Check final state
  const agentFinal = await kya.agents(deployer.address);
  console.log("\nFinal agent state:");
  console.log("  active:", agentFinal.active);
  console.log("  stake:", hre.ethers.formatUnits(agentFinal.stake, 6));

  const info = await kya.getAgentInfo(deployer.address);
  console.log("  tier:", ["Bronze", "Silver", "Gold", "Platinum"][Number(info.tier)]);
  console.log("  maxTx:", hre.ethers.formatUnits(info.maxTransaction, 6));
}

main().catch(console.error);
