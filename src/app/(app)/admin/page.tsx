import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMINISTRATOR") redirect("/dashboard");

  const [userCount, investigationCount, reportCount, recentActivity, patternCount] = await Promise.all([
    prisma.user.count(),
    prisma.investigation.count(),
    prisma.report.count(),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: true } }),
    prisma.scamPattern.count(),
  ]);

  const stats = [
    { label: "Users", value: userCount },
    { label: "Investigations", value: investigationCount },
    { label: "Reports generated", value: reportCount },
    { label: "Scam patterns tracked", value: patternCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-ink-secondary">Platform-wide overview.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-canvas-border p-4">
            <p className="font-mono text-2xl tabular text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-ink-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Recent activity</h2>
        <div className="mt-4 divide-y divide-canvas-border rounded-card border border-canvas-border">
          {recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No activity recorded yet.</p>
          ) : (
            recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink-secondary">
                  {a.user?.email ?? "Unknown user"} — {a.action}
                </span>
                <span className="font-mono text-xs text-ink-muted">{formatDateTime(a.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-ink-muted">
        User role management and the scam-pattern editor are planned next — see docs/API_DESIGN.md.
      </p>
    </div>
  );
}
