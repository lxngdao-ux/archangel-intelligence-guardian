/**
 * Seam for turning screenshots/PDFs/images into text. v0.1 ships only the
 * interface + a placeholder — see docs/ROADMAP.md Phase 1 for wiring this
 * to Claude Vision or a dedicated OCR service. Evidence Collector calls
 * this and stores whatever comes back as-is, so upgrading the provider
 * requires no changes to the pipeline around it.
 */
export interface OcrExtractionResult {
  status: "PENDING_PROVIDER" | "EXTRACTED";
  text?: string;
  note: string;
}

export interface OcrProvider {
  extractText(params: { storageKey: string; mimeType: string }): Promise<OcrExtractionResult>;
}

export class PlaceholderOcrProvider implements OcrProvider {
  async extractText(): Promise<OcrExtractionResult> {
    return {
      status: "PENDING_PROVIDER",
      note:
        "No OCR/vision provider configured yet. This file was stored and linked to the investigation, " +
        "but its contents were not analyzed. See docs/ROADMAP.md Phase 1.",
    };
  }
}

export const ocrProvider: OcrProvider = new PlaceholderOcrProvider();
