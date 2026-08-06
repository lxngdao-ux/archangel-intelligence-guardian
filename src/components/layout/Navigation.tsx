"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { NotificationCenter } from "@/components/common/NotificationCenter";

export function Navigation() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-canvas-border px-6">
      <Link href="/dashboard" className="font-mono text-sm font-medium tracking-tight text-ink">
        GUARDIAN
      </Link>
      <div className="flex items-center gap-4">
        <NotificationCenter />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-secondary sm:inline">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-card border border-canvas-border px-3 py-1.5 text-xs text-ink-secondary hover:border-ink-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
