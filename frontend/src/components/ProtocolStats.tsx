"use client";

import { useReadContract } from "wagmi";
import { KYA_ADDRESS, KYA_ABI } from "@/lib/contracts";
import { formatUSDC } from "@/lib/tier-utils";

export function ProtocolStats() {
  const { data, isLoading, isError } = useReadContract({
    address: KYA_ADDRESS,
    abi: KYA_ABI,
    functionName: "getProtocolStats",
  });

  if (isLoading) {
    return (
      <div className="flex gap-8">
        <StatBox label="Total Staked" value="Loading..." />
        <StatBox label="Registered Agents" value="Loading..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex gap-8">
        <StatBox label="Total Staked" value="—" />
        <StatBox label="Registered Agents" value="—" />
      </div>
    );
  }

  const [totalStaked, agentCount] = data as [bigint, bigint];

  return (
    <div className="flex gap-8">
      <StatBox label="Total Staked" value={`$${formatUSDC(totalStaked)} USDC`} />
      <StatBox label="Registered Agents" value={agentCount.toString()} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 px-8 py-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-2xl font-bold text-text">{value}</span>
    </div>
  );
}
