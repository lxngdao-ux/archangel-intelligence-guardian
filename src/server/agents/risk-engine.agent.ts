import type { Evidence, RiskLevel, ConfidenceLevel, InvestigationType } from "@prisma/client";
import type { AgentContext, InvestigationAgent } from "@/server/agents/base.agent";
import type { CompanyIntelligenceResult } from "@/server/agents/company-intelligence.agent";
import type { FraudPatternDetectionResult } from "@/server/agents/fraud-pattern-detection.agent";
import type { RiskCategoryScore } from "@/types/report.types";
import { clamp } from "@/lib/utils";

export interface RiskEngineInput {
  evidence: Evidence[];
  companyIntel: CompanyIntelligenceResult;
  fraudDetection: FraudPatternDetectionResult;
  investigationType: InvestigationType;
}

export interface RiskEngineResult {
  categoryScores: RiskCategoryScore[];
  trustScore: number;
  riskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  missingInfoFlags: string[];
}

// Weights sum to 1.0 — see docs/ARCHITECTURE.md §4 (Agent 4) for rationale.
// SCAM_PATTERN_MATCH carries the most weight because it's the most direct,
// concrete signal v0.1 has; REGULATORY_EVIDENCE/REPUTATION carry the least
// because v0.1 has no real data source for either yet (flagged as missing
// information rather than silently defaulted).
const CATEGORY_WEIGHTS = {
  TRANSPARENCY: 0.15,
  IDENTITY_VERIFICATION: 0.15,
  REGULATORY_EVIDENCE: 0.1,
  REPUTATION: 0.1,
  TECHNICAL_SECURITY: 0.1,
  SUSTAINABILITY: 0.15,
  SCAM_PATTERN_MATCH: 0.25,
} as const;

/**
 * Agent 4 — pure aggregation over the signals gathered so far. No new
 * evidence is collected here; this agent only scores what Agents 1–3
 * already produced, which is what keeps it easy to unit test and easy to
 * recalibrate (the weights above are the only "policy" in the system).
 */
export class RiskEngineAgent implements InvestigationAgent<RiskEngineInput, RiskEngineResult> {
  readonly name = "RiskEngineAgent";

  async run(input: RiskEngineInput, context: AgentContext): Promise<RiskEngineResult> {
    const { companyIntel, fraudDetection } = input;
    const missingInfoFlags: string[] = [];

    const transparency = this.scoreTransparency(companyIntel, missingInfoFlags);
    const identity = this.scoreIdentity(companyIntel);
    const regulatory = this.scoreRegulatory(missingInfoFlags);
    const reputation = this.scoreReputation(missingInfoFlags);
    const technicalSecurity = this.scoreTechnicalSecurity(companyIntel);
    const sustainability = this.scoreSustainability(fraudDetection);
    const scamPatternMatch = this.scoreScamPatternMatch(fraudDetection, missingInfoFlags);

    const categoryScores: RiskCategoryScore[] = [
      transparency,
      identity,
      regulatory,
      reputation,
      technicalSecurity,
      sustainability,
      scamPatternMatch,
    ];

    const trustScore = Math.round(
      categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0),
    );

    const riskLevel: RiskLevel =
      trustScore >= 75 ? "LOW" : trustScore >= 50 ? "MODERATE" : trustScore >= 25 ? "HIGH" : "CRITICAL";

    const confidenceLevel: ConfidenceLevel = this.deriveConfidence(companyIntel, fraudDetection);

    // Persist one RiskSignal row per category — append-only, so re-running
    // this agent later (e.g. after a model upgrade) adds history rather than
    // overwriting it. See docs/ROADMAP.md "Scaling notes".
    await context.db.riskSignal.createMany({
      data: categoryScores.map((c) => ({
        investigationId: context.investigationId,
        category: c.category,
        score: Math.round(c.score),
        weight: c.weight,
        findings: { summary: c.summary } satisfies Record<string, unknown>,
      })),
    });

