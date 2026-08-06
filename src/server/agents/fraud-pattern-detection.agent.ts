import type { Evidence, ScamPattern } from "@prisma/client";
import type { AgentContext, InvestigationAgent } from "@/server/agents/base.agent";
import { recordAIAnalysis } from "@/server/agents/base.agent";
import type {
  WebpageContentEvidence,
  TextExtractEvidence,
} from "@/types/investigation.types";
import { clamp } from "@/lib/utils";

export interface FraudPatternMatch {
  patternId: string;
  name: string;
  category: ScamPattern["category"];
  severity: number;
  matchedKeywords: string[];
}

export interface FraudPatternDetectionResult {
  matches: FraudPatternMatch[];
  rawRiskScore: number; // 0–100, HIGHER = more scam indicators found (inverted by the Risk Engine)
  textAnalyzed: boolean;
}

/**
 * Strategy interface so the rule-based scanner below can sit next to a
 * future LLM-backed analyzer (docs/ROADMAP.md Phase 1: `AIFraudPatternAnalyzer`,
 * which would call an LLM for nuance — sarcasm, translated text, novel
 * phrasing — that a keyword scanner structurally can't catch) — the agent
 * itself doesn't change when that ships, only which analyzer it's given.
 */
export interface FraudPatternAnalyzer {
  analyze(text: string, patterns: ScamPattern[]): { matches: FraudPatternMatch[]; rawRiskScore: number };
}

export class RuleBasedFraudPatternAnalyzer implements FraudPatternAnalyzer {
  analyze(text: string, patterns: ScamPattern[]) {
    const haystack = text.toLowerCase();
    const matches: FraudPatternMatch[] = [];
    let weightedTotal = 0;

    for (const pattern of patterns) {
      const indicators = pattern.indicators as unknown as { keywords: string[]; weight: number };
      const matchedKeywords = indicators.keywords.filter((kw) => haystack.includes(kw.toLowerCase()));
      if (matchedKeywords.length === 0) continue;

      matches.push({
        patternId: pattern.id,
        name: pattern.name,
        category: pattern.category,
        severity: pattern.severity,
        matchedKeywords,
      });

      weightedTotal += matchedKeywords.length * indicators.weight * (pattern.severity / 5);
    }

    // Squash the raw weighted sum into 0–100 with diminishing returns —
    // a handful of severe matches should already read as high risk without
    // requiring an unbounded number of keyword hits to max out.
    const rawRiskScore = clamp(100 * (1 - Math.exp(-weightedTotal / 40)));

    return { matches, rawRiskScore };
  }
}

/**
 * Agent 3 — scans collected evidence text against the ScamPattern knowledge
 * base (data, not code — see prisma/seed.ts) using a swappable analyzer.
 */
export class FraudPatternDetectionAgent
  implements InvestigationAgent<Evidence[], FraudPatternDetectionResult>
{
  readonly name = "FraudPatternDetectionAgent";
  private readonly analyzer: FraudPatternAnalyzer;

  constructor(analyzer: FraudPatternAnalyzer = new RuleBasedFraudPatternAnalyzer()) {
    this.analyzer = analyzer;
  }

  async run(evidence: Evidence[], context: AgentContext): Promise<FraudPatternDetectionResult> {
    const started = Date.now();
    const text = this.extractAnalyzableText(evidence);

    if (!text) {
      const empty: FraudPatternDetectionResult = { matches: [], rawRiskScore: 0, textAnalyzed: false };
      await recordAIAnalysis(context, {
        agentName: this.name,
        providerName: "none",
        rawOutput: empty as unknown as Record<string, unknown>,
        latencyMs: Date.now() - started,
      });
      return empty;
    }

    const patterns = await context.db.scamPattern.findMany();
    const { matches, rawRiskScore } = this.analyzer.analyze(text, patterns);
    const result: FraudPatternDetectionResult = { matches, rawRiskScore, textAnalyzed: true };

    await recordAIAnalysis(context, {
      agentName: this.name,
      providerName: this.analyzer.constructor.name,
      rawOutput: result as unknown as Record<string, unknown>,
      latencyMs: Date.now() - started,
    });

    context.log(`Matched ${matches.length} scam pattern(s).`, { rawRiskScore });
    return result;
  }

  private extractAnalyzableText(evidence: Evidence[]): string {
    const chunks: string[] = [];
    for (const e of evidence) {
      if (e.kind === "WEBPAGE_CONTENT") {
        const c = e.content as unknown as WebpageContentEvidence;
        chunks.push(c.title ?? "", c.metaDescription ?? "", c.textSample ?? "");
      }
      if (e.kind === "TEXT_EXTRACT") {
        const c = e.content as unknown as TextExtractEvidence;
        chunks.push(c.text ?? "");
      }
      if (e.kind === "OCR_RESULT") {
        const c = e.content as unknown as { text?: string };
        if (c.text) chunks.push(c.text);
      }
    }
    return chunks.join(" ").trim();
  }
}
