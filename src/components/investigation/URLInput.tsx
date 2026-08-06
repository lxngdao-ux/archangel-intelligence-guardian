"use client";

import { isLikelyUrl } from "@/lib/utils";

export function URLInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const showWarning = value.length > 0 && !isLikelyUrl(value);

  return (
    <div>
      <label className="mb-1.5 block text-sm text-ink-secondary" htmlFor="url-input">
        Website URL
      </label>
      <input
        id="url-input"
        type="text"
        inputMode="url"
        placeholder="https://example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-info"
      />
      {showWarning && <p className="mt-1.5 text-xs text-caution">This doesn&apos;t look like a full URL yet.</p>}
    </div>
  );
}
