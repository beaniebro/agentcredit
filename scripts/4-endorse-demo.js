const hre = require("hardhat");
const fs = require("fs");

/**
 * Step 2: Endorsements, cross-endorsements, and a report.
 * Run this at least 1 hour after 3-setup-demo.js
 *
 * Creates 3 distinct agent profiles for the demo:
 *   - Deployer: 3 endorsements (trading/execution/bridging) → high trust
 *   - Helper1:  2 endorsements from deployer (research/analytics) → mid trust
 *   - Helper2:  1 endorsement from deployer (settlement) → low trust
 *   - Helper3:  Reported by deployer → penalized, shows report mechanism
 */
async function main() {
  const KYA_ADDRESS = process.env.KYA_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;

  if (!KYA_ADDRESS || !USDC_ADDRESS) {
    throw new Error("KYA_ADDRESS and USDC_ADDRESS must be set in .env");
  }

  const demoData = JSON.parse(fs.readFileSync("scripts/.demo-helpers.json", "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  const kya = await hre.ethers.getContractAt("KYA", KYA_ADDRESS);
  const tierNames = ["Bronze", "Silver", "Gold", "Platinum"];
  const multipliers = ["2x", "4x", "7x", "10x"];

  console.log("=== KYA Demo: Endorsements & Report ===\n");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Created at: ${demoData.createdAt}`);
  console.log(`Endorse after: ${demoData.endorseAfter}\n`);

  // ── Phase 1: Helpers endorse deployer ─────────────────────────────

  console.log("── Phase 1: Helpers endorse deployer ──\n");

  const helperSkills = ["trading", "execution", "bridging"];
  const helperComments = [
    "Reliable agent, consistently handles transactions well",
    "Fast execution speed, great at DeFi operations",
    "Excellent cross-chain bridging capability",
  ];

  for (let i = 0; i < demoData.helpers.length; i++) {
    const helper = new hre.ethers.Wallet(demoData.helpers[i].privateKey, hre.ethers.provider);
    process.stdout.write(`  Helper ${i + 1} (${helper.address.slice(0, 8)}...) → deployer [${helperSkills[i]}]... `);

    try {
      const tx = await kya.connect(helper).endorseWithSkill(
        demoData.deployer,
        helperSkills[i],
        helperComments[i]
      );
      await tx.wait();
      console.log("OK");
    } catch (err) {
      console.log(`FAILED: ${err.reason || err.message}`);
      if (err.message.includes("Must wait before endorsing")) {
        console.log("    Still too early! Wait until:", demoData.endorseAfter);
      }
    }
  }

  // ── Phase 2: Deployer endorses helpers (cross-endorsements) ───────

  console.log("\n── Phase 2: Deployer endorses helpers ──\n");

  const deployerEndorsements = [
    { target: 0, skill: "research", comment: "Thorough on-chain analysis capabilities" },
    { target: 0, skill: "analytics", comment: "Great data-driven risk assessment" },
    { target: 1, skill: "settlement", comment: "Solid settlement and clearing operations" },
  ];

  for (const e of deployerEndorsements) {
    const targetAddr = demoData.helpers[e.target].address;
    process.stdout.write(`  Deployer → Helper ${e.target + 1} (${targetAddr.slice(0, 8)}...) [${e.skill}]... `);

    try {
      const tx = await kya.connect(deployer).endorseWithSkill(
        targetAddr,
        e.skill,
        e.comment
      );
      await tx.wait();
      console.log("OK");
    } catch (err) {
      console.log(`FAILED: ${err.reason || err.message}`);
    }
  }

  // ── Phase 3: Deployer reports Helper3 ─────────────────────────────

  console.log("\n── Phase 3: Deployer reports Helper 3 ──\n");

  const helper3Addr = demoData.helpers[2].address;
  process.stdout.write(`  Deployer reports ${helper3Addr.slice(0, 8)}... `);

  try {
    const tx = await kya.connect(deployer).report(helper3Addr);
    await tx.wait();
    console.log("OK — trust penalized by -20");
  } catch (err) {
    console.log(`FAILED: ${err.reason || err.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────────

  console.log("\n=== Demo Agent Profiles ===\n");

  const agents = [
    { label: "Deployer (main agent)", addr: demoData.deployer },
    { label: "Helper 1 (2 endorsements)", addr: demoData.helpers[0].address },
    { label: "Helper 2 (1 endorsement)", addr: demoData.helpers[1].address },
    { label: "Helper 3 (reported)", addr: demoData.helpers[2].address },
  ];

  for (const a of agents) {
    const info = await kya.getAgentInfo(a.addr);
    const tier = Number(await kya.getTier(a.addr));
    const endorsements = await kya.getEndorsements(a.addr);

    console.log(`${a.label}`);
    console.log(`  Address:      ${a.addr}`);
    console.log(`  Stake:        $${Number(info.stake) / 1e6}`);
    console.log(`  Trust:        ${info.trustScore}`);
    console.log(`  Reports:      ${info.reportCount}`);
    console.log(`  Tier:         ${tierNames[tier]} (${multipliers[tier]})`);
    console.log(`  Capacity:     $${Number(info.maxTransaction) / 1e6}`);
    console.log(`  Endorsements: ${endorsements.length}`);
    for (const e of endorsements) {
      console.log(`    - ${e.skill} (weight ${e.weight}) from ${e.endorser.slice(0, 8)}...`);
    }
    console.log();
  }

  console.log("View in frontend: /agent → paste any address above");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
