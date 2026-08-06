import type { Evidence, Investigation, File as FileRecord } from "@prisma/client";
import type { AgentContext, InvestigationAgent } from "@/server/agents/base.agent";
import { ocrProvider } from "@/server/agents/providers/ocr.provider";
import type {
  WebpageContentEvidence,
  TextExtractEvidence,
  MetadataEvidence,
} from "@/types/investigation.types";

export interface EvidenceCollectorInput {
  investigation: Investigation;
  files: FileRecord[];
}

/**
 * Agent 1 — normalizes any of the six supported input types into a common
 * Evidence[] shape. Real work for URL/TEXT/WHATSAPP; a real File record +
 * placeholder OCR result for SCREENSHOT/PDF/IMAGE (see providers/ocr.provider.ts).
 */
export class EvidenceCollectorAgent
  implements InvestigationAgent<EvidenceCollectorInput, Evidence[]>
{
  readonly name = "EvidenceCollectorAgent";

  async run(input: EvidenceCollectorInput, context: AgentContext): Promise<Evidence[]> {
    const { investigation, files } = input;
    const created: Evidence[] = [];

    switch (investigation.type) {
      case "URL": {
        if (!investigation.inputText) break;
        const webEvidence = await this.collectFromUrl(investigation.inputText, context);
        created.push(...webEvidence);
        break;
      }

      case "TEXT":
      case "WHATSAPP": {
        if (!investigation.inputText) break;
        const payload: TextExtractEvidence = {
          source: investigation.type,
          text: investigation.inputText,
        };
        created.push(
          await context.db.evidence.create({
            data: {
              investigationId: investigation.id,
              kind: "TEXT_EXTRACT",
              content: payload,
              sourceRef: "user-input",
              confidence: 1.0,
            },
          }),
        );
        break;
      }

      case "SCREENSHOT":
      case "PDF":
      case "IMAGE": {
        for (const file of files) {
          const ocrResult = await ocrProvider.extractText({
            storageKey: file.storageKey,
            mimeType: file.mimeType,
          });
          created.push(
            await context.db.evidence.create({
              data: {
                investigationId: investigation.id,
                kind: "OCR_RESULT",
                content: { fileId: file.id, ...ocrResult },
                sourceRef: file.id,
                confidence: ocrResult.status === "EXTRACTED" ? 0.8 : 0.0,
              },
            }),
          );
          const metadata: MetadataEvidence = {
            filename: file.filename,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          };
          created.push(
            await context.db.evidence.create({
              data: {
                investigationId: investigation.id,
                kind: "METADATA",
                content: metadata,
                sourceRef: file.id,
                confidence: 1.0,
              },
            }),
          );
        }
        break;
      }
    }

    context.log(`Collected ${created.length} evidence item(s).`, { type: investigation.type });
    return created;
  }

  /** Real, dependency-free web evidence collection: fetch, strip tags, pull title/meta. */
  private async collectFromUrl(rawUrl: string, context: AgentContext): Promise<Evidence[]> {
    const items: Evidence[] = [];
    let html = "";
    let finalUrl = rawUrl;
    let fetchError: string | null = null;

    try {
      const res = await fetch(rawUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "GuardianTrustBot/0.1 (+https://guardian.example/bot)" },
      });
      finalUrl = res.url || rawUrl;
      html = await res.text();
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Unknown fetch error";
      context.log("URL fetch failed", { rawUrl, fetchError });
    }

    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    const metaDescription =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
      null;
    const textSample = this.stripHtml(html).slice(0, 4000);
    const hasContactPage = /href=["'][^"']*contact[^"']*["']/i.test(html);
    const usesHttps = finalUrl.startsWith("https://");

    const webpageContent: WebpageContentEvidence = {
      url: rawUrl,
      finalUrl,
      title,
      metaDescription,
      textSample,
      hasContactPage,
      usesHttps,
    };

    items.push(
      await context.db.evidence.create({
        data: {
          investigationId: context.investigationId,
          kind: "WEBPAGE_CONTENT",
          content: webpageContent,
          sourceRef: rawUrl,
          confidence: fetchError ? 0.1 : 0.9,
        },
      }),
    );

    if (fetchError) {
      items.push(
        await context.db.evidence.create({
          data: {
            investigationId: context.investigationId,
            kind: "METADATA",
            content: { fetchError },
            sourceRef: rawUrl,
            confidence: 1.0,
          },
        }),
      );
    }

    return items;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
