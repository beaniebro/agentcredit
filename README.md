# AgentCredit

**A credit score for AI agents — where reputation multiplies capital.**

Agents with high trust can transact at **10x their stake** through earned behavior.

---

## The Innovation

**Same stake, different reputation = different transaction capacity.**

```
Agent A: $50 stake + 0 trust   → $100 capacity  (Bronze, 2x)
Agent B: $50 stake + 30 trust  → $200 capacity  (Silver, 4x)
Agent C: $50 stake + 80 trust  → $350 capacity  (Gold, 7x)
Agent D: $50 stake + 100 trust → $500 capacity  (Platinum, 10x)
```

This is **reputation as collateral multiplier** - the first implementation on-chain.

---

## Where AgentCredit Fits

```
ERC-8004  →  "Who is this agent?"          (on-chain identity + reputation registry)
x402      →  "Can this agent pay?"          (HTTP 402 payment protocol, Coinbase)
AgentCredit → "How much SHOULD it transact?" (reputation-gated financial capacity)
```

ERC-8004 proves who an agent is. x402 lets agents pay. AgentCredit determines how much an agent should be trusted to transact — turning reputation into programmable financial capacity. It's the missing bridge between identity and payments.

---

## Why This Matters

- Reputation multiplies your capacity
- Up to 10:1 leverage through earned trust
- Start small, build reputation, unlock capacity
- Good agents get economic advantage

---

## Architecture

```
┌─────────────────────────────────────┐
│  Tier System                        │  Platinum (10x) → Gold (7x)
│  Based on stake + trust combined    │  Silver (4x) → Bronze (2x)
├─────────────────────────────────────┤
│  Enhanced Reputation                │  Skill-specific endorsements
│  Weighted by endorser trust (1-3x)  │  Trading, Research, Execution
├─────────────────────────────────────┤
│  Identity Layer                     │  Controller addresses
│  Metadata URI + capabilities        │  IPFS/Arweave profiles
├─────────────────────────────────────┤
│  Economic Layer                     │  USDC staking ($10 minimum)
│  THE NOVEL MECHANISM                │  Reputation × Stake = Capacity
└─────────────────────────────────────┘
```

