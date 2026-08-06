import Link from "next/link";
import type { InvestigationType, InvestigationStatus, RiskLevel } from "@prisma/client";
import { INVESTIGATION_TYPE_LABEL, RISK_LEVEL_STYLES } from "@/lib/constants";
import { formatDateTime, cn } from "@/lib/utils";

export interface ReportCardData {
  id: string;
  type: InvestigationType;
  status: InvestigationStatus;
  createdAt: string;
  report: { trustScore: number; riskLevel: RiskLevel } | null;
}

export function ReportCard({ investigation }: { investigation: ReportCardData }) {
  const href =
    investigation.status === "COMPLETED"
      ? `/investigation/${investigation.id}/report`
      : `/investigation/${investigation.id}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-card border border-canvas-border bg-canvas-surface p-4 transition hover:border-ink-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">
          {INVESTIGATION_TYPE_LABEL[investigation.type]}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">{formatDateTime(investigation.createdAt)}</p>
      </div>

      {investigation.report ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-card px-3 py-1.5",
            RISK_LEVEL_STYLES[investigation.report.riskLevel].bg,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", RISK_LEVEL_STYLES[investigation.report.riskLevel].dot)} />
          <span className={cn("font-mono text-sm tabular", RISK_LEVEL_STYLES[investigation.report.riskLevel].text)}>
            {investigation.report.trustScore}
          </span>
        </div>
      ) : (
        <span className="shrink-0 rounded-card border border-canvas-border px-3 py-1.5 text-xs text-ink-muted">
          {investigation.status === "FAILED" ? "Failed" : "In progress"}
        </span>
      )}
    </Link>
  );
}
