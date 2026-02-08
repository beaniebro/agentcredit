// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title KYA Protocol - Know Your Agent
 * @notice On-chain agent identity and reputation system with novel collateral multiplier
 * @dev First implementation of reputation as economic leverage
 *
 * THE NOVEL MECHANISM:
 * Same stake can enable different transaction capacities based on earned trust.
 * $50 stake + 0 reputation → $100 capacity (2x)
 * $50 stake + 100 reputation → $500 capacity (10x)
 */
contract KYA is ReentrancyGuard, Ownable {

    // ===== TYPES =====

    struct Agent {
        uint256 stake;              // USDC staked (6 decimals)
        uint256 endorsementCount;   // Total endorsements received
        uint256 reportCount;        // Total reports received
        uint256 registeredAt;       // Registration timestamp
        uint256 lastEndorsedAt;     // Last time this agent received an endorsement
        bool active;                // Is agent active?
        address controller;         // Who controls this agent
        string metadataURI;         // IPFS/Arweave metadata URI
    }

    enum Tier {
        Bronze,   // 2x multiplier
        Silver,   // 4x multiplier
        Gold,     // 7x multiplier
        Platinum  // 10x multiplier
    }

    struct Endorsement {
        address endorser;       // Who endorsed
        string skill;           // Skill category (e.g., "trading", "research")
        string comment;         // Optional comment
        uint256 weight;         // 1-3x based on endorser's trust
        uint256 timestamp;      // When endorsed
    }

    /**
     * @notice Credential linking agent to principal with constraints
     * @dev Implements "Know Your Agent" - cryptographically signed authorization
     */
    struct Credential {
        address principal;      // The human/org authorizing this agent
        uint256 maxAmount;      // Maximum transaction amount authorized
        uint256 expiry;         // Credential expiration timestamp
        bool revoked;           // Has credential been revoked?
        string constraints;     // JSON or URI describing constraints
    }

    // ===== STATE =====

    IERC20 public immutable usdc;

    mapping(address => Agent) public agents;
    mapping(address => mapping(address => bool)) public hasEndorsed;
    mapping(address => mapping(address => bool)) public hasReported;

    // Enhanced reputation: skill-specific endorsements
    mapping(address => Endorsement[]) public endorsements;
    mapping(address => mapping(string => uint256)) public skillScores; // agent => skill => weighted score

    // Credentials: linking agents to principals
    mapping(address => Credential) public credentials;
    mapping(address => uint256) public principalNonces; // Prevent signature replay

    uint256 public constant MIN_STAKE = 10 * 10**6; // 10 USDC minimum
    uint256 public constant MIN_ENDORSEMENT_AGE = 1 hours; // Sybil resistance
    uint256 public totalStaked;
    uint256 public agentCount;

    // ===== EVENTS =====

    event AgentRegistered(address indexed agent, uint256 stake, address controller);
    event StakeAdded(address indexed agent, uint256 amount);
    event Endorsed(address indexed agent, address indexed endorser);
    event EndorsedWithSkill(address indexed agent, address indexed endorser, string skill, uint256 weight);
    event Reported(address indexed agent, address indexed reporter);
    event Slashed(address indexed agent, uint256 amount);
    event Withdrawn(address indexed agent, uint256 amount);
    event MetadataUpdated(address indexed agent, string metadataURI);
    event ControllerChanged(address indexed agent, address newController);
    event CredentialIssued(address indexed agent, address indexed principal, uint256 maxAmount, uint256 expiry);
    event CredentialRevoked(address indexed agent, address indexed principal);
    event ReportResolved(address indexed agent, address indexed resolver);

    // ===== CONSTRUCTOR =====

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ===== REGISTRATION =====

    /**
     * @notice Register as an agent with USDC stake
     * @param amount USDC amount to stake (minimum 10 USDC)
     */
    function register(uint256 amount) external {
        require(amount >= MIN_STAKE, "Below minimum stake");
        require(!agents[msg.sender].active, "Already registered");

        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        agents[msg.sender] = Agent({
            stake: amount,
            endorsementCount: 0,
            reportCount: 0,
            registeredAt: block.timestamp,
            lastEndorsedAt: 0,
            active: true,
            controller: msg.sender,
            metadataURI: ""
        });

        totalStaked += amount;
        agentCount++;

        emit AgentRegistered(msg.sender, amount, msg.sender);
    }

    /**
     * @notice Register with metadata and custom controller
     * @param amount USDC amount to stake
     * @param _controller Address that controls this agent
     * @param _metadataURI IPFS/Arweave URI for agent metadata
     */
    function registerWithMetadata(
        uint256 amount,
        address _controller,
        string calldata _metadataURI
    ) external {
        require(amount >= MIN_STAKE, "Below minimum stake");
        require(!agents[msg.sender].active, "Already registered");
        require(_controller != address(0), "Invalid controller");

        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        agents[msg.sender] = Agent({
            stake: amount,
            endorsementCount: 0,
            reportCount: 0,
            registeredAt: block.timestamp,
            lastEndorsedAt: 0,
            active: true,
            controller: _controller,
            metadataURI: _metadataURI
        });

        totalStaked += amount;
        agentCount++;

        emit AgentRegistered(msg.sender, amount, _controller);
    }

    /**
     * @notice Register with a cryptographically signed credential from a principal
     * @dev Implements KYA - linking agent to principal with signed authorization
     * @param amount USDC amount to stake
     * @param principal Address of the authorizing principal (human/org)
     * @param maxAmount Maximum transaction amount the principal authorizes
     * @param expiry Credential expiration timestamp
     * @param constraints JSON or URI describing agent constraints
     * @param signature Principal's signature authorizing this agent
     */
    function registerWithCredential(
        uint256 amount,
        address principal,
        uint256 maxAmount,
        uint256 expiry,
        string calldata constraints,
        bytes calldata signature
    ) external {
        require(amount >= MIN_STAKE, "Below minimum stake");
        require(!agents[msg.sender].active, "Already registered");
        require(principal != address(0), "Invalid principal");
        require(expiry > block.timestamp, "Credential expired");

        // Verify signature from principal
        uint256 nonce = principalNonces[principal];
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,      // agent address
            principal,       // principal address
            maxAmount,       // authorized amount
            expiry,          // expiration
            constraints,     // constraints string
            nonce,           // replay protection
            block.chainid    // chain id
        ));

        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, signature);
        require(signer == principal, "Invalid signature");

        // Increment nonce to prevent replay
        principalNonces[principal]++;

        // Transfer stake
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Create agent
        agents[msg.sender] = Agent({
            stake: amount,
            endorsementCount: 0,
            reportCount: 0,
            registeredAt: block.timestamp,
            lastEndorsedAt: 0,
            active: true,
            controller: principal, // Principal becomes controller
            metadataURI: ""
        });

        // Store credential
        credentials[msg.sender] = Credential({
            principal: principal,
            maxAmount: maxAmount,
            expiry: expiry,
            revoked: false,
            constraints: constraints
        });

        totalStaked += amount;
        agentCount++;

        emit AgentRegistered(msg.sender, amount, principal);
        emit CredentialIssued(msg.sender, principal, maxAmount, expiry);
    }

    /**
     * @notice Revoke a credential (only principal can revoke)
     * @param agent Address of the agent whose credential to revoke
     */
    function revokeCredential(address agent) external {
        Credential storage cred = credentials[agent];
        require(cred.principal == msg.sender, "Not the principal");
        require(!cred.revoked, "Already revoked");

        cred.revoked = true;
        emit CredentialRevoked(agent, msg.sender);
    }

    // ===== STAKING =====

    /**
     * @notice Add more USDC to existing stake
     * @param amount Additional USDC to stake
     */
    function addStake(uint256 amount) external {
        require(agents[msg.sender].active, "Not registered");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        agents[msg.sender].stake += amount;
        totalStaked += amount;

        emit StakeAdded(msg.sender, amount);
    }

    /**
     * @notice Withdraw all stake (only if no reports)
     */
    function withdraw() external nonReentrant {
        Agent storage agent = agents[msg.sender];
        require(agent.active, "Not active");
        require(agent.reportCount == 0, "Has unresolved reports");

        uint256 amount = agent.stake;
        agent.stake = 0;
        agent.active = false;
        totalStaked -= amount;
        agentCount--;

        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ===== REPUTATION =====

    /**
     * @notice Endorse another agent (simple version)
     * @param agent Address to endorse
     */
    function endorse(address agent) external {
        require(agents[msg.sender].active, "Must be registered");
        require(agents[agent].active, "Target not registered");
        require(msg.sender != agent, "Cannot self-endorse");
        require(!hasEndorsed[msg.sender][agent], "Already endorsed");
        require(block.timestamp - agents[msg.sender].registeredAt >= MIN_ENDORSEMENT_AGE, "Must wait before endorsing");

        agents[agent].endorsementCount++;
        agents[agent].lastEndorsedAt = block.timestamp;
        hasEndorsed[msg.sender][agent] = true;

        emit Endorsed(agent, msg.sender);
    }

    /**
     * @notice Endorse another agent with skill and comment (enhanced version)
     * @dev Endorsement weight is based on endorser's trust score (1-3x)
     * @param agent Address to endorse
     * @param skill Skill category (e.g., "trading", "research", "execution")
     * @param comment Optional comment about the endorsement
     */
    function endorseWithSkill(
        address agent,
        string calldata skill,
        string calldata comment
    ) external {
        require(agents[msg.sender].active, "Must be registered");
        require(agents[agent].active, "Target not registered");
        require(msg.sender != agent, "Cannot self-endorse");
        require(!hasEndorsed[msg.sender][agent], "Already endorsed");
        require(bytes(skill).length > 0, "Skill required");
        require(block.timestamp - agents[msg.sender].registeredAt >= MIN_ENDORSEMENT_AGE, "Must wait before endorsing");

        // Calculate endorser weight based on their trust (1-3x)
        uint256 endorserTrust = getTrustScore(msg.sender);
        uint256 weight = 1 + (endorserTrust / 50); // 0-49 trust = 1x, 50-99 = 2x, 100 = 3x
        if (weight > 3) weight = 3;

        // Store detailed endorsement
        endorsements[agent].push(Endorsement({
            endorser: msg.sender,
            skill: skill,
            comment: comment,
            weight: weight,
            timestamp: block.timestamp
        }));

        // Update counts and scores
        agents[agent].endorsementCount++;
        agents[agent].lastEndorsedAt = block.timestamp;
        skillScores[agent][skill] += weight;
        hasEndorsed[msg.sender][agent] = true;

        emit EndorsedWithSkill(agent, msg.sender, skill, weight);
    }

    /**
     * @notice Report a problematic agent
     * @param agent Address to report
     */
    function report(address agent) external {
        require(agents[msg.sender].active, "Must be registered");
        require(agents[agent].active, "Target not registered");
        require(msg.sender != agent, "Cannot self-report");
        require(!hasReported[msg.sender][agent], "Already reported");

        agents[agent].reportCount++;
        hasReported[msg.sender][agent] = true;

        emit Reported(agent, msg.sender);
    }

    // ===== TRUST CALCULATION =====

    /**
     * @notice Calculate trust score (0-100)
     * @param agent Address to calculate for
     * @return Trust score between 0 and 100
     */
    function getTrustScore(address agent) public view returns (uint256) {
        Agent memory a = agents[agent];
        if (!a.active) return 0;

        // Base score: +10 per endorsement, -20 per report
        int256 baseScore = int256(a.endorsementCount * 10) - int256(a.reportCount * 20);
        if (baseScore < 0) baseScore = 0;

        // Time factor: agents active longer get slight bonus (max +10)
        uint256 daysActive = (block.timestamp - a.registeredAt) / 1 days;
        uint256 timeBonus = daysActive > 10 ? 10 : daysActive;

        uint256 score = uint256(baseScore) + timeBonus;

        // Time decay: after 30 days with no endorsements, score decays 1 point/day
        if (a.lastEndorsedAt > 0 && block.timestamp > a.lastEndorsedAt + 30 days) {
            uint256 decayDays = (block.timestamp - a.lastEndorsedAt - 30 days) / 1 days;
            if (decayDays >= score) return 0;
            score -= decayDays;
        }

        if (score > 100) score = 100;

        return score;
    }

    // ===== TIER SYSTEM =====

    /**
     * @notice Get agent tier based on stake + trust combined
     * @param agent Address to check
     * @return Tier enum value
     */
    function getTier(address agent) public view returns (Tier) {
        Agent memory a = agents[agent];
        if (!a.active) return Tier.Bronze;

        uint256 trust = getTrustScore(agent);
        uint256 stakeInUSDC = a.stake / 10**6;
        uint256 combined = stakeInUSDC + trust;

        if (combined >= 150) return Tier.Platinum;
        if (combined >= 80) return Tier.Gold;
        if (combined >= 40) return Tier.Silver;
        return Tier.Bronze;
    }

    /**
     * @notice Get multiplier for a tier
     * @param tier Tier to get multiplier for
     * @return Multiplier value (2, 4, 7, or 10)
     */
    function getTierMultiplier(Tier tier) public pure returns (uint256) {
        if (tier == Tier.Platinum) return 10;
        if (tier == Tier.Gold) return 7;
        if (tier == Tier.Silver) return 4;
        return 2; // Bronze
    }

    // ===== 🔥 NOVEL MECHANISM: REPUTATION AS LEVERAGE =====

    /**
     * @notice Get maximum transaction capacity based on stake × tier multiplier
     * @dev THIS IS THE NOVEL MECHANISM - reputation multiplies capital efficiency
     * @param agent Address to check
     * @return Maximum transaction amount in USDC (6 decimals)
     */
    function getMaxTransaction(address agent) public view returns (uint256) {
        Agent memory a = agents[agent];
        if (!a.active) return 0;

        Tier tier = getTier(agent);
        uint256 multiplier = getTierMultiplier(tier);

        return a.stake * multiplier;
    }

    /**
     * @notice Get effective capacity considering both reputation and credential constraints
     * @dev Returns min(reputation-based capacity, credential.maxAmount) when credential exists
     * @param agent Address to check
     * @return Effective maximum transaction amount in USDC (6 decimals)
     */
    function getEffectiveCapacity(address agent) public view returns (uint256) {
        uint256 reputationCapacity = getMaxTransaction(agent);
        if (reputationCapacity == 0) return 0;

        Credential memory cred = credentials[agent];
        // If agent has a valid credential, enforce its maxAmount as ceiling
        if (cred.principal != address(0) && !cred.revoked && cred.expiry > block.timestamp) {
            return reputationCapacity < cred.maxAmount ? reputationCapacity : cred.maxAmount;
        }

        return reputationCapacity;
    }

    /**
     * @notice Check if agent can handle a transaction of given size
     * @dev Single composable oracle for x402 merchants and protocols
     * @param agent Address to check
     * @param amount Transaction amount in USDC (6 decimals)
     * @return True if agent has sufficient capacity
     */
    function canHandle(address agent, uint256 amount) external view returns (bool) {
        return getEffectiveCapacity(agent) >= amount;
    }

    /**
     * @notice Convenience view returning effective capacity and credential status
     * @param agent Address to check
     * @return effectiveCapacity The agent's effective transaction capacity
     * @return hasCredential Whether the agent has a valid credential
     */
    function getAgentCapacity(address agent) external view returns (
        uint256 effectiveCapacity,
        bool hasCredential
    ) {
        Credential memory cred = credentials[agent];
        bool validCred = cred.principal != address(0) && !cred.revoked && cred.expiry > block.timestamp;
        return (getEffectiveCapacity(agent), validCred);
    }

    // ===== IDENTITY MANAGEMENT =====

    /**
     * @notice Update agent metadata URI
     * @param _metadataURI New IPFS/Arweave URI
     */
    function updateMetadata(string calldata _metadataURI) external {
        require(agents[msg.sender].active, "Not registered");
        agents[msg.sender].metadataURI = _metadataURI;
        emit MetadataUpdated(msg.sender, _metadataURI);
    }

    /**
     * @notice Change controller address (must be current controller)
     * @param newController New controller address
     */
    function changeController(address newController) external {
        Agent storage agent = agents[msg.sender];
        require(agent.active, "Not registered");
        require(msg.sender == agent.controller, "Not authorized");
        require(newController != address(0), "Invalid controller");

        agent.controller = newController;
        emit ControllerChanged(msg.sender, newController);
    }

    // ===== GOVERNANCE =====

    /**
     * @notice Slash agent stake (owner only - for governance enforcement)
     * @param agent Address to slash
     * @param amount Amount to slash
     */
    function slash(address agent, uint256 amount) external onlyOwner {
        require(agents[agent].active, "Not active");
        require(agents[agent].stake >= amount, "Insufficient stake");

        agents[agent].stake -= amount;
        totalStaked -= amount;

        // Slashed funds go to contract owner (could be a DAO treasury)
        require(usdc.transfer(owner(), amount), "Transfer failed");

        emit Slashed(agent, amount);
    }

    /**
     * @notice Resolve a report against an agent (owner only)
     * @dev Decrements reportCount so agent can eventually withdraw
     * @param agent Address whose report to resolve
     */
    function resolveReport(address agent) external onlyOwner {
        require(agents[agent].active, "Not active");
        require(agents[agent].reportCount > 0, "No reports to resolve");

        agents[agent].reportCount--;

        emit ReportResolved(agent, msg.sender);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get full agent info
     * @param agent Address to query
     * @return stake Current stake amount
     * @return endorsementCount Number of endorsements
     * @return reportCount Number of reports
     * @return trustScore Calculated trust score (0-100)
     * @return tier Current tier
     * @return maxTransaction Maximum transaction capacity
     * @return active Whether agent is active
     */
    function getAgentInfo(address agent) external view returns (
        uint256 stake,
        uint256 endorsementCount,
        uint256 reportCount,
        uint256 trustScore,
        Tier tier,
        uint256 maxTransaction,
        bool active
    ) {
        Agent memory a = agents[agent];
        return (
            a.stake,
            a.endorsementCount,
            a.reportCount,
            getTrustScore(agent),
            getTier(agent),
            getMaxTransaction(agent),
            a.active
        );
    }

    /**
     * @notice Get protocol statistics
     * @return _totalStaked Total USDC staked in protocol
     * @return _agentCount Total number of active agents
     */
    function getProtocolStats() external view returns (
        uint256 _totalStaked,
        uint256 _agentCount
    ) {
        return (totalStaked, agentCount);
    }

    // ===== ENHANCED REPUTATION VIEW FUNCTIONS =====

    /**
     * @notice Get skill-specific score for an agent
     * @param agent Address to query
     * @param skill Skill to check
     * @return Weighted skill score
     */
    function getSkillScore(address agent, string calldata skill) external view returns (uint256) {
        return skillScores[agent][skill];
    }

    /**
     * @notice Get all endorsements for an agent
     * @param agent Address to query
     * @return Array of Endorsement structs
     */
    function getEndorsements(address agent) external view returns (Endorsement[] memory) {
        return endorsements[agent];
    }

    /**
     * @notice Get number of endorsements for an agent
     * @param agent Address to query
     * @return Number of detailed endorsements
     */
    function getEndorsementCount(address agent) external view returns (uint256) {
        return endorsements[agent].length;
    }

    // ===== CREDENTIAL VIEW FUNCTIONS =====

    /**
     * @notice Check if agent has a valid (non-expired, non-revoked) credential
     * @param agent Address to check
     * @return True if credential is valid
     */
    function hasValidCredential(address agent) external view returns (bool) {
        Credential memory cred = credentials[agent];
        return cred.principal != address(0) &&
               !cred.revoked &&
               cred.expiry > block.timestamp;
    }

    /**
     * @notice Get credential details for an agent
     * @param agent Address to query
     * @return principal The authorizing principal
     * @return maxAmount Maximum authorized amount
     * @return expiry Expiration timestamp
     * @return revoked Whether credential is revoked
     * @return constraints Constraints string
     */
    function getCredential(address agent) external view returns (
        address principal,
        uint256 maxAmount,
        uint256 expiry,
        bool revoked,
        string memory constraints
    ) {
        Credential memory cred = credentials[agent];
        return (cred.principal, cred.maxAmount, cred.expiry, cred.revoked, cred.constraints);
    }

    /**
     * @notice Get the message hash that a principal needs to sign
     * @dev Helper function for off-chain signature generation
     * @param agent Agent address to authorize
     * @param principal Principal address
     * @param maxAmount Maximum amount to authorize
     * @param expiry Credential expiry
     * @param constraints Constraints string
     * @return The message hash to sign
     */
    function getCredentialMessageHash(
        address agent,
        address principal,
        uint256 maxAmount,
        uint256 expiry,
        string calldata constraints
    ) external view returns (bytes32) {
        uint256 nonce = principalNonces[principal];
        return keccak256(abi.encodePacked(
            agent,
            principal,
            maxAmount,
            expiry,
            constraints,
            nonce,
            block.chainid
        ));
    }
}
