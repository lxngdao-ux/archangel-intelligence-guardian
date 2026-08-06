import type { Evidence } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  TEXT_EXTRACT: "Text analyzed",
  OCR_RESULT: "File processed",
  WEBPAGE_CONTENT: "Webpage read",
  METADATA: "Metadata captured",
  WHOIS_RECORD: "Domain record checked",
  DNS_RECORD: "DNS record checked",
  SCREENSHOT_ANALYSIS: "Screenshot analyzed",
};

export function EvidenceTimeline({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-ink-muted">No evidence was collected for this investigation.</p>;
  }

  return (
    <ol className="space-y-0">
      {evidence.map((e) => (
        <li key={e.id} className="relative flex gap-4 border-l border-canvas-border pb-6 pl-5 last:pb-0">
          <span className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-info" />
          <div>
            <p className="text-sm text-ink">{KIND_LABEL[e.kind] ?? e.kind}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-muted">{formatDateTime(e.createdAt)}</p>
            {e.confidence < 0.5 && (
              <p className="mt-1 text-xs text-caution">Low confidence in this evidence item.</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