---

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| **AgentCredit v2** | [`0x81F5997247a15a79B58a127BfA3901D8e4069e6a`](https://sepolia.basescan.org/address/0x81F5997247a15a79B58a127BfA3901D8e4069e6a) |
| **ERC-8004 Adapter** | [`0x029174736786CAacfcca7a7c5C177375aF86CcC1`](https://sepolia.basescan.org/address/0x029174736786CAacfcca7a7c5C177375aF86CcC1) |
| **TestUSDC** | [`0xe83CA885FeE1f1660BB45fcaa540ab91FF785B95`](https://sepolia.basescan.org/address/0xe83CA885FeE1f1660BB45fcaa540ab91FF785B95) |

**Demo agent:** `0x85Ec36E7f863066032f0f51013Bc9F02231684Be` — look this up in the frontend to see a live profile.

---

## Quick Start

### Integration (2 lines)

```solidity
interface IAgentCredit {
    function canHandle(address agent, uint256 amount) external view returns (bool);
    function getMaxTransaction(address agent) external view returns (uint256);
    function getTrustScore(address agent) external view returns (uint256);
    function getSkillScore(address agent, string calldata skill) external view returns (uint256);
}

contract YourContract {
    IAgentCredit ac = IAgentCredit(0x81F5997247a15a79B58a127BfA3901D8e4069e6a);

    function doSomething(address agent, uint256 amount) external {
        require(ac.canHandle(agent, amount), "Insufficient capacity");
        // Your logic here
    }
}
```

### Register as Agent

```solidity
// 1. Approve USDC
usdc.approve(agentCreditAddress, 50 * 1e6); // $50

// 2. Register
ac.register(50 * 1e6);

// 3. Check your capacity
uint256 maxTx = ac.getMaxTransaction(myAddress);
```

### Endorse Another Agent

```solidity
// Simple endorsement
ac.endorse(agentAddress);

// Skill-specific endorsement (weighted by your trust)
ac.endorseWithSkill(agentAddress, "trading", "Fast execution, reliable");
```

### Register with Credential (Principal Authorization)

ERC-8004 already proves *who* authorized an agent via EIP-712 signatures. AgentCredit credentials go further — they set a **financial ceiling** that the principal signs off on, and the protocol enforces automatically.

```javascript
// Off-chain: Principal signs financial authorization for agent
const messageHash = await ac.getCredentialMessageHash(
    agentAddress,
    principalAddress,
    maxAmount,        // e.g., 1000 * 1e6 for $1000
    expiry,           // Unix timestamp
    "trading:uniswap" // Constraints
);
const signature = await principal.signMessage(ethers.getBytes(messageHash));

// On-chain: Agent registers with credential
await ac.connect(agent).registerWithCredential(
    stakeAmount,
    principalAddress,
    maxAmount,
    expiry,
    "trading:uniswap",
    signature
);
```

The credential's `maxAmount` becomes a hard ceiling — effective capacity = min(reputation-based capacity, credential max).

---

## Core Functions

### Registration & Staking

| Function | Description |
|----------|-------------|
| `register(amount)` | Register with USDC stake (min $10) |
| `registerWithMetadata(amount, controller, uri)` | Register with identity info |
| `registerWithCredential(amount, principal, maxAmount, expiry, constraints, signature)` | Register with signed credential from principal |
| `addStake(amount)` | Add more USDC to existing stake |
| `withdraw()` | Withdraw stake (if no reports) |

### Credentials

| Function | Description |
|----------|-------------|
| `registerWithCredential(...)` | Register with principal's signed financial authorization |
| `revokeCredential(agent)` | Principal revokes agent's credential |
| `hasValidCredential(agent)` | Check if agent has valid credential |
| `getCredential(agent)` | Get credential details |
| `getCredentialMessageHash(...)` | Helper for generating signatures |

### Reputation

| Function | Description |
|----------|-------------|
| `endorse(agent)` | Simple endorsement (+10 trust) |
| `endorseWithSkill(agent, skill, comment)` | Skill-specific, weighted endorsement |
| `report(agent)` | Report problematic agent (-20 trust) |

### View Functions

| Function | Returns |
|----------|---------|
| `getTrustScore(agent)` | Trust score (0-100, decays after 30 days inactive) |
| `getTier(agent)` | Tier enum (Bronze/Silver/Gold/Platinum) |
| `getMaxTransaction(agent)` | Maximum transaction capacity in USDC |
| `getEffectiveCapacity(agent)` | Capacity capped by credential (the x402 bridge) |
| `canHandle(agent, amount)` | Boolean - can agent handle this amount? (uses credential cap) |
| `getAgentCapacity(agent)` | Returns `(effectiveCapacity, hasCredential)` |
| `getSkillScore(agent, skill)` | Weighted score for specific skill |
| `getEndorsements(agent)` | Array of all endorsements received |
| `getAgentInfo(agent)` | Full agent profile |

---

## Tier System

| Tier | Combined Score | Multiplier | Example |
|------|---------------|------------|---------|
| **Bronze** | 0-39 | 2x | $20 stake → $40 capacity |
| **Silver** | 40-79 | 4x | $30 stake + 10 trust → $120 capacity |
| **Gold** | 80-149 | 7x | $50 stake + 30 trust → $350 capacity |
| **Platinum** | 150+ | 10x | $100 stake + 50 trust → $1,000 capacity |

*Combined Score = Stake (in USDC) + Trust Score*

---

## Trust Score Calculation

```
Trust = (Endorsements × 10) - (Reports × 20) + Time Bonus
```

- **Endorsements:** +10 points each
- **Reports:** -20 points each (stronger negative signal)
- **Time Bonus:** +1 per day active (max +10)
- **Cap:** 0-100 range

### Weighted Endorsements

When using `endorseWithSkill()`, the endorser's trust affects the weight:

| Endorser Trust | Weight |
|---------------|--------|
| 0-49 | 1x |
| 50-99 | 2x |
| 100 | 3x |

High-trust endorsers have more influence on skill scores.

---

## Use Cases

### 1. Escrow Services
```solidity
// Only allow agents with sufficient capacity
require(ac.canHandle(agent, escrowAmount), "Insufficient capacity");
```

### 2. Dynamic Interest Rates
```solidity
// Higher trust = lower interest
uint256 trust = ac.getTrustScore(borrower);
uint256 interestRate = baseRate - (trust * discount / 100);
```

### 3. Marketplace Tiers
```solidity
// Require Gold tier for high-value listings
require(ac.getTier(seller) >= AgentCredit.Tier.Gold, "Gold tier required");
```

### 4. Skill-Based Matching
```solidity
// Require minimum trading skill for DeFi tasks
require(ac.getSkillScore(agent, "trading") >= 10, "Insufficient trading rep");
```

---

## ERC-8004 Integration (Deployed)

The `KYAReputationAdapter` contract exposes AgentCredit reputation through the [ERC-8004 Reputation Registry](https://eips.ethereum.org/EIPS/eip-8004) interface. Any app in the ERC-8004 ecosystem can read trust scores without knowing AgentCredit's native API.

```solidity
// Any ERC-8004 app can query AgentCredit reputation:
adapter.getSummary(agentId, [], "", "")  // → (endorsementCount, trustScore, 0)
adapter.readFeedback(agentId, addr, 0)  // → individual endorsement as ERC-8004 feedback
adapter.getClients(agentId)             // → list of endorsers
```

Agent IDs map deterministically: `agentId = uint256(uint160(agentAddress))`.

### x402 Integration

An x402 resource server calls one function to check if an agent's reputation authorizes a given payment amount:

```solidity
// x402 merchant checks: should I accept this payment?
adapter.canHandleTransaction(agentId, amount)  // → true/false

// Or directly on AgentCredit:
ac.canHandle(agentAddress, amount)             // → true/false
```

The agent's stake × tier multiplier determines capacity. A $50 stake with high trust (10x Platinum) authorizes up to $500 in transactions. Same function, one call, composable with any payment flow.

---

## Development

### Setup

```bash
git clone https://github.com/your-repo/agentcredit
cd agentcredit
npm install
cp .env.example .env
# Add your PRIVATE_KEY and BASESCAN_API_KEY
```

### Test

```bash
npx hardhat test
```

### Deploy

```bash
# Deploy TestUSDC
npx hardhat run scripts/1-deploy-test-usdc.js --network baseSepolia

# Deploy AgentCredit
npx hardhat run scripts/2-deploy-kya.js --network baseSepolia

# Run demo
npx hardhat run scripts/3-demo.js --network baseSepolia
```

---

## Security

- **ReentrancyGuard** on withdrawals
- **Ownable** for governance functions
- **OpenZeppelin** battle-tested contracts
- Reports block withdrawals (sybil resistance)
- Slashing for malicious behavior

---

## Roadmap

- **Yield on staked capital** — Deploy staked USDC into low-risk DeFi strategies (e.g. Aave, Morpho) so agents earn yield while their capital backs their reputation. Staking becomes productive, not idle.
- **Reputation-weighted insurance pool** — Portion of staked capital funds a shared insurance pool. Higher-tier agents contribute less proportionally, creating an incentive to build trust.
- **Cross-chain reputation** — Bridge trust scores to other L2s via LayerZero or Hyperlane so agents don't restart from zero on each chain.
- **Agent-to-agent delegation** — Allow high-trust agents to delegate capacity to sub-agents, enabling teams of agents to operate under a shared reputation.
- **Dynamic multipliers** — Adjust tier multipliers based on protocol-wide risk metrics (total staked, default rate, market conditions) rather than fixed values.
- **On-chain reputation history** — Store endorsement/report history as soulbound attestations for portable, verifiable agent track records.
- **Mainnet deployment** — Deploy to Base mainnet with real USDC staking.

---

## License

MIT

---

## Links

- **BaseScan:** [View Contract](https://sepolia.basescan.org/address/0x81F5997247a15a79B58a127BfA3901D8e4069e6a)
- **Demo Agent:** [View on BaseScan](https://sepolia.basescan.org/address/0x85Ec36E7f863066032f0f51013Bc9F02231684Be)

---

Built for USDC Agentic Hackathon 2026
