import type { RiskLevel } from "@prisma/client";
import { RISK_LEVEL_STYLES } from "@/lib/constants";
import { RISK_LEVEL_LABEL } from "@/types/report.types";

const RING_COLOR: Record<RiskLevel, string> = {
  LOW: "#2FD48C",
  MODERATE: "#F5A524",
  HIGH: "#F0554A",
  CRITICAL: "#F0554A",
};

export function TrustScoreWidget({ score, riskLevel }: { score: number; riskLevel: RiskLevel }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const styles = RISK_LEVEL_STYLES[riskLevel];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#242830" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={RING_COLOR[riskLevel]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-medium tabular text-ink">{score}</span>
          <span className="text-xs text-ink-muted">/ 100</span>
        </div>
      </div>
      <span className={`mt-4 rounded-card px-3 py-1 text-sm font-medium ${styles.bg} ${styles.text}`}>
        {RISK_LEVEL_LABEL[riskLevel]}
      </span>
    </div>
  );
}
