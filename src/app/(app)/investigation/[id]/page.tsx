"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/common/ErrorState";
import type { InvestigationStatus } from "@prisma/client";

const STAGES: { status: InvestigationStatus; label: string }[] = [
  { status: "PENDING", label: "Queued" },
  { status: "COLLECTING_EVIDENCE", label: "Collecting evidence" },
  { status: "ANALYZING", label: "Analyzing signals" },
  { status: "COMPLETED", label: "Building your report" },
];

export default function InvestigationStatusPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<InvestigationStatus>("PENDING");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const analyzeStarted = useRef(false);

  useEffect(() => {
    if (!analyzeStarted.current) {
      analyzeStarted.current = true;
      fetch(`/api/investigations/${params.id}/analyze`, { method: "POST" }).catch(() => {
        // Polling below will still catch a FAILED status if the pipeline recorded one;
        // a network-level failure here is surfaced the same way.
      });
    }

    const interval = setInterval(async () => {
      const res = await fetch(`/api/investigations/${params.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "COMPLETED") {
        clearInterval(interval);
        router.push(`/investigation/${params.id}/report`);
      }
      if (data.status === "FAILED") {
        clearInterval(interval);
        setFailureReason(data.failureReason ?? "The investigation could not be completed.");
      }
    }, 900);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (failureReason) {
    return (
      <div className="mx-auto max-w-md pt-16">
        <ErrorState message={failureReason} />
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <div className="mx-auto max-w-md pt-16">
      <h1 className="text-center text-lg font-medium text-ink">Investigating…</h1>
      <div className="mt-8 space-y-4">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={stage.status} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  done ? "bg-trust text-canvas" : active ? "border-2 border-info" : "border border-canvas-border"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <span className={active ? "text-ink" : done ? "text-ink-secondary" : "text-ink-muted"}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
