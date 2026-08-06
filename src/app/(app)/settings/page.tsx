"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      await update();
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-secondary">Manage how Guardian works for you.</p>

      <section className="mt-8 rounded-card border border-canvas-border p-5">
        <h2 className="text-sm font-medium text-ink">Display name</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-card border border-canvas-border bg-canvas-surface px-3 py-2 text-sm text-ink outline-none focus:border-info"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-card bg-trust px-4 py-2 text-sm font-medium text-canvas hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saved && <p className="mt-2 text-xs text-trust">Saved.</p>}
      </section>

      <section className="mt-6 rounded-card border border-canvas-border p-5 opacity-60">
        <h2 className="text-sm font-medium text-ink">Notification preferences</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Fine-grained notification controls are planned for a later release — see docs/ROADMAP.md.
        </p>
      </section>
    </div>
  );
}
