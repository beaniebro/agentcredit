"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { KYA_ADDRESS, KYA_ABI } from "@/lib/contracts";
import { tierFromEnum, formatUSDC, TIERS } from "@/lib/tier-utils";
import { TierBadge } from "@/components/TierBadge";

export default function AgentPage() {
  const { address: connectedAddress } = useAccount();
  const [input, setInput] = useState("");
  const [searchAddress, setSearchAddress] = useState<`0x${string}` | null>(null);
  const [testAmount, setTestAmount] = useState("");

  const {
    data: agentInfo,
    isLoading,
    isError,
  } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "getAgentInfo",
    args: searchAddress ? [searchAddress] : undefined,
    query: { enabled: !!searchAddress },
  });

  const { data: endorsements } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "getEndorsements",
    args: searchAddress ? [searchAddress] : undefined,
    query: { enabled: !!searchAddress },
  });

  const { data: effectiveCapacity } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "getEffectiveCapacity",
    args: searchAddress ? [searchAddress] : undefined,
    query: { enabled: !!searchAddress },
  });

  const { data: credentialValid } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "hasValidCredential",
    args: searchAddress ? [searchAddress] : undefined,
    query: { enabled: !!searchAddress },
  });

  const { data: credential } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "getCredential",
    args: searchAddress ? [searchAddress] : undefined,
    query: { enabled: !!searchAddress && !!credentialValid },
  });

  // canHandle check — only runs when user enters an amount
  const testAmountParsed = testAmount ? parseUnits(testAmount, 6) : BigInt(0);
  const hasTestAmount = testAmountParsed > BigInt(0);
  const { data: canHandleResult } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "canHandle",
    args: searchAddress && hasTestAmount ? [searchAddress, testAmountParsed] : undefined,
    query: { enabled: !!searchAddress && hasTestAmount },
  });

  function handleSearch() {
    if (isAddress(input)) {
      setSearchAddress(input as `0x${string}`);
      setTestAmount("");
    }
  }

  function useConnectedWallet() {
    if (connectedAddress) {
      setInput(connectedAddress);
      setSearchAddress(connectedAddress);
      setTestAmount("");
    }
  }

  const agent = agentInfo as
    | [bigint, bigint, bigint, bigint, number, bigint, boolean]
    | undefined;
  const endorsementList = endorsements as
    | Array<{
        endorser: string;
        skill: string;
        comment: string;
        weight: bigint;
        timestamp: bigint;
      }>
    | undefined;
  const cred = credential as
    | [string, bigint, bigint, boolean, string]
    | undefined;

  const tier = agent ? tierFromEnum(agent[4]) : null;
  const tierColor = tier ? TIERS[tier].color : "#2563eb";

  // Collect unique skills from endorsements
  const skills = endorsementList
    ? [...new Set(endorsementList.map((e) => e.skill).filter(Boolean))]
    : [];

  return (
    <div className="radial-hero min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="gradient-text mb-3 text-5xl font-bold">
            Credit Lookup
          </h1>
          <p className="text-lg text-muted">
            View any agent&apos;s on-chain trust score and credit limit
          </p>
        </div>

        {/* Search */}
        <div className="glass-card mb-8 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="0x... agent address"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-xl bg-midnight/80 px-4 py-3 font-mono text-sm text-text placeholder-muted/50 outline-none ring-1 ring-white/10 focus:ring-primary/50"
            />
            <button
              onClick={handleSearch}
              disabled={!isAddress(input)}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
          {connectedAddress && (
            <button
              onClick={useConnectedWallet}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Use connected wallet ({connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)})
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && searchAddress && (
          <div className="glass-card p-8 text-center">
            <p className="animate-subtle-pulse text-muted">Loading agent data from Base Sepolia...</p>
          </div>
        )}

        {/* Error */}
        {isError && searchAddress && (
          <div className="glass-card border-red-500/30 p-8 text-center">
            <p className="text-red-400">
              Could not find agent data. The address may not be registered.
            </p>
          </div>
        )}

        {/* Agent Profile */}
        {agent && tier && !isLoading && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div
              className="glass-card p-8"
              style={{
                borderColor: `${tierColor}40`,
                borderWidth: "1px",
                boxShadow: `0 0 30px ${tierColor}20`,
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="mb-1 font-mono text-sm text-muted">
                    {searchAddress}
                  </p>
                  <div className="flex items-center gap-3">
                    <TierBadge tier={tier} size="lg" />
                    {agent[6] ? (
                      <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                        Inactive
                      </span>
                    )}
                    {credentialValid && (
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-400">
                        Credentialed
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted">Credit Limit</span>
                  <div
                    className="font-mono text-3xl font-bold"
                    style={{ color: tierColor }}
                  >
                    ${formatUSDC(effectiveCapacity as bigint ?? agent[5])}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Stake" value={`$${formatUSDC(agent[0])}`} />
                <StatCard label="Trust Score" value={agent[3].toString()} />
                <StatCard label="Endorsements" value={agent[1].toString()} />
                <StatCard label="Reports" value={agent[2].toString()} />
              </div>
            </div>

            {/* Math Breakdown */}
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Credit Limit Calculation</h3>
              <div className="flex items-center justify-center gap-4 font-mono text-lg">
                <span className="text-muted">${formatUSDC(agent[0])} stake</span>
                <span className="text-primary">×</span>
                <span style={{ color: tierColor }}>
                  {TIERS[tier].multiplier}x {tier}
                </span>
                <span className="text-primary">=</span>
                <span className="font-bold" style={{ color: tierColor }}>
                  ${formatUSDC(agent[5])}
                </span>
              </div>
              {credentialValid && cred && (
                <p className="mt-3 text-center text-sm text-muted">
                  Credential cap: ${formatUSDC(cred[1])} — effective capacity: ${formatUSDC(effectiveCapacity as bigint ?? agent[5])}
                </p>
              )}
              <p className="mt-2 text-center text-sm text-muted">
                Combined score: ${formatUSDC(agent[0])} + {agent[3].toString()} trust = {Number(agent[0]) / 1e6 + Number(agent[3])}
              </p>
            </div>

            {/* canHandle Checker — x402 integration demo */}
            <div className="glass-card p-6">
              <h3 className="mb-2 text-lg font-semibold">Credit Check</h3>
              <p className="mb-4 text-sm text-muted">
                Simulates a merchant running a credit check — can this agent&apos;s
                credit score authorize this transaction amount?
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    placeholder="Amount in USDC"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full rounded-xl bg-midnight/80 py-3 pl-8 pr-4 font-mono text-sm text-text placeholder-muted/50 outline-none ring-1 ring-white/10 focus:ring-primary/50"
                  />
                </div>
                {testAmount && hasTestAmount && (
                  <div className={`rounded-xl px-6 py-3 font-semibold ${
                    canHandleResult
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {canHandleResult ? "Authorized" : "Rejected"}
                  </div>
                )}
              </div>
              {testAmount && hasTestAmount && (
                <p className="mt-3 text-center text-xs text-muted">
                  {canHandleResult
                    ? `Agent can handle $${testAmount} (capacity: $${formatUSDC(effectiveCapacity as bigint ?? agent[5])})`
                    : `$${testAmount} exceeds agent capacity of $${formatUSDC(effectiveCapacity as bigint ?? agent[5])}`}
                </p>
              )}
            </div>

            {/* Credential Details */}
            {credentialValid && cred && (
              <div className="glass-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Principal Credential</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-midnight/50 p-3">
                    <span className="text-xs text-muted">Principal</span>
                    <span className="font-mono text-sm">{(cred[0] as string).slice(0, 8)}...{(cred[0] as string).slice(-6)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-midnight/50 p-3">
                    <span className="text-xs text-muted">Max Amount</span>
                    <span className="font-mono text-sm font-bold">${formatUSDC(cred[1])}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-midnight/50 p-3">
                    <span className="text-xs text-muted">Expires</span>
                    <span className="font-mono text-sm">{new Date(Number(cred[2]) * 1000).toLocaleDateString()}</span>
                  </div>
                  {cred[4] && (
                    <div className="flex items-center justify-between rounded-lg bg-midnight/50 p-3">
                      <span className="text-xs text-muted">Constraints</span>
                      <span className="text-sm">{cred[4]}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skill Breakdown */}
            {skills.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const count = endorsementList!.filter((e) => e.skill === skill).length;
                    const totalWeight = endorsementList!
                      .filter((e) => e.skill === skill)
                      .reduce((sum, e) => sum + Number(e.weight), 0);
                    return (
                      <div
                        key={skill}
                        className="rounded-lg bg-primary/10 px-4 py-2 text-center"
                      >
                        <div className="text-sm font-semibold text-primary">{skill}</div>
                        <div className="text-xs text-muted">
                          {count} endorsement{count !== 1 ? "s" : ""} &middot; weight {totalWeight}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Endorsements */}
            {endorsementList && endorsementList.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="mb-4 text-lg font-semibold">
                  Endorsements ({endorsementList.length})
                </h3>
                <div className="space-y-3">
                  {endorsementList.map((e, i) => (
                    <div key={i} className="rounded-lg bg-midnight/50 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-xs text-muted">
                          {e.endorser.slice(0, 6)}...{e.endorser.slice(-4)}
                        </span>
                        <div className="flex items-center gap-2">
                          {e.skill && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                              {e.skill}
                            </span>
                          )}
                          <span className="text-xs text-muted">
                            wt: {e.weight.toString()}
                          </span>
                        </div>
                      </div>
                      {e.comment && (
                        <p className="text-sm text-muted">{e.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state — show demo agents */}
        {!searchAddress && !isLoading && (
          <div className="glass-card p-8">
            <p className="mb-4 text-center text-muted">
              Select a demo agent or enter any address above
            </p>
            <div className="space-y-3">
              {[
                { addr: "0x85Ec36E7f863066032f0f51013Bc9F02231684Be", label: "Main Agent", desc: "3 endorsements, Gold tier, $700 capacity" },
                { addr: "0x7280f8dee33bEb2ae18611fb7910028DB565D56F", label: "Research Agent", desc: "1 endorsement, Bronze tier" },
                { addr: "0x5D57ABc2915d726C2C4FCE8cE3ef5bcB39e0243C", label: "Settlement Agent", desc: "1 endorsement, Bronze tier" },
                { addr: "0xfaA3168e980B4Dd728cDC6212DC70b3e2cd55928", label: "Reported Agent", desc: "1 report, trust penalized" },
              ].map((agent) => (
                <button
                  key={agent.addr}
                  onClick={() => {
                    setInput(agent.addr);
                    setSearchAddress(agent.addr as `0x${string}`);
                  }}
                  className="w-full rounded-lg bg-midnight/50 p-4 text-left transition-all hover:bg-midnight/80 hover:ring-1 hover:ring-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text">{agent.label}</span>
                    <span className="text-xs text-muted">{agent.desc}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted/60">{agent.addr}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-midnight/50 p-3 text-center">
      <span className="text-xs text-muted">{label}</span>
      <div className="font-mono text-lg font-bold">{value}</div>
    </div>
  );
}
