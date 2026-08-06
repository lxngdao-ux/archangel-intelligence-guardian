import type { RiskCategoryScore } from "@/types/report.types";
import { RISK_CATEGORY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

function barColor(score: number) {
  if (score >= 70) return "bg-trust";
  if (score >= 45) return "bg-caution";
  return "bg-risk";
}

export function RiskIndicators({ findings }: { findings: RiskCategoryScore[] }) {
  return (
    <div className="space-y-4">
      {findings.map((f) => (
        <div key={f.category}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">{RISK_CATEGORY_LABEL[f.category]}</span>
            <span className="font-mono text-sm tabular text-ink-secondary">{f.score}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-canvas-border">
            <div className={cn("h-1.5 rounded-full", barColor(f.score))} style={{ width: `${f.score}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-secondary">{f.summary}</p>
        </div>
      ))}
    </div>
  );
}
