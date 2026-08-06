import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { ReportCard } from "@/components/report/ReportCard";
import { EmptyState } from "@/components/common/EmptyState";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [recent, stats] = await Promise.all([
    prisma.investigation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { report: { select: { trustScore: true, riskLevel: true } } },
    }),
    prisma.investigation.groupBy({ by: ["status"], where: { userId }, _count: true }),
  ]);

  const total = stats.reduce((sum, s) => sum + s._count, 0);
  const completed = stats.find((s) => s.status === "COMPLETED")?._count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {total === 0 ? "No investigations yet." : `${completed} of ${total} investigation${total === 1 ? "" : "s"} completed.`}
          </p>
        </div>
        <Link
          href="/investigation/new"
          className="rounded-card bg-trust px-4 py-2.5 text-sm font-medium text-canvas hover:brightness-110"
        >
          New investigation
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Recent</h2>
        {recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing to show yet"
              detail="Start your first investigation — paste a link, a message, or upload a file."
              actionHref="/investigation/new"
              actionLabel="Start an investigation"
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recent.map((inv) => (
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
      </section>
    </div>
  );
}
