import { TIERS, TIER_ORDER, type TierName } from "@/lib/tier-utils";

interface TierIndicatorProps {
  activeTier: TierName;
}

export function TierIndicator({ activeTier }: TierIndicatorProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {TIER_ORDER.map((tierName) => {
        const tier = TIERS[tierName];
        const isActive = tierName === activeTier;

        return (
          <div
            key={tierName}
            className={`tier-transition glass-card relative flex flex-col items-center gap-2 p-4 ${
              isActive ? "scale-105 opacity-100" : "opacity-40"
            }`}
            style={{
              borderColor: isActive ? `${tier.color}60` : undefined,
              borderWidth: isActive ? "1px" : undefined,
              boxShadow: isActive
                ? `0 0 25px ${tier.color}30, 0 0 50px ${tier.color}10`
                : undefined,
            }}
          >
            {/* Tier dot */}
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tier.color }}
            />

            {/* Tier name */}
            <span
              className="text-sm font-bold"
              style={{ color: isActive ? tier.color : undefined }}
            >
              {tierName}
            </span>

            {/* Multiplier */}
            <span className="font-mono text-2xl font-bold" style={{ color: tier.color }}>
              {tier.multiplier}x
            </span>

            {/* Combined threshold */}
            <span className="text-xs text-muted">
              Trust {tier.minTrust}+
            </span>

            {/* Active indicator */}
            {isActive && (
              <div
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold"
                style={{ color: tier.color }}
              >
                ▲ YOU
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
