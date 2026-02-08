import { TIERS, type TierName } from "@/lib/tier-utils";

interface CapacityDisplayProps {
  capacity: number;
  tier: TierName;
  stake: number;
  multiplier: number;
}

export function CapacityDisplay({
  capacity,
  tier,
  stake,
  multiplier,
}: CapacityDisplayProps) {
  const color = TIERS[tier].color;

  return (
    <div
      className="tier-transition glass-card flex flex-col items-center gap-4 p-8"
      style={{
        borderColor: `${color}40`,
        borderWidth: "1px",
        boxShadow: `0 0 40px ${color}25, 0 0 80px ${color}10`,
      }}
    >
      <span className="text-sm font-medium uppercase tracking-widest text-muted">
        Maximum Transaction Capacity
      </span>

      {/* Big number */}
      <div className="flex items-baseline gap-2">
        <span
          className="tier-transition font-mono text-7xl font-bold"
          style={{ color }}
        >
          ${capacity.toLocaleString()}
        </span>
        <span className="text-2xl text-muted">USDC</span>
      </div>

      {/* Math formula */}
      <div className="flex items-center gap-3 text-lg text-muted">
        <span className="font-mono">${stake} <span className="text-sm">stake</span></span>
        <span className="text-primary">×</span>
        <span className="font-mono font-bold" style={{ color }}>
          {multiplier}x <span className="text-sm font-normal text-muted">{tier}</span>
        </span>
        <span className="text-primary">=</span>
        <span className="font-mono font-bold" style={{ color }}>
          ${capacity.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
