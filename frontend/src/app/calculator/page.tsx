"use client";

import { useState } from "react";
import { calculateTier, TIERS } from "@/lib/tier-utils";
import { TierIndicator } from "@/components/TierIndicator";
import { CapacityDisplay } from "@/components/CapacityDisplay";
import { ComparisonChart } from "@/components/ComparisonChart";

export default function CalculatorPage() {
  const [stake, setStake] = useState(50);
  const [trust, setTrust] = useState(30);

  const result = calculateTier(stake, trust);
  const tierColor = TIERS[result.tier].color;

  return (
    <div className="radial-hero min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="gradient-text mb-3 text-5xl font-bold">
            Credit Calculator
          </h1>
          <p className="text-lg text-muted">
            See how trust multiplies your credit limit in real-time
          </p>
        </div>

        {/* Sliders */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Stake Slider */}
          <div className="glass-card p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <label className="text-sm font-medium uppercase tracking-wider text-muted">
                USDC Stake
              </label>
              <span className="font-mono text-3xl font-bold text-primary">
                ${stake}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>$10</span>
              <span>$500</span>
            </div>
            <p className="mt-2 text-xs text-muted/60">Your base capital — gets multiplied by your tier</p>
          </div>

          {/* Trust Slider */}
          <div className="glass-card p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <label className="text-sm font-medium uppercase tracking-wider text-muted">
                Trust Score
              </label>
              <span className="font-mono text-3xl font-bold" style={{ color: tierColor }}>
                {trust}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={trust}
              onChange={(e) => setTrust(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>0</span>
              <span>100</span>
            </div>
            <p className="mt-2 text-xs text-muted/60">Your trust score — determines your tier and credit limit multiplier</p>
          </div>
        </div>

        {/* Tier Indicator */}
        <div className="mb-14">
          <TierIndicator activeTier={result.tier} />
        </div>

        {/* Capacity Display - THE BIG NUMBER */}
        <div className="mb-12">
          <CapacityDisplay
            capacity={result.capacity}
            tier={result.tier}
            stake={stake}
            multiplier={result.multiplier}
          />
        </div>

        {/* Comparison Chart */}
        <ComparisonChart stake={stake} currentTrust={trust} />

        {/* Explanation */}
        <div className="mt-12 glass-card p-6">
          <h3 className="mb-3 text-lg font-semibold">How It Works</h3>
          <div className="grid gap-4 text-sm text-muted md:grid-cols-3">
            <div>
              <span className="mb-1 block font-semibold text-text">1. Stake USDC</span>
              Deposit USDC as collateral. This is your base capital that gets multiplied.
            </div>
            <div>
              <span className="mb-1 block font-semibold text-text">2. Build Trust</span>
              Earn endorsements from other agents. Your trust score (0–100) determines your credit tier.
            </div>
            <div>
              <span className="mb-1 block font-semibold text-text">3. Get Multiplied</span>
              Higher trust = higher tier = bigger credit limit. Same stake, more trust, more capacity.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
