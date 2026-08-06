import type { RiskLevel, ConfidenceLevel, RiskCategory } from "@prisma/client";

export interface RiskCategoryScore {
  category: RiskCategory;
  score: number; // 0–100
  weight: number; // contribution to overall trust score, sums to 1 across categories
  summary: string; // one-line plain-language explanation for this category
}

/** The fully-assembled shape of a Report, matching prisma Report + typed JSON fields. */
export interface ReportContent {
  reportNumber: string;
  trustScore: number;
  riskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  summary: string;
  positiveSignals: string[];
  warningSigns: string[];
  missingInformation: string[];
  detailedFindings: RiskCategoryScore[];
  recommendedActions: string[];
  generatedAt: string;
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: "Low risk",
  MODERATE: "Moderate risk",
  HIGH: "High risk",
  CRITICAL: "Critical risk",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
};
