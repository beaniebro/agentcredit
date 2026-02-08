// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKYA — Minimal interface for KYA Protocol
 */
interface IKYA {
    struct Endorsement {
        address endorser;
        string skill;
        string comment;
        uint256 weight;
        uint256 timestamp;
    }

    function getTrustScore(address agent) external view returns (uint256);
    function getAgentInfo(address agent) external view returns (
        uint256 stake,
        uint256 endorsementCount,
        uint256 reportCount,
        uint256 trustScore,
        uint8 tier,
        uint256 maxTransaction,
        bool active
    );
    function getEndorsements(address agent) external view returns (Endorsement[] memory);
    function canHandle(address agent, uint256 amount) external view returns (bool);
    function getEffectiveCapacity(address agent) external view returns (uint256);
}

/**
 * @title KYAReputationAdapter
 * @notice ERC-8004 Reputation Registry adapter for KYA Protocol.
 *
 * Makes KYA trust scores and endorsements readable through the ERC-8004
 * Reputation Registry interface. Any app in the ERC-8004 ecosystem can
 * query KYA reputation without knowing KYA's native API.
 *
 * Also exposes `canHandleTransaction()` as the x402 integration point:
 * an x402 resource server calls this single function to determine whether
 * an agent's reputation authorizes a given payment amount.
 *
 * Agent ID mapping: agentId = uint256(uint160(agentAddress))
 * This allows deterministic lookup — no separate identity registry required.
 */
contract KYAReputationAdapter {

    IKYA public immutable kya;

    constructor(address _kya) {
        require(_kya != address(0), "KYA address required");
        kya = IKYA(_kya);
    }

    // ── ID Conversion ───────────────────────────────────────────────

    function agentIdToAddress(uint256 agentId) public pure returns (address) {
        require(agentId <= type(uint160).max, "Invalid agentId");
        return address(uint160(agentId));
    }

    function addressToAgentId(address agent) public pure returns (uint256) {
        return uint256(uint160(agent));
    }

    // ── ERC-8004 Reputation Registry — Read Interface ───────────────

    /// @notice Returns address(0) — KYA uses addresses directly, no separate identity registry.
    function getIdentityRegistry() external pure returns (address) {
        return address(0);
    }

    /// @notice ERC-8004 getSummary — returns KYA trust score and endorsement count.
    /// @param agentId Agent address cast to uint256
    /// @return count Number of endorsements
    /// @return summaryValue Trust score (0-100)
    /// @return summaryValueDecimals Always 0 (integer scores)
    function getSummary(
        uint256 agentId,
        address[] calldata, /* clientAddresses — KYA aggregates globally */
        string calldata,    /* tag1 */
        string calldata     /* tag2 */
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        address agent = agentIdToAddress(agentId);
        (
            ,
            uint256 endorsementCount,
            ,
            uint256 trustScore,
            ,
            ,
            bool active
        ) = kya.getAgentInfo(agent);

        if (!active) return (0, 0, 0);

        count = uint64(endorsementCount);
        summaryValue = int128(int256(trustScore));
        summaryValueDecimals = 0;
    }

    /// @notice ERC-8004 readFeedback — returns a single KYA endorsement as feedback.
    /// @param agentId Agent address cast to uint256
    /// @param feedbackIndex Index into the endorsements array
    /// @return value Endorsement weight scaled to feedback value
    /// @return valueDecimals Always 0
    /// @return tag1 Skill category (e.g. "trading", "research")
    /// @return tag2 Endorser comment
    /// @return isRevoked Always false (KYA endorsements are permanent)
    function readFeedback(
        uint256 agentId,
        address, /* clientAddress — ignored for index-based lookup */
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    ) {
        address agent = agentIdToAddress(agentId);
        IKYA.Endorsement[] memory endorsements = kya.getEndorsements(agent);

        require(feedbackIndex < endorsements.length, "Index out of bounds");

        IKYA.Endorsement memory e = endorsements[feedbackIndex];
        value = int128(int256(e.weight * 10));
        valueDecimals = 0;
        tag1 = e.skill;
        tag2 = e.comment;
        isRevoked = false;
    }

    /// @notice ERC-8004 getClients — returns all endorsers for an agent.
    function getClients(uint256 agentId) external view returns (address[] memory) {
        address agent = agentIdToAddress(agentId);
        IKYA.Endorsement[] memory endorsements = kya.getEndorsements(agent);

        address[] memory clients = new address[](endorsements.length);
        for (uint256 i = 0; i < endorsements.length; i++) {
            clients[i] = endorsements[i].endorser;
        }
        return clients;
    }

    /// @notice ERC-8004 getLastIndex — returns endorsement count for an agent.
    function getLastIndex(uint256 agentId, address) external view returns (uint64) {
        address agent = agentIdToAddress(agentId);
        IKYA.Endorsement[] memory endorsements = kya.getEndorsements(agent);
        return uint64(endorsements.length);
    }

    // ── x402 Integration Point ──────────────────────────────────────

    /// @notice x402 merchants call this to check if an agent's reputation
    ///         authorizes a given payment amount. Single composable check.
    /// @param agentId Agent address cast to uint256
    /// @param amount Transaction amount in USDC (6 decimals)
    /// @return authorized Whether the agent can handle this amount
    function canHandleTransaction(uint256 agentId, uint256 amount) external view returns (bool authorized) {
        return kya.canHandle(agentIdToAddress(agentId), amount);
    }

    /// @notice Get agent's effective financial capacity (reputation-gated).
    /// @param agentId Agent address cast to uint256
    /// @return capacity Maximum transaction amount in USDC (6 decimals)
    function getCapacity(uint256 agentId) external view returns (uint256 capacity) {
        return kya.getEffectiveCapacity(agentIdToAddress(agentId));
    }
}
