import type { RiskLevel, InvestigationType, RiskCategory } from "@prisma/client";

/** Tailwind class fragments per risk level — one source of truth for the UI. */
export const RISK_LEVEL_STYLES: Record<
  RiskLevel,
  { text: string; bg: string; ring: string; dot: string }
> = {
  LOW: { text: "text-trust", bg: "bg-trust-bg", ring: "ring-trust/30", dot: "bg-trust" },
  MODERATE: { text: "text-caution", bg: "bg-caution-bg", ring: "ring-caution/30", dot: "bg-caution" },
  HIGH: { text: "text-risk", bg: "bg-risk-bg", ring: "ring-risk/30", dot: "bg-risk" },
  CRITICAL: { text: "text-risk", bg: "bg-risk-bg", ring: "ring-risk/50", dot: "bg-risk" },
};

export const INVESTIGATION_TYPE_LABEL: Record<InvestigationType, string> = {
  URL: "Website URL",
  SCREENSHOT: "Screenshot",
  PDF: "PDF document",
  IMAGE: "Image",
  TEXT: "Pasted text",
  WHATSAPP: "WhatsApp message",
};

export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  TRANSPARENCY: "Transparency",
  IDENTITY_VERIFICATION: "Identity verification",
  REGULATORY_EVIDENCE: "Regulatory evidence",
  REPUTATION: "Reputation",
  TECHNICAL_SECURITY: "Technical security",
  SUSTAINABILITY: "Sustainability",
  SCAM_PATTERN_MATCH: "Scam pattern match",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/investigation/new", label: "New investigation" },
  { href: "/history", label: "History" },
  { href: "/account", label: "Account" },
  { href: "/settings", label: "Settings" },
] as const;
