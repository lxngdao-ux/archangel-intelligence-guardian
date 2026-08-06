# Guardian Prompt Standards

Source of truth for agent behavior: `ARCHITECTURE.md` §5 and `AI_AGENTS.md`. This document is the prompt-engineering layer underneath those contracts.

**Current State:** the actual prompt text currently used by each shipped agent was not shared in this session and isn't reproduced here. What follows is the target template every agent's prompt should conform to, and the non-negotiable rules that apply regardless of which AI provider executes it (`ARCHITECTURE.md` Design Principle #3 — swappable providers).

---

## Non-negotiable prompt rules

1. **Never ask the model for a confidence percentage.** The output schema has `confidenceType: "observed" | "inferred" | "conclusion"` — a three-way category, not a number. If a prompt asks a model to "rate your confidence 0–100," that's the exact failure mode `ARCHITECTURE.md` Design Principle #2 exists to prevent, and it will produce a fabricated statistic no matter how confidently the model states it.
2. **Require a `sourceRef` on every finding.** A prompt that lets a model assert something without pointing back to the evidence it came from produces findings `Explainability Engine` can't attribute — reject that output at the application layer, don't just hope the model complies.
3. **Redact before the prompt, not after.** Full names, phone numbers, emails, passwords, and ID numbers present in submitted evidence must be stripped before the evidence text reaches any external AI provider's API — not redacted from the response afterward. Sending PII to a third-party model and redacting only the reply still means the PII left the platform.
4. **Provider-neutral instructions.** Prompts should not depend on a specific provider's quirks (a specific system-prompt format, a specific function-calling dialect) beyond what the `NarrativeGenerator` / agent interface already abstracts — that abstraction is what keeps providers swappable.
5. **No verdicts.** A prompt must never instruct a model to output "this is a scam" as a bare conclusion. The required output is evidence → reasoning → conclusion, in that order, matching the Golden Rule in `ARCHITECTURE.md` §1.

---

## Base agent prompt template

Every specialist agent's prompt should be built from this skeleton, varying only the domain-specific instructions section:

```
You are the {AGENT_NAME} for Guardian, a Trust Intelligence investigation platform.
Your job is narrow: {ONE_SENTENCE_RESPONSIBILITY}. You do not decide overall risk —
that is the Risk Engine's job. You do not write the final explanation — that is the
Explainability Engine's job. You only produce findings.

INPUT: a set of normalized evidence items for one investigation. Some may contain
personal information belonging to people other than the submitter. Do not repeat
full names, phone numbers, email addresses, passwords, or ID numbers in your output
under any circumstances, even if they appear in the input.

For each thing you find, output a finding with:
- type: a short machine-readable label
- confidenceType: "observed" if you read it directly in the evidence, "inferred" if
  you derived it from a pattern, "conclusion" only if you are synthesizing multiple
  findings into a judgment
- weight: "low" | "medium" | "high" | "critical" — how much this should matter to
  the overall risk assessment, not how sure you are that it's true
- sourceRef: which evidence item (and, if available, timestamp) this came from
- description: one sentence, plain language
- riskDelta: a point value if this finding should move the score, omit otherwise

Do not assign a numeric confidence percentage to any finding. Do not conclude that
something "is a scam" — describe what you observed and let the Risk and
Explainability Engines synthesize it.

DOMAIN-SPECIFIC INSTRUCTIONS:
{AGENT_SPECIFIC_SECTION}

Return only a JSON array of findings matching the AgentFinding shape. No prose
outside the JSON.
```

## Domain-specific sections (target, per agent)

- **Network:** look for domain age, WHOIS anomalies, referral/invite-gated URLs, hosting patterns.
- **Behaviour:** urgency language, social-proof phrasing, authority claims, scripted-sounding repetition across messages.
- **Financial:** payment requests relative to verification steps, withdrawal conditions, guaranteed-return language.
- **Identity:** order of KYC requests relative to payment, how credentials are transmitted.
- **Conversation:** dependency-building patterns, escalation of commitment, isolation language.
- **Evidence:** timeline construction, deduplication, final ledger assembly — this one synthesizes rather than detects.

## Testing prompts

Every prompt change should be run against the redacted Investigation File 001 fixture (`TESTING.md`) before merging, and the resulting findings diffed against the previous version's output. A prompt change that silently changes the score on the canonical fixture without a documented reason has violated Architecture Principle #8 (every investigation is reproducible).