    return { categoryScores, trustScore, riskLevel, confidenceLevel, missingInfoFlags };
  }

  private scoreTransparency(intel: CompanyIntelligenceResult, missing: string[]): RiskCategoryScore {
    let score = 40;
    if (intel.contactInfoFound) score += 30;
    if (intel.domainFound) score += 15;
    if (!intel.domainFound) missing.push("No website was available to check for disclosure of company details.");
    score = clamp(score);
    return {
      category: "TRANSPARENCY",
      score,
      weight: CATEGORY_WEIGHTS.TRANSPARENCY,
      summary: intel.contactInfoFound
        ? "Contact information was findable on the site."
        : "No clear contact information was found.",
    };
  }

  private scoreIdentity(intel: CompanyIntelligenceResult): RiskCategoryScore {
    const score = clamp(intel.identityConfidence * 100);
    return {
      category: "IDENTITY_VERIFICATION",
      score,
      weight: CATEGORY_WEIGHTS.IDENTITY_VERIFICATION,
      summary: intel.domainFound
        ? `Domain identity signals give ${score >= 60 ? "reasonable" : "limited"} confidence in who operates this site.`
        : "No domain was available to verify an operating identity.",
    };
  }

  private scoreRegulatory(missing: string[]): RiskCategoryScore {
    missing.push("Guardian does not yet have a connected regulatory registration database for this category.");
    return {
      category: "REGULATORY_EVIDENCE",
      score: 50,
      weight: CATEGORY_WEIGHTS.REGULATORY_EVIDENCE,
      summary: "No regulatory database is connected yet — this category is neutral, not verified.",
    };
  }

  private scoreReputation(missing: string[]): RiskCategoryScore {
    missing.push("Guardian does not yet have a connected reputation/review data source for this category.");
    return {
      category: "REPUTATION",
      score: 50,
      weight: CATEGORY_WEIGHTS.REPUTATION,
      summary: "No independent reputation data is connected yet — this category is neutral, not verified.",
    };
  }

  private scoreTechnicalSecurity(intel: CompanyIntelligenceResult): RiskCategoryScore {
    if (!intel.domainFound) {
      return {
        category: "TECHNICAL_SECURITY",
        score: 50,
        weight: CATEGORY_WEIGHTS.TECHNICAL_SECURITY,
        summary: "No website was available to check technical security signals.",
      };
    }
    const score = intel.sslValid ? 85 : 25;
    return {
      category: "TECHNICAL_SECURITY",
      score,
      weight: CATEGORY_WEIGHTS.TECHNICAL_SECURITY,
      summary: intel.sslValid
        ? "The site uses a secure (HTTPS) connection."
        : "The site does not use a secure (HTTPS) connection.",
    };
  }

  private scoreSustainability(fraud: FraudPatternDetectionResult): RiskCategoryScore {
    const unsustainableCategories = new Set(["PONZI", "GUARANTEED_RETURN", "RECRUITMENT_DEPENDENCY"]);
    const hits = fraud.matches.filter((m) => unsustainableCategories.has(m.category));
    const score = clamp(90 - hits.length * 25);
    return {
      category: "SUSTAINABILITY",
      score,
      weight: CATEGORY_WEIGHTS.SUSTAINABILITY,
      summary:
        hits.length > 0
          ? "Language suggesting an unsustainable, recruitment- or payout-dependent structure was found."
          : "No obvious signs of an unsustainable business structure were found in the analyzed text.",
    };
  }

  private scoreScamPatternMatch(
    fraud: FraudPatternDetectionResult,
    missing: string[],
  ): RiskCategoryScore {
    if (!fraud.textAnalyzed) {
      missing.push("No text content was available to scan for known scam patterns.");
      return {
        category: "SCAM_PATTERN_MATCH",
        score: 50,
        weight: CATEGORY_WEIGHTS.SCAM_PATTERN_MATCH,
        summary: "No analyzable text was available for scam-pattern scanning.",
      };
    }
    const score = clamp(100 - fraud.rawRiskScore);
    return {
      category: "SCAM_PATTERN_MATCH",
      score,
      weight: CATEGORY_WEIGHTS.SCAM_PATTERN_MATCH,
      summary:
        fraud.matches.length > 0
          ? `${fraud.matches.length} known scam pattern${fraud.matches.length === 1 ? "" : "s"} matched: ${fraud.matches.map((m) => m.name).join(", ")}.`
          : "No known scam patterns were matched in the analyzed text.",
    };
  }

  private deriveConfidence(
    intel: CompanyIntelligenceResult,
    fraud: FraudPatternDetectionResult,
  ): ConfidenceLevel {
    const signalsPresent = [intel.domainFound, fraud.textAnalyzed].filter(Boolean).length;
    if (signalsPresent >= 2) return "MEDIUM"; // v0.1 caps at MEDIUM until real OCR/WHOIS/reputation data is wired in
    if (signalsPresent === 1) return "LOW";
    return "LOW";
  }
}
