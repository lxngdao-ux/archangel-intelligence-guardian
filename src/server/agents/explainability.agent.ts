import type { InvestigationType } from "@prisma/client";
import type { AgentContext, InvestigationAgent } from "@/server/agents/base.agent";
import { recordAIAnalysis } from "@/server/agents/base.agent";
import type { CompanyIntelligenceResult } from "@/server/agents/company-intelligence.agent";
import type { FraudPatternDetectionResult } from "@/server/agents/fraud-pattern-detection.agent";
import type { RiskEngineResult } from "@/server/agents/risk-engine.agent";
import type { ReportContent } from "@/types/report.types";
import { RISK_LEVEL_LABEL } from "@/types/report.types";
import { generateReportNumber } from "@/lib/utils";

export interface ExplainabilityInput {
  investigationType: InvestigationType;
  companyIntel: CompanyIntelligenceResult;
  fraudDetection: FraudPatternDetectionResult;
  riskEngineResult: RiskEngineResult;
  reportSequence: number;
}

/**
 * Strategy interface, same shape as FraudPatternAnalyzer (Agent 3) — swap
 * TemplateNarrativeGenerator for an LLM-backed `ClaudeNarrativeGenerator` in
 * Phase 1 (docs/ROADMAP.md) to turn the same structured input into richer,
 * less repetitive prose. Nothing downstream needs to change: the shape of
 * ReportContent stays identical either way.
 */
export interface NarrativeGenerator {
  summarize(input: ExplainabilityInput): string;
}

export class TemplateNarrativeGenerator implements NarrativeGenerator {
  summarize(input: ExplainabilityInput): string {
    const { riskEngineResult } = input;
    const levelLabel = RISK_LEVEL_LABEL[riskEngineResult.riskLevel].toLowerCase();
    const strongestConcern = [...riskEngineResult.categoryScores].sort((a, b) => a.score - b.score)[0];
    const strongestPositive = [...riskEngineResult.categoryScores].sort((a, b) => b.score - a.score)[0];

    return (
      `Guardian scored this ${levelLabel}, with an overall trust score of ${riskEngineResult.trustScore}/100. ` +
      `${strongestPositive ? strongestPositive.summary : ""} ` +
      `${strongestConcern ? strongestConcern.summary : ""}`
    ).replace(/\s+/g, " ").trim();
  }
}

/**
 * Agent 5 — turns the Risk Engine's structured, numeric output into the
 * plain-language report sections. Deliberately never uses legal or
 * definitive language ("this is a scam") — only findings, confidence, and
 * recommended next steps. See docs/ARCHITECTURE.md §5.
 */
export class ExplainabilityEngineAgent
  implements InvestigationAgent<ExplainabilityInput, ReportContent>
{
  readonly name = "ExplainabilityEngineAgent";
  private readonly narrativeGenerator: NarrativeGenerator;

  constructor(narrativeGenerator: NarrativeGenerator = new TemplateNarrativeGenerator()) {
    this.narrativeGenerator = narrativeGenerator;
  }

  async run(input: ExplainabilityInput, context: AgentContext): Promise<ReportContent> {
    const started = Date.now();
    const { riskEngineResult, fraudDetection, companyIntel } = input;

    const positiveSignals = riskEngineResult.categoryScores
      .filter((c) => c.score >= 70)
      .map((c) => c.summary);

    const warningSigns = [
      ...riskEngineResult.categoryScores.filter((c) => c.score < 50).map((c) => c.summary),
      ...fraudDetection.matches
        .filter((m) => m.severity >= 4)
        .map((m) => `Detected language consistent with "${m.name.toLowerCase()}".`),
      ...companyIntel.notes,
    ];

    const missingInformation = Array.from(new Set(riskEngineResult.missingInfoFlags));

    const recommendedActions = this.buildRecommendedActions(input);

    const report: ReportContent = {
      reportNumber: generateReportNumber(input.reportSequence),
      trustScore: riskEngineResult.trustScore,
      riskLevel: riskEngineResult.riskLevel,
      confidenceLevel: riskEngineResult.confidenceLevel,
      summary: this.narrativeGenerator.summarize(input),
      positiveSignals: dedupeNonEmpty(positiveSignals),
      warningSigns: dedupeNonEmpty(warningSigns),
      missingInformation,
      detailedFindings: riskEngineResult.categoryScores,
      recommendedActions,
      generatedAt: new Date().toISOString(),
    };

    await recordAIAnalysis(context, {
      agentName: this.name,
      providerName: this.narrativeGenerator.constructor.name,
      rawOutput: report as unknown as Record<string, unknown>,
      latencyMs: Date.now() - started,
    });

    return report;
  }

  private buildRecommendedActions(input: ExplainabilityInput): string[] {
    const actions: string[] = [];
    const { riskEngineResult, fraudDetection } = input;

    if (riskEngineResult.riskLevel === "CRITICAL" || riskEngineResult.riskLevel === "HIGH") {
      actions.push("Do not send money or personal information until you've independently verified this.");
    }
    if (fraudDetection.matches.some((m) => m.category === "ADVANCE_FEE" || m.category === "PHISHING")) {
      actions.push("Never pay an upfront fee or share login codes to 'unlock' a payment or prize.");
    }
    if (fraudDetection.matches.some((m) => m.category === "GUARANTEED_RETURN" || m.category === "PONZI")) {
      actions.push("Treat any promise of guaranteed or unusually high returns as a major warning sign.");
    }
    if (!input.companyIntel.contactInfoFound) {
      actions.push("Look for a verifiable phone number, address, and registration before proceeding.");
    }
    actions.push("Verify this opportunity independently through official or regulatory sources before committing money.");
    actions.push("If you're unsure, pause — legitimate opportunities don't disappear because you took a day to check.");

    return Array.from(new Set(actions));
  }
}

function dedupeNonEmpty(items: string[]): string[] {
  return Array.from(new Set(items.filter((i) => i && i.trim().length > 0)));
}
