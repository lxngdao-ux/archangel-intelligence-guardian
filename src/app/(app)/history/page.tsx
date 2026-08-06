import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { ReportCard } from "@/components/report/ReportCard";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import type { InvestigationStatus } from "@prisma/client";

const FILTERS: { label: string; value: InvestigationStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Completed", value: "COMPLETED" },
  { label: "In progress", value: "ANALYZING" },
  { label: "Failed", value: "FAILED" },
];

const VALID_STATUSES: InvestigationStatus[] = [
  "PENDING",
  "COLLECTING_EVIDENCE",
  "ANALYZING",
  "COMPLETED",
  "FAILED",
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const statusFilter = VALID_STATUSES.includes(searchParams.status as InvestigationStatus)
    ? (searchParams.status as InvestigationStatus)
    : undefined;

  const investigations = await prisma.investigation.findMany({
    where: { userId, ...(statusFilter ? { status: statusFilter } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { report: { select: { trustScore: true, riskLevel: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">History</h1>
      <p className="mt-1 text-sm text-ink-secondary">Every investigation you&apos;ve run, in one place.</p>

      <div className="mt-6 flex gap-1 border-b border-canvas-border">
        {FILTERS.map((f) => {
          const active = f.value === "ALL" ? !statusFilter : statusFilter === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === "ALL" ? "/history" : `/history?status=${f.value}`}
              className={cn(
                "border-b-2 px-3 py-2 text-sm",
                active ? "border-ink text-ink" : "border-transparent text-ink-secondary hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {investigations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No investigations here"
            detail="Nothing matches this filter yet."
            actionHref="/investigation/new"
            actionLabel="Start an investigation"
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {investigations.map((inv) => (
            <ReportCard
              key={inv.id}
              investigation={{
                id: inv.id,
                type: inv.type,
                status: inv.status,
                createdAt: inv.createdAt.toISOString(),
                report: inv.report,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
