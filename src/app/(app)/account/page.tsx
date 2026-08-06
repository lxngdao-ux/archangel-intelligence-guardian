import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    include: { organization: true, _count: { select: { investigations: true } } },
  });

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: user.name ?? "—" },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Organization", value: user.organization?.name ?? "Personal account" },
    { label: "Investigations run", value: String(user._count.investigations) },
    { label: "Member since", value: formatDateTime(user.createdAt.toISOString()) },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Account</h1>
      <p className="mt-1 text-sm text-ink-secondary">Your Guardian profile.</p>

      <dl className="mt-8 divide-y divide-canvas-border rounded-card border border-canvas-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-ink-secondary">{row.label}</dt>
            <dd className="text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
