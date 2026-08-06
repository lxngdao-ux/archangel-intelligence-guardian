import type { InvestigationType, InvestigationStatus } from "@prisma/client";

/** Input accepted by POST /api/investigations — see docs/API_DESIGN.md */
export interface CreateInvestigationInput {
  type: InvestigationType;
  /** Required for URL / TEXT / WHATSAPP */
  inputText?: string;
  /** Required for SCREENSHOT / PDF / IMAGE — ids returned by POST /api/upload */
  fileIds?: string[];
}

export interface InvestigationSummary {
  id: string;
  type: InvestigationType;
  status: InvestigationStatus;
  createdAt: string;
  trustScore?: number;
  riskLevel?: string;
}

/** What Evidence.content actually holds, keyed by EvidenceKind. */
export type WebpageContentEvidence = {
  url: string;
  finalUrl: string;
  title: string | null;
  metaDescription: string | null;
  textSample: string;
  hasContactPage: boolean;
  usesHttps: boolean;
};

export type TextExtractEvidence = {
  source: "TEXT" | "WHATSAPP";
  text: string;
};

export type OcrResultEvidence = {
  fileId: string;
  status: "PENDING_PROVIDER"; // v0.1 has no OCR provider wired in yet
  note: string;
};

export type MetadataEvidence = Record<string, string | number | boolean | null>;
