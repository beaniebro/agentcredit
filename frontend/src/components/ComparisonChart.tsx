import { calculateTier, TIERS, TIER_ORDER } from "@/lib/tier-utils";

interface ComparisonChartProps {
  stake: number;
  currentTrust: number;
}

export function ComparisonChart({ stake, currentTrust }: ComparisonChartProps) {
  // Directly compute capacity per tier using each tier's known multiplier
  // (don't re-derive tier from trust — that breaks when stake alone exceeds lower thresholds)
  const bars = TIER_ORDER.map((tierName) => {
    const tier = TIERS[tierName];
    const capacity = stake * tier.multiplier;
    return { tierName, capacity, color: tier.color, multiplier: tier.multiplier, minTrust: tier.minTrust };
  });

  const maxCapacity = Math.max(...bars.map((b) => b.capacity), 1);

  // Which tier is the user currently in?
  const currentResult = calculateTier(stake, currentTrust);

  return (
    <div className="glass-card p-6">
      <h3 className="mb-2 text-center text-lg font-semibold text-text">
        Same ${stake} Stake, Different Trust
      </h3>
      <p className="mb-6 text-center text-sm text-muted">
        Your reputation determines the multiplier on your capital
      </p>

      <div className="flex items-end justify-center gap-6" style={{ height: 240 }}>
        {bars.map((bar) => {
          const heightPct = (bar.capacity / maxCapacity) * 100;
          const isCurrent = bar.tierName === currentResult.tier;

          return (
            <div key={bar.tierName} className="flex flex-col items-center gap-2" style={{ width: 90 }}>
              {/* Capacity label */}
              <span
                className="tier-transition font-mono text-sm font-bold"
                style={{ color: bar.color }}
              >
                ${bar.capacity.toLocaleString()}
              </span>

              {/* Multiplier */}
              <span className="text-xs text-muted">{bar.multiplier}x</span>

              {/* Bar */}
              <div
                className="tier-transition w-full rounded-t-lg"
                style={{
                  height: `${Math.max(heightPct * 1.8, 20)}px`,
                  backgroundColor: bar.color,
                  opacity: isCurrent ? 1 : 0.4,
                  boxShadow: isCurrent
                    ? `0 0 20px ${bar.color}60`
                    : undefined,
                }}
              />

              {/* Tier name */}
              <span className="text-xs font-semibold" style={{ color: bar.color }}>
                {bar.tierName}
              </span>

              {/* Trust threshold */}
              <span className="text-[11px] text-muted">
                Trust {bar.minTrust}+
              </span>

              {/* Current indicator */}
              {isCurrent && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ color: bar.color, backgroundColor: `${bar.color}20` }}
                >
                  YOU
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
