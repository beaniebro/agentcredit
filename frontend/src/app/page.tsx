"use client";

import Link from "next/link";
import { TIERS, TIER_ORDER, calculateTier } from "@/lib/tier-utils";
import { TierBadge } from "@/components/TierBadge";
import { ProtocolStats } from "@/components/ProtocolStats";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative flex flex-col items-center px-6 pb-32 pt-24 text-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover opacity-20"
          style={{
            backgroundImage: "url('/hero.png')",
            backgroundPosition: "center 50%",
            maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/40 via-midnight/60 to-midnight" />

        <div className="relative z-10">
          <h1 className="gradient-text mb-4 text-6xl font-bold leading-tight">
            AGENTCREDIT
          </h1>
          <p className="mb-2 max-w-2xl text-xl text-muted">
            A <span className="font-semibold text-text">credit score for AI agents</span> — where
            reputation multiplies capital
          </p>
          <p className="mb-8 text-lg text-muted/70">
            Same stake + different trust = 2x–10x transaction capacity
          </p>

          <div className="flex gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25"
            >
              Register as Agent
            </Link>
            <Link
              href="/agent"
              className="glass-card rounded-xl px-8 py-3 text-base font-semibold text-muted transition-colors hover:text-text"
            >
              Credit Lookup
            </Link>
            <Link
              href="/calculator"
              className="glass-card rounded-xl px-8 py-3 text-base font-semibold text-muted transition-colors hover:text-text"
            >
              Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* ===== WHAT IS AGENTCREDIT ===== */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-6 text-center text-3xl font-bold">
          The Missing Piece for AI Agents
        </h2>
        <p className="mb-4 text-center text-muted leading-relaxed">
          AI agents are starting to transact on-chain.{" "}
          <span className="text-text">ERC-8004</span> gives them verifiable identity.{" "}
          <span className="text-text">x402</span> lets them make payments over HTTP.
          But neither answers a critical question:{" "}
          <span className="italic">how much should this agent be trusted to handle?</span>
        </p>
        <p className="mb-8 text-center text-muted leading-relaxed">
          <span className="font-semibold text-text">AgentCredit</span> is that
          missing layer — a credit score for AI agents. Agents stake USDC as collateral,
          earn endorsements from peers, and build a trust score that directly multiplies
          their transaction capacity. Any merchant or protocol can query AgentCredit to
          check whether an agent is good for a given amount — turning reputation into
          programmable financial trust.
        </p>

        <div className="flex justify-center gap-6 text-center text-sm">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-lg">ID</div>
            <span className="text-muted">ERC-8004</span>
            <span className="text-xs text-muted/60">Who is this agent?</span>
          </div>
          <div className="flex items-center text-muted/40">+</div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-lg">$</div>
            <span className="text-muted">x402</span>
            <span className="text-xs text-muted/60">Can it pay?</span>
          </div>
          <div className="flex items-center text-muted/40">+</div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-lg font-bold text-primary">AC</div>
            <span className="font-semibold text-primary">AgentCredit</span>
            <span className="text-xs text-primary/70">How much should it transact?</span>
          </div>
        </div>
      </section>

      {/* ===== AHA VISUALIZATION ===== */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          How Credit Limits Work
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Step 1 */}
          <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
              1
            </div>
            <h3 className="text-lg font-semibold">Stake USDC</h3>
            <p className="text-sm text-muted">
              Deposit $50 USDC as collateral
            </p>
            <div className="font-mono text-2xl font-bold text-primary">$50</div>
          </div>

          {/* Step 2 */}
          <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
              2
            </div>
            <h3 className="text-lg font-semibold">Build Credit</h3>
            <p className="text-sm text-muted">
              Earn endorsements, reach trust score 80
            </p>
            <div className="font-mono text-2xl font-bold text-primary">+80 Trust</div>
          </div>

          {/* Step 3 */}
          <div className="glass-card glow-gold flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-2xl font-bold text-gold">
              ✦
            </div>
            <h3 className="text-lg font-semibold">7x Capacity</h3>
            <p className="text-sm text-muted">
              Gold tier unlocks — same $50 becomes $350
            </p>
            <div className="font-mono text-2xl font-bold text-gold">$350</div>
          </div>
        </div>

        {/* Arrow visualization */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 rounded-xl bg-card/50 px-8 py-4">
            <span className="font-mono text-lg text-muted">$50 stake</span>
            <span className="text-primary">→</span>
            <span className="font-mono text-lg text-muted">80 trust</span>
            <span className="text-primary">→</span>
            <span className="font-mono text-lg font-bold text-gold">$350 capacity</span>
          </div>
        </div>
      </section>

      {/* ===== TIER CARDS ===== */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Four Credit Tiers
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((tierName) => {
            const tier = TIERS[tierName];
            // Use trust that, combined with $50 stake, reaches this tier's threshold
            const exampleTrust = tier.minTrust;
            const example = calculateTier(50, exampleTrust);

            return (
              <div
                key={tierName}
                className={`glass-card flex flex-col items-center gap-3 p-6 ${tier.glowClass}`}
              >
                <TierBadge tier={tierName} size="lg" />
                <div
                  className="font-mono text-4xl font-bold"
                  style={{ color: tier.color }}
                >
                  {tier.multiplier}x
                </div>
                <div className="text-sm text-muted">
                  Trust {tier.minTrust}+
                </div>
                <div className="mt-2 rounded-lg bg-midnight/50 px-4 py-2 text-center">
                  <div className="text-xs text-muted">$50 stake →</div>
                  <div
                    className="font-mono text-lg font-bold"
                    style={{ color: tier.color }}
                  >
                    ${example.capacity}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== PROTOCOL STATS ===== */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">
          Live Protocol Stats
        </h2>
        <div className="flex justify-center">
          <ProtocolStats />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Reading live from Base Sepolia
        </p>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section className="border-t border-white/5 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Ready to build your credit?</h2>
        <p className="mb-8 text-muted">
          Register, earn endorsements, and watch your capacity grow
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-all hover:bg-primary-hover"
          >
            Register as Agent
          </Link>
          <Link
            href="/agent"
            className="glass-card rounded-xl px-8 py-3 font-semibold text-muted transition-colors hover:text-text"
          >
            Credit Lookup
          </Link>
          <Link
            href="/calculator"
            className="glass-card rounded-xl px-8 py-3 font-semibold text-muted transition-colors hover:text-text"
          >
            Calculator
          </Link>
        </div>
      </section>
    </div>
  );
}
