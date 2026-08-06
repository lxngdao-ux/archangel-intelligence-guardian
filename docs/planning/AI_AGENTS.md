# Guardian AI Agent Ecosystem

Source of truth: `ARCHITECTURE.md` §5. This document expands the agent contract, records the reconciliation decision as adopted, and gives a checklist for adding a new agent.

---

## The agent contract (authoritative — do not diverge without updating `ARCHITECTURE.md` §5 first)

```ts
interface AgentInput {
  investigationId: string;
  evidence: NormalizedEvidence[];
}

interface AgentFinding {
  type: string;
  confidenceType: "observed" | "inferred" | "conclusion";
  weight: "low" | "medium" | "high" | "critical";
  sourceRef: { evidenceId: string; timestamp?: string; excerpt?: string };
  description: string;
  riskDelta?: number;
}

interface AgentOutput {
  agentName: string;
  findings: AgentFinding[];
  outstandingQuestions?: string[];
}
```

Three rules follow directly from this contract:

1. **An agent never emits a bare `conclusion` finding without at least one `observed` finding backing it.** A conclusion with no observations behind it is a guess wearing a badge.
2. **`riskDelta` is optional.** Not every finding contributes points — some exist purely to inform a Hypothesis or answer an Outstanding Question.
3. **Agents write to the Evidence Graph Engine only** (`recordFindings()`, `ARCHITECTURE.md` §8), never directly to Risk or Report. If a new agent's design has it calling the Risk Engine directly, that's a contract violation, not an optimization.

---

## Current agents (v0.1) — as shipped

| Agent | Responsibility | Produces findings for |
|---|---|---|
| Evidence Collector | Live URL fetching, HTML extraction | Intake / Evidence Graph |
| Company Intelligence | WHOIS lookups via swappable `WhoisProvider` | Network-type findings |
| Fraud Pattern Detection | Rule-based scan against seeded scam pattern families (Ponzi, advance-fee, romance scam, phishing, fake jobs, MLM, urgency tactics, guaranteed returns) | Behaviour + Financial-type findings |
| Risk Scoring | Weighted 0–100 score across seven categories | Risk Engine |
| Narrative Generation | Plain-language explanation via swappable `NarrativeGenerator` | Explainability Engine |

**Important:** none of these five currently emit output in the exact `AgentOutput` / `AgentFinding` shape above — that shape is the Phase 2 target (`ROADMAP.md`). Today's agents predate this contract. Bringing each one into conformance with the shape (specifically: tagging every output as observed/inferred/conclusion, and attaching a `sourceRef`) is itself a Phase 2 task, not something to assume is already true.

## Target agent set — Network · Behaviour · Financial · Identity · Conversation · Evidence

**Reconciliation decision: relabel-as-roadmap (adopted).** Per `ARCHITECTURE.md` §5, existing agents keep their current names and boundaries. The target set is a roadmap description of coverage, not a renaming mandate:

| Target coverage | Currently covered by | Status |
|---|---|---|
| Network | Company Intelligence | ✅ Covered |
| Behaviour | Fraud Pattern Detection (partial) | 🟡 Partial |
| Financial | Fraud Pattern Detection (partial) | 🟡 Partial |
| Identity | — | ⬜ Uncovered — Phase 3 (`ROADMAP.md`) |
| Conversation | — | ⬜ Uncovered — Phase 3 |
| Evidence | Evidence Collector + Risk Scoring + Narrative Generation (split across three) | 🟡 Distributed |

If Behaviour and Financial ever diverge enough in logic that splitting Fraud Pattern Detection into two agents becomes clearly simpler than one agent with two responsibilities, that's a legitimate reason to revisit this table — but the split should be driven by that complexity signal, not by matching a name list.

---

## Checklist: adding a new agent

1. Does its output fit the `AgentFinding` contract above without stretching it? If not, the contract may need to change first — propose that change in `ARCHITECTURE.md` §5, don't quietly extend it in code.
2. Which existing target-coverage row (Network / Behaviour / Financial / Identity / Conversation / Evidence) does it serve? If none, is a new row actually justified, or does it belong inside an existing agent?
3. Write to `recordFindings()` only. No direct writes to `Investigation`, `Report`, or Risk-related tables.
4. Every `conclusion`-type finding must reference at least one `observed` finding it was built from.
5. Add a fixture-based test using the redacted Investigation File 001 case (see `TESTING.md`) before merging — the canonical fixture exists specifically so every agent has one shared, real case to validate against.
6. Update the "Current agents" table above in the same pull request.

## Prompt standards

See `PROMPTS.md` for the template every agent's underlying prompt should follow — structured JSON output matching this contract, explicit instruction against fabricated confidence percentages, and redaction-aware handling of any PII present in submitted evidence.
