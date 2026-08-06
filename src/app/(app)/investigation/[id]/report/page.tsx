import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { TrustScoreWidget } from "@/components/report/TrustScoreWidget";
import { RiskIndicators } from "@/components/report/RiskIndicators";
import { EvidenceTimeline } from "@/components/report/EvidenceTimeline";
import { INVESTIGATION_TYPE_LABEL } from "@/lib/constants";
import { CONFIDENCE_LABEL } from "@/types/report.types";
import { formatDateTime } from "@/lib/utils";
import type { RiskCategoryScore } from "@/types/report.types";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const investigation = await prisma.investigation.findUnique({
    where: { id: params.id },
    include: { report: true, evidence: true },
  });

  if (!investigation || !investigation.report) notFound();

  const isOwner = investigation.userId === session?.user.id;
  const isPrivileged = session?.user.role === "ANALYST" || session?.user.role === "ADMINISTRATOR";
  if (!isOwner && !isPrivileged) notFound();

  const report = investigation.report;
  const detailedFindings = report.detailedFindings as unknown as RiskCategoryScore[];
  const positiveSignals = report.positiveSignals as unknown as string[];
  const warningSigns = report.warningSigns as unknown as string[];
  const missingInformation = report.missingInformation as unknown as string[];
  const recommendedActions = report.recommendedActions as unknown as string[];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-canvas-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            {INVESTIGATION_TYPE_LABEL[investigation.type]} investigation
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Investigation report</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">{report.reportNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Generated</p>
          <p className="font-mono text-xs text-ink-secondary">{formatDateTime(report.generatedAt)}</p>
          <p className="mt-1 text-xs text-ink-muted">{CONFIDENCE_LABEL[report.confidenceLevel]}</p>
        </div>
      </div>

      {/* Score + summary */}
      <section className="grid grid-cols-1 gap-8 border-b border-canvas-border py-8 sm:grid-cols-[auto_1fr]">
        <TrustScoreWidget score={report.trustScore} riskLevel={report.riskLevel} />
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Summary</h2>
          <p className="mt-2 leading-relaxed text-ink-secondary">{report.summary}</p>
        </div>
      </section>

      {/* Positive / warning */}
      <section className="grid grid-cols-1 gap-8 border-b border-canvas-border py-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-trust">Positive signals</h2>
          {positiveSignals.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">None stood out in this investigation.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {positiveSignals.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="text-trust">＋</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-risk">Warning signs</h2>
          {warningSigns.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">None detected in this investigation.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {warningSigns.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="text-risk">－</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Missing information */}
      {missingInformation.length > 0 && (
        <section className="border-b border-canvas-border py-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-caution">Missing information</h2>
          <ul className="mt-3 space-y-2">
            {missingInformation.map((s, i) => (
              <li key={i} className="text-sm text-ink-secondary">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Detailed findings */}
      <section className="border-b border-canvas-border py-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Detailed findings</h2>
        <div className="mt-4">
          <RiskIndicators findings={detailedFindings} />
        </div>
      </section>

      {/* Recommended actions */}
      <section className="border-b border-canvas-border py-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Recommended actions</h2>
        <ul className="mt-3 space-y-2">
          {recommendedActions.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-secondary">
              <span className="font-mono text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Evidence collected */}
      <section className="py-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Evidence collected</h2>
        <div className="mt-4">
          <EvidenceTimeline evidence={investigation.evidence} />
        </div>
      </section>

      <p className="pb-10 text-xs text-ink-muted">
        Guardian reports show evidence, scores, and confidence — never a bare verdict. Use this alongside your own
        judgment and, where money is involved, independent verification.
      </p>
    </div>
  );
}
