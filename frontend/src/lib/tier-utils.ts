export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

// Tiers based on trust score alone (0-100)
// Trust determines your tier/multiplier, stake is the base capital that gets multiplied
export const TIERS: Record<
  TierName,
  { minTrust: number; multiplier: number; color: string; glowClass: string }
> = {
  Bronze: { minTrust: 0, multiplier: 2, color: "#cd7f32", glowClass: "glow-bronze" },
  Silver: { minTrust: 30, multiplier: 4, color: "#c0c0c0", glowClass: "glow-silver" },
  Gold: { minTrust: 60, multiplier: 7, color: "#ffd700", glowClass: "glow-gold" },
  Platinum: { minTrust: 90, multiplier: 10, color: "#e5e4e2", glowClass: "glow-platinum" },
};

export const TIER_ORDER: TierName[] = ["Bronze", "Silver", "Gold", "Platinum"];

export function calculateTier(stakeUSDC: number, trustScore: number) {
  // Tier is determined by trust score alone — reputation determines the multiplier
  let tier: TierName;

  if (trustScore >= 90) tier = "Platinum";
  else if (trustScore >= 60) tier = "Gold";
  else if (trustScore >= 30) tier = "Silver";
  else tier = "Bronze";

  const multiplier = TIERS[tier].multiplier;
  const capacity = stakeUSDC * multiplier;

  return { tier, multiplier, capacity, trustScore };
}

export function tierFromEnum(value: number): TierName {
  const map: Record<number, TierName> = {
    0: "Bronze",
    1: "Silver",
    2: "Gold",
    3: "Platinum",
  };
  return map[value] ?? "Bronze";
}

export function formatUSDC(value: bigint): string {
  const num = Number(value) / 1e6;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUSDCCompact(value: bigint): string {
  const num = Number(value) / 1e6;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
