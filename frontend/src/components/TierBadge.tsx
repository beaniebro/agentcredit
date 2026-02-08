import { TIERS, type TierName } from "@/lib/tier-utils";

interface TierBadgeProps {
  tier: TierName;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const color = TIERS[tier].color;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]}`}
      style={{
        color,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
      }}
    >
      {tier}
    </span>
  );
}
