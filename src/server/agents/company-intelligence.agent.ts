import type { Evidence } from "@prisma/client";
import type { AgentContext, InvestigationAgent } from "@/server/agents/base.agent";
import { recordAIAnalysis } from "@/server/agents/base.agent";
import { whoisProvider } from "@/server/agents/providers/whois.provider";
import type { WebpageContentEvidence } from "@/types/investigation.types";

export interface CompanyIntelligenceResult {
  domainFound: boolean;
  domain?: string;
  domainAgeInDays?: number | null;
  registrantPrivacyEnabled?: boolean;
  sslValid?: boolean;
  contactInfoFound: boolean;
  companyId?: string;
  domainId?: string;
  identityConfidence: number; // 0–1, feeds Risk Engine's Identity Verification category
  notes: string[];
}

/**
 * Agent 2 — establishes who is actually behind the thing being investigated.
 * Real work when a URL is present (WHOIS-backed via the swappable
 * WhoisProvider + Domain/Company upserts); a clearly-flagged low-confidence
 * result for input types with no resolvable identity (pasted text, most
 * WhatsApp messages, files without a company name).
 */
export class CompanyIntelligenceAgent
  implements InvestigationAgent<Evidence[], CompanyIntelligenceResult>
{
  readonly name = "CompanyIntelligenceAgent";

  async run(evidence: Evidence[], context: AgentContext): Promise<CompanyIntelligenceResult> {
    const started = Date.now();
    const webpageEvidence = evidence.find((e) => e.kind === "WEBPAGE_CONTENT");

    let result: CompanyIntelligenceResult;

    if (webpageEvidence) {
      result = await this.analyzeWebpage(webpageEvidence, context);
    } else {
      result = {
        domainFound: false,
        contactInfoFound: false,
        identityConfidence: 0.15,
        notes: [
          "No website was provided, so Guardian could not independently verify a company identity for this input.",
        ],
      };
    }

    await recordAIAnalysis(context, {
      agentName: this.name,
      providerName: webpageEvidence ? "MockWhoisProvider" : "none",
      rawOutput: result as unknown as Record<string, unknown>,
      latencyMs: Date.now() - started,
    });

    return result;
  }

  private async analyzeWebpage(
    evidence: Evidence,
    context: AgentContext,
  ): Promise<CompanyIntelligenceResult> {
    const content = evidence.content as unknown as WebpageContentEvidence;
    const notes: string[] = [];

    let domain: string | null = null;
    try {
      domain = new URL(content.finalUrl || content.url).hostname.replace(/^www\./, "");
    } catch {
      notes.push("The provided URL could not be parsed, so domain-level checks were skipped.");
    }

    if (!domain) {
      return { domainFound: false, contactInfoFound: content.hasContactPage, identityConfidence: 0.2, notes };
    }

    const whois = await whoisProvider.lookup(domain);

    const existingDomain = await context.db.domain.findUnique({
      where: { domain },
      include: { company: true },
    });

    const company = existingDomain?.company
      ? await context.db.company.update({
          where: { id: existingDomain.company.id },
          data: { lastVerifiedAt: new Date() },
        })
      : await context.db.company.create({
          data: { name: content.title?.trim() || domain, lastVerifiedAt: new Date() },
        });

    const domainRecord = await context.db.domain.upsert({
      where: { domain },
      update: {
        companyId: company.id,
        registeredAt: whois.registeredAt ? new Date(whois.registeredAt) : null,
        sslValid: content.usesHttps,
        whoisData: whois as unknown as object,
        lastCheckedAt: new Date(),
      },
      create: {
        domain,
        companyId: company.id,
        registeredAt: whois.registeredAt ? new Date(whois.registeredAt) : null,
        sslValid: content.usesHttps,
        whoisData: whois as unknown as object,
        riskFlags: [],
      },
    });

    if (!content.usesHttps) notes.push("The site does not use HTTPS, which is unusual for a business handling money or personal data.");
    if (!content.hasContactPage) notes.push("No contact page was detected on the site.");
    if (whois.ageInDays !== null && whois.ageInDays < 90) {
      notes.push(`The domain appears to be relatively new (roughly ${whois.ageInDays} days old).`);
    }

    // Simple, explainable weighting — see docs/ARCHITECTURE.md §5 on why v0.1
    // favors conservative, inspectable scoring over a black-box number.
    let identityConfidence = 0.5;
    if (content.hasContactPage) identityConfidence += 0.15;
    if (content.usesHttps) identityConfidence += 0.1;
    if (whois.ageInDays !== null && whois.ageInDays > 365) identityConfidence += 0.15;
    if (whois.ageInDays !== null && whois.ageInDays < 30) identityConfidence -= 0.2;
    identityConfidence = Math.min(1, Math.max(0, identityConfidence));

    return {
      domainFound: true,
      domain,
      domainAgeInDays: whois.ageInDays,
      registrantPrivacyEnabled: whois.registrantPrivacyEnabled,
      sslValid: content.usesHttps,
      contactInfoFound: content.hasContactPage,
      companyId: company.id,
      domainId: domainRecord.id,
      identityConfidence,
      notes,
    };
  }
}
