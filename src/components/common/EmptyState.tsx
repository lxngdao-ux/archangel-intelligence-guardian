import Link from "next/link";

export function EmptyState({
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-canvas-border py-16 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-secondary">{detail}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 rounded-card bg-trust px-4 py-2 text-sm font-medium text-canvas hover:brightness-110"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
