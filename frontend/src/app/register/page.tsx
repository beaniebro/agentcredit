"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { KYA_ADDRESS, KYA_ABI, USDC_ADDRESS, USDC_ABI } from "@/lib/contracts";
import { formatUSDC, calculateTier } from "@/lib/tier-utils";
import { TierBadge } from "@/components/TierBadge";

type Step = "faucet" | "register" | "endorse" | "manage" | "credential" | "report";

const ACTION_STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "faucet", label: "Get USDC", icon: "1" },
  { key: "register", label: "Register", icon: "2" },
  { key: "endorse", label: "Endorse", icon: "3" },
  { key: "manage", label: "Manage", icon: "4" },
];

const INFO_STEPS: { key: Step; label: string }[] = [
  { key: "credential", label: "Credentials" },
  { key: "report", label: "Reporting & Sybil" },
];

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>("faucet");
  const [stakeAmount, setStakeAmount] = useState(50);
  const [endorseAddress, setEndorseAddress] = useState("");
  const [endorseSkill, setEndorseSkill] = useState("");
  const [endorseComment, setEndorseComment] = useState("");

  // Read USDC balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write hooks
  const { writeContract: writeFaucet, data: faucetHash, isPending: faucetPending } = useWriteContract();
  const { writeContract: writeApprove, data: approveHash, isPending: approvePending } = useWriteContract();
  const { writeContract: writeRegister, data: registerHash, isPending: registerPending } = useWriteContract();
  const { writeContract: writeEndorse, data: endorseHash, isPending: endorsePending } = useWriteContract();

  // Wait for txs
  const { isLoading: faucetConfirming, isSuccess: faucetSuccess } = useWaitForTransactionReceipt({ hash: faucetHash });
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: registerConfirming, isSuccess: registerSuccess } = useWaitForTransactionReceipt({ hash: registerHash });
  const { isLoading: endorseConfirming, isSuccess: endorseSuccess } = useWaitForTransactionReceipt({ hash: endorseHash });

  const preview = calculateTier(stakeAmount, 0);
  const usdcBalance = balance ? formatUSDC(balance as bigint) : "0.00";

  function handleFaucet() {
    writeFaucet({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "faucet" });
  }

  function handleApprove() {
    writeApprove({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "approve",
      args: [KYA_ADDRESS, parseUnits(stakeAmount.toString(), 6)],
    });
  }

  function handleRegister() {
    writeRegister({
      address: KYA_ADDRESS,
      abi: KYA_ABI,
      functionName: "register",
      args: [parseUnits(stakeAmount.toString(), 6)],
    });
  }

  function handleEndorse() {
    if (!endorseAddress) return;
    writeEndorse({
      address: KYA_ADDRESS,
      abi: KYA_ABI,
      functionName: "endorseWithSkill",
      args: [endorseAddress as `0x${string}`, endorseSkill || "general", endorseComment || "Endorsed via AgentCredit"],
    });
  }

  // Step completion states
  const stepDone: Record<string, boolean> = {
    faucet: faucetSuccess,
    register: registerSuccess,
    endorse: endorseSuccess,
  };

  const isInfoStep = step === "credential" || step === "report";

  return (
    <div className="radial-hero min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="gradient-text mb-3 text-5xl font-bold">Register</h1>
          <p className="text-lg text-muted">Build your on-chain credit score</p>
        </div>

        {/* Wallet connection banner */}
        {!isConnected && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
            <p className="text-sm text-muted">
              Connect your wallet to interact with the protocol. Preview the flow below.
            </p>
          </div>
        )}

        {/* Action Steps — numbered with progress */}
        <div className="mb-3">
          <div className="flex items-center justify-center gap-1">
            {ACTION_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => setStep(s.key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    step === s.key
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : stepDone[s.key]
                      ? "bg-green-500/20 text-green-400"
                      : "text-muted hover:bg-white/5 hover:text-text"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    stepDone[s.key] && step !== s.key
                      ? "bg-green-500/30"
                      : step === s.key
                      ? "bg-white/20"
                      : "bg-white/5"
                  }`}>
                    {stepDone[s.key] && step !== s.key ? "\u2713" : s.icon}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < ACTION_STEPS.length - 1 && (
                  <div className={`mx-1 h-px w-4 ${stepDone[s.key] ? "bg-green-500/40" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info Steps — smaller, secondary style */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {INFO_STEPS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                step === s.key
                  ? "bg-white/10 text-text ring-1 ring-white/20"
                  : "text-muted/60 hover:text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Step: Faucet */}
        {step === "faucet" && (
          <div className="glass-card p-8">
            <h2 className="mb-2 text-xl font-semibold">Get Test USDC</h2>
            <p className="mb-6 text-sm text-muted">
              Claim test USDC from the faucet to use as collateral.
            </p>

            <div className="mb-6 rounded-xl bg-midnight/60 p-6 text-center">
              <span className="text-xs uppercase tracking-wider text-muted">Your Balance</span>
              <div className="mt-1 font-mono text-4xl font-bold">${usdcBalance}</div>
            </div>

            <button
              onClick={handleFaucet}
              disabled={!isConnected || faucetPending || faucetConfirming}
              className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:hover:shadow-none"
            >
              {!isConnected
                ? "Connect Wallet to Claim"
                : faucetPending
                ? "Confirm in wallet..."
                : faucetConfirming
                ? "Confirming..."
                : faucetSuccess
                ? "Claimed! Claim more?"
                : "Claim 1,000 USDC"}
            </button>

            {faucetSuccess && (
              <div className="mt-4 flex justify-between">
                <button onClick={() => refetchBalance()} className="text-sm text-primary hover:underline">
                  Refresh balance
                </button>
                <button onClick={() => setStep("register")} className="text-sm font-medium text-primary hover:underline">
                  Next: Register →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Register */}
        {step === "register" && (
          <div className="glass-card p-8">
            <h2 className="mb-2 text-xl font-semibold">Register as Agent</h2>
            <p className="mb-6 text-sm text-muted">
              Stake USDC and register. Your tier starts at Bronze and improves with endorsements.
            </p>

            {/* Stake slider */}
            <div className="mb-6">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-sm text-muted">Stake Amount</span>
                <span className="font-mono text-2xl font-bold text-primary">${stakeAmount}</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="kya-slider w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-muted/50">
                <span>$10</span>
                <span>$500</span>
              </div>
            </div>

            {/* Tier Preview */}
            <div className="mb-6 rounded-xl bg-midnight/60 p-5 text-center">
              <span className="text-xs uppercase tracking-wider text-muted">Starting Tier</span>
              <div className="mt-3 flex items-center justify-center gap-4">
                <TierBadge tier={preview.tier} size="lg" />
                <div className="text-left">
                  <div className="font-mono text-2xl font-bold" style={{ color: `var(--${preview.tier.toLowerCase()}-color, var(--color-primary))` }}>
                    {preview.multiplier}x multiplier
                  </div>
                  <div className="text-sm text-muted">
                    ${stakeAmount} × {preview.multiplier} = <span className="font-semibold text-text">${preview.capacity}</span> capacity
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={!isConnected || approvePending || approveConfirming}
                className="flex-1 rounded-xl bg-card-hover py-3.5 font-semibold text-text transition-all hover:bg-white/10 disabled:opacity-50"
              >
                {approvePending
                  ? "Confirm..."
                  : approveConfirming
                  ? "Approving..."
                  : approveSuccess
                  ? "Approved \u2713"
                  : "1. Approve USDC"}
              </button>
              <button
                onClick={handleRegister}
                disabled={!isConnected || !approveSuccess || registerPending || registerConfirming}
                className="flex-1 rounded-xl bg-primary py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
              >
                {registerPending
                  ? "Confirm..."
                  : registerConfirming
                  ? "Registering..."
                  : registerSuccess
                  ? "Registered \u2713"
                  : "2. Register"}
              </button>
            </div>

            {registerSuccess && (
              <button
                onClick={() => setStep("endorse")}
                className="mt-4 w-full text-center text-sm font-medium text-primary hover:underline"
              >
                Next: Endorse another agent →
              </button>
            )}
          </div>
        )}

        {/* Step: Endorse */}
        {step === "endorse" && (
          <div className="glass-card p-8">
            <h2 className="mb-2 text-xl font-semibold">Endorse an Agent</h2>
            <p className="mb-6 text-sm text-muted">
              Boost another agent&apos;s trust score with a skill-specific endorsement.
              Your trust level determines the weight of your endorsement (1-3x).
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Agent Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={endorseAddress}
                  onChange={(e) => setEndorseAddress(e.target.value)}
                  className="w-full rounded-xl bg-midnight/80 px-4 py-3 font-mono text-sm text-text placeholder-muted/50 outline-none ring-1 ring-white/10 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Skill</label>
                <input
                  type="text"
                  placeholder="e.g. trading, bridging, research"
                  value={endorseSkill}
                  onChange={(e) => setEndorseSkill(e.target.value)}
                  className="w-full rounded-xl bg-midnight/80 px-4 py-3 text-sm text-text placeholder-muted/50 outline-none ring-1 ring-white/10 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Comment <span className="text-muted/50">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Why you trust this agent"
                  value={endorseComment}
                  onChange={(e) => setEndorseComment(e.target.value)}
                  className="w-full rounded-xl bg-midnight/80 px-4 py-3 text-sm text-text placeholder-muted/50 outline-none ring-1 ring-white/10 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              onClick={handleEndorse}
              disabled={!isConnected || !isAddress(endorseAddress) || endorsePending || endorseConfirming}
              className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
            >
              {!isConnected
                ? "Connect Wallet to Endorse"
                : endorsePending
                ? "Confirm in wallet..."
                : endorseConfirming
                ? "Confirming..."
                : endorseSuccess
                ? "Endorsed \u2713"
                : "Endorse Agent"}
            </button>

            <p className="mt-3 text-center text-xs text-muted">
              Note: You must wait 1 hour after registration before endorsing (sybil resistance).
            </p>
          </div>
        )}

        {/* Step: Manage Stake */}
        {step === "manage" && (
          <div className="glass-card p-8">
            <h2 className="mb-2 text-xl font-semibold">Manage Stake</h2>
            <p className="mb-6 text-sm text-muted">
              Add more USDC to increase your capacity, or withdraw your full stake to exit.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl bg-midnight/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Add Stake</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">Increases capacity</span>
                </div>
                <p className="mb-4 text-sm text-muted">
                  Top up your USDC stake. Higher stake + same trust = higher transaction capacity.
                </p>
                <div className="flex gap-3">
                  <button
                    disabled={!isConnected}
                    className="flex-1 rounded-xl bg-card-hover py-3 font-semibold text-text transition-all hover:bg-white/10 disabled:opacity-50"
                  >
                    {!isConnected ? "Connect Wallet" : "Approve USDC"}
                  </button>
                  <button
                    disabled={!isConnected}
                    className="flex-1 rounded-xl bg-primary py-3 font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
                  >
                    {!isConnected ? "Connect Wallet" : "Add Stake"}
                  </button>
                </div>
                <p className="mt-2 text-center text-xs text-muted/60">
                  <code className="font-mono">addStake(amount)</code>
                </p>
              </div>

              <div className="rounded-xl bg-midnight/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Withdraw</h3>
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400">Exit protocol</span>
                </div>
                <p className="mb-4 text-sm text-muted">
                  Withdraw your full stake and deactivate your agent. Blocked if you have unresolved reports.
                </p>
                <button
                  disabled={!isConnected}
                  className="w-full rounded-xl bg-red-500/10 py-3 font-semibold text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20 disabled:opacity-50"
                >
                  {!isConnected ? "Connect Wallet" : "Withdraw & Exit"}
                </button>
                <p className="mt-2 text-center text-xs text-muted/60">
                  <code className="font-mono">withdraw()</code> — requires 0 reports
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Credential (explainer) */}
        {step === "credential" && (
          <div className={`glass-card p-8 ${isInfoStep ? "border-white/5" : ""}`}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-sm text-purple-400">
                K
              </div>
              <div>
                <h2 className="text-xl font-semibold">Principal Credentials</h2>
                <p className="text-xs text-muted">Financially-scoped authorization for agents</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-midnight/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-primary">Beyond Identity</h3>
                <p className="mb-4 text-sm leading-relaxed text-muted">
                  ERC-8004 already proves <span className="text-text">who</span> authorized an agent via EIP-712 signatures.
                  AgentCredit credentials go further — they set a <span className="text-text">financial ceiling</span> that
                  the principal signs off on, and the protocol enforces automatically.
                </p>
                <div className="space-y-3">
                  {[
                    { num: "1", text: <>Principal signs a credential specifying <span className="text-text">max amount</span>, <span className="text-text">expiry</span>, and <span className="text-text">constraints</span></> },
                    { num: "2", text: "Agent registers with the credential on-chain" },
                    { num: "3", text: <>AgentCredit enforces the credential as a hard ceiling — effective capacity becomes the <span className="italic">lower</span> of reputation-based capacity and the principal&apos;s authorized limit</> },
                    { num: "4", text: "Principal can revoke at any time, instantly dropping the agent's capacity" },
                  ].map((item) => (
                    <div key={item.num} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {item.num}
                      </span>
                      <p className="text-sm text-muted">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-midnight/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-primary">Contract Functions</h3>
                <div className="space-y-2">
                  {[
                    { fn: "registerWithCredential", desc: "— register with principal-signed financial limits" },
                    { fn: "revokeCredential", desc: "— principal can revoke authorization at any time" },
                    { fn: "hasValidCredential", desc: "— check if credential is active and unexpired" },
                    { fn: "getEffectiveCapacity", desc: "— min(reputation capacity, credential max)" },
                  ].map((item) => (
                    <div key={item.fn} className="flex items-start gap-2 font-mono text-xs">
                      <span className="shrink-0 text-text">{item.fn}</span>
                      <span className="text-muted/60">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="mb-2 text-sm font-semibold text-primary">Why This Matters</h3>
                <p className="text-sm leading-relaxed text-muted">
                  ERC-8004 answers <span className="italic">&quot;who is this agent?&quot;</span>{" "}
                  AgentCredit answers <span className="italic">&quot;how much is this agent authorized to transact?&quot;</span>{" "}
                  Reputation alone can be gamed — a principal-signed financial cap adds a second
                  layer of accountability, tying the agent&apos;s capacity to a real entity willing to vouch
                  with explicit limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Report (explainer) */}
        {step === "report" && (
          <div className={`glass-card p-8 ${isInfoStep ? "border-white/5" : ""}`}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-sm text-red-400">
                !
              </div>
              <div>
                <h2 className="text-xl font-semibold">Reporting &amp; Sybil Resistance</h2>
                <p className="text-xs text-muted">Protecting the reputation system from abuse</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-midnight/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-red-400">Report Mechanism</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    Any registered agent can call <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">report(agent)</code> to flag bad behavior
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    Each report reduces trust by <span className="font-semibold text-red-400">-20 points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    Same address cannot report the same agent twice (deduplication)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    Reported agents cannot withdraw until reports are resolved
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-midnight/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-primary">Governance</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">slash(agent, amount)</code> — protocol owner slashes staked USDC
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">resolveReport(agent)</code> — clear false reports so agents can withdraw
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">deactivate(agent)</code> — fully deactivate malicious agents
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-midnight/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-green-400">Sybil Resistance</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    <span><span className="font-semibold text-text">1-hour cooldown</span> — agents must wait after registration before endorsing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    <span><span className="font-semibold text-text">Time decay</span> — trust drops 1pt/day after 30 days without new endorsements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    Prevents instant sybil attacks and rewards sustained, active reputation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
