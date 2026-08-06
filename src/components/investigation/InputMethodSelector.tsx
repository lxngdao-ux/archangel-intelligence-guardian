"use client";

import type { InvestigationType } from "@prisma/client";
import { cn } from "@/lib/utils";

const METHODS: { value: InvestigationType; label: string; hint: string }[] = [
  { value: "URL", label: "Website URL", hint: "Paste a link" },
  { value: "TEXT", label: "Pasted text", hint: "Copy in the wording" },
  { value: "WHATSAPP", label: "WhatsApp message", hint: "Forward the text" },
  { value: "SCREENSHOT", label: "Screenshot", hint: "Upload an image" },
  { value: "PDF", label: "PDF", hint: "Upload a document" },
  { value: "IMAGE", label: "Image", hint: "Upload a photo" },
];

export function InputMethodSelector({
  value,
  onChange,
}: {
  value: InvestigationType;
  onChange: (value: InvestigationType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded-card border px-4 py-3 text-left transition",
            value === m.value
              ? "border-trust bg-trust-bg"
              : "border-canvas-border bg-canvas-surface hover:border-ink-muted",
          )}
        >
          <p className={cn("text-sm font-medium", value === m.value ? "text-trust" : "text-ink")}>{m.label}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">{m.hint}</p>
        </button>
      ))}
    </div>
  );
}
