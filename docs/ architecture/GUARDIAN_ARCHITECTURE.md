# Guardian Platform Architecture v2.0
### The Six-Engine Trust Intelligence Architecture

This is the single, authoritative architecture reference for Guardian — it replaces every prior version of `GUARDIAN_ARCHITECTURE.md` in this repository, and there is deliberately no separate `ARCHITECTURE.md` file: one document, one name, one thing everyone points to. It exists to do one thing: make sure the prototype, the codebase, and the investor narrative describe the same system. Every feature proposed from this point forward — in the UI, in a pitch deck, or in a sprint — should be evaluated against the engine (or the Knowledge Layer) it belongs to. If it doesn't map cleanly to one of those, that's a signal to either extend this document deliberately or reconsider the feature.

**Status legend used throughout:**
✅ Implemented in v0.1 · 🟡 Partially implemented · ⬜ Planned, not started

---

## 1. Platform Vision & Design Principles

**Mission.** Before anyone invests money, shares personal information, or commits time to an opportunity, Guardian determines whether that opportunity deserves trust — and explains why.

**Golden Rule.** Guardian never accuses. It investigates, measures risk, explains evidence, and leaves the decision to the person. This rule constrains every engine below: none of them are permitted to emit a bare verdict without the evidence and reasoning that produced it.

**Design principles, in priority order:**

1. **Explainability over verdicts.** A trust score with no traceable reasoning is not a Guardian output, regardless of which engine produced it.
2. **Evidence over confidence.** Findings are labeled Observed / Inferred / Conclusion, not scored with invented certainty percentages. (See §7, `Finding.confidenceType`.)
3. **Swappable providers.** AI models, WHOIS lookups, and narrative generation are interfaces, not vendor lock-ins. This was true in v0.1 and remains a hard constraint on every new engine.
4. **One normalized pipeline.** A WhatsApp export, a screenshot, and a pasted URL all become the same internal `Evidence` shape before any agent touches them.
5. **Acknowledge what isn't known.** Outstanding Questions are a first-class output, not an omission to be papered over. A system that only ever sounds certain isn't trustworthy — it's just confident.
6. **Redaction by default.** Any personally identifying detail belonging to a data subject who isn't the account holder (names, phone numbers, emails, passwords, ID numbers) is stripped before it leaves the Evidence Graph into any Report, demo, or external-facing surface.
7. **Africa first, global by design.** Data model and UI must not assume a single country's ID formats, phone formats, or regulator. FSCA is South Africa's reference point today; the regulator field on `Investigation` is a lookup table, not a hardcoded value.

---

## 2. Architecture Principles

§1 explains *why* Guardian is built this way. These are the non-negotiable rules that follow from it — the ones a code reviewer should block a pull request over, regardless of deadline pressure:

1. Every AI conclusion must be traceable to evidence.
2. Every risk score must be explainable.
3. Every engine owns one responsibility.
4. Engines communicate only through defined contracts.
5. No engine may bypass the Evidence Graph.
6. New AI providers must be replaceable.
7. Personally identifiable information is redacted before leaving the platform.
8. Every investigation is reproducible.
9. Engines read shared reference data from the Knowledge Layer (§4.7); only the Learning Engine writes to it.

If a proposed change can't be justified against one of these nine, that's a reason to stop and ask which one it's quietly breaking — not a reason to assume it's fine.

---

## 3. Platform Capability Matrix

A one-page snapshot before the detail in §4. The v0.1 column had to be split in one place versus the simpler version of this table — evidence ingestion today only covers text and URLs, not the full multi-modal intake (voice, video, WhatsApp exports) the product vision describes, and collapsing those into one row would have overstated where the platform actually is.

| Capability | Engine | v0.1 | v1.0 target |
|---|---|---|---|
| Evidence ingestion (text / URL) | Intake | ✅ | ✅ |
| Multi-modal ingestion (voice, video, WhatsApp export) | Intake | ⬜ | ✅ |
| Investigation orchestration | Investigation | 🟡 | ✅ |
| Entity graph | Evidence Graph | ⬜ | ✅ |
| Explainable reasoning (ledger, hypotheses, outstanding questions) | Explainability | 🟡 | ✅ |
| Risk scoring | Risk | ✅ | ✅ |
| Audience-specific investigation reports | Report | 🟡 | ✅ |
| Continuous learning | Learning | ⬜ | ✅ |
| Shared knowledge layer | Knowledge | 🟡 | ✅ |

---

## 4. The Six Core Engines & the Knowledge Layer

```
Intake Engine → Investigation Engine → [ Specialist Agents ] → Evidence Graph Engine
                                                                        │
                                                                        ▼
                                                                  Risk Engine
                                                                        │
                                                                        ▼
                                                            Explainability Engine
                                                                        │
                                                                        ▼
                                                                 Report Engine
                                                                        │
                                                                        ▼
                                                                Learning Engine
                                                                        │
                                                                        ▼
                                                          Guardian Knowledge Layer
                                                    (Pattern Library · Fraud Taxonomy · Country Rules ·
                                                     Regulatory Data · Risk Rules · Behavior Models ·
                                                     OSINT Intelligence · Historical Investigations)
```

Every engine above reads shared reference data from the Knowledge Layer. Only the Learning Engine writes to it — that's what keeps "what happened in this case" (Investigation), "what Guardian already knows" (Knowledge), and "how that knowledge changes" (Learning) as three separate, honest concerns instead of six engines each maintaining their own copy of the truth.

Explainability is deliberately its own engine, not a feature of the Risk Engine. A score is only useful if the system can independently justify how it arrived there — the Risk Engine is allowed to change its weighting logic without the Explainability Engine's evidence-chain and hypothesis-testing logic having to change with it, and vice versa. Coupling them was the mistake to avoid.

### 4.1 Investigation Engine — 🟡 Partially implemented
**Responsibility:** Receives normalized evidence from the Intake Engine, decides which specialist agents to dispatch, runs them (in parallel where possible), and hands their combined output to the Evidence Graph Engine.
**Today:** v0.1's investigation route triggers the five agents in a fixed sequence. There is no formal orchestrator module — the sequencing lives inline in the API route.
**Gap:** Extract the dispatch logic into a real `InvestigationOrchestrator` service with a defined agent registry, so adding a sixth agent doesn't mean editing the route handler.

### 4.2 Evidence Graph Engine — ⬜ Planned
**Responsibility:** Links every observation into one connected investigation — Person, Website, Phone, Wallet, WhatsApp thread, Referral, Domain, Company, Bank, Device — as a graph, not a flat table per entity type.
**Today:** Entities are stored as independent Prisma tables (`Company`, `Domain`) with foreign keys, not a general-purpose graph. There's no way today to answer "show me everything connected to this phone number" in one query.
**Gap:** This is the single biggest gap between the current schema and this architecture. See §7 for the proposed `Entity` / `Relationship` model.

### 4.3 Risk Engine — ✅ Implemented
**Responsibility:** Converts observed evidence into an explainable 0–100 trust score across weighted categories.
**Today:** Already shipped — seven weighted risk categories, producing an overall trust score and risk level. This is the most mature engine in the platform.
**Gap:** Its inputs currently come from the fraud-pattern keyword scanner directly. Once the Evidence Graph Engine exists, the Risk Engine should read from it instead, so scoring and evidence storage are decoupled (principle in the diagram above).

### 4.4 Explainability Engine — 🟡 Partially implemented
**Responsibility:** Generates the Evidence Ledger, Evidence Chain, Hypothesis Testing, Outstanding Questions, "Why 94?" breakdown, and source attribution for every score.
**Today:** v0.1 has a narrative report generator (`NarrativeGenerator` interface) that turns risk signals into plain-language explanations. That's real, and it's the right foundation.
**Gap:** Everything demonstrated in the Investigation File 001 prototype — the Observed/Inferred/Conclusion taxonomy, the evidence-weight labels, competing-hypothesis evaluation, and outstanding-questions generation — does not exist in the shipped pipeline yet. That prototype is the target spec for this engine, not a description of current behavior.

### 4.5 Report Engine — 🟡 Partially implemented
**Responsibility:** Produces investigation outputs tailored to different audiences — user report, police package, regulator package, bank dispute package, insurance package, PDF export, API output.
**Today:** A web-based report page with a radial trust gauge exists. A single working export path exists in the prototype (browser print-to-PDF).
**Gap:** Everything audience-specific (police/regulator/bank/insurance packages, structured API output) is unbuilt. These should be templates that consume the same Explainability Engine output, not five separate report-writing code paths.

### 4.6 Learning Engine — ⬜ Planned
**Responsibility:** Feeds validated investigations back into the platform as new behavioral patterns, new fraud signatures, updated risk rules, and improved prompts.
**Today:** `ScamPatterns` is a seeded, static table. There is no mechanism by which a completed investigation updates it.
**Gap:** Needs a validation step (who approves a case as ground truth?) before anything automated touches shared pattern data — this is as much a policy decision as an engineering one, and should be resolved before code is written against it.

### 4.7 Guardian Knowledge Layer — 🟡 Partially implemented
**Responsibility:** The shared reference data every engine reads from, so no engine maintains its own private copy of the truth: Pattern Library, Fraud Taxonomy, Country Rules, Regulatory Data, Risk Rules, Behavior Models, OSINT Intelligence, Historical Investigations.
**Today:** `ScamPatterns` is a real, seeded slice of the Pattern Library / Fraud Taxonomy — it just isn't formally recognized as one layer, and nothing else on this list (Country Rules, Regulatory Data, Behavior Models, OSINT Intelligence) has a table yet.
**Gap:** Consolidate `ScamPatterns` and future reference tables under one `KnowledgeLayer` module boundary before more engines start reading from it directly — otherwise this becomes six more copies of the same drift this document is meant to prevent.

---

## 5. AI Agent Ecosystem

### Agent contract
Every specialist agent, regardless of what it inspects, implements the same shape so the Investigation Engine can dispatch to all of them uniformly and the Evidence Graph Engine can ingest all of their output uniformly:

```ts
interface AgentInput {
  investigationId: string;
  evidence: NormalizedEvidence[];   // the shared evidence shape from Intake
}

interface AgentFinding {
  type: string;                     // e.g. "referral_url", "withdrawal_condition"
  confidenceType: "observed" | "inferred" | "conclusion";
  weight: "low" | "medium" | "high" | "critical";
  sourceRef: { evidenceId: string; timestamp?: string; excerpt?: string };
  description: string;
  riskDelta?: number;                // points contributed, if applicable
}

interface AgentOutput {
  agentName: string;
  findings: AgentFinding[];
  outstandingQuestions?: string[];
}
```

An agent that can't cleanly produce `AgentFinding[]` in this shape isn't ready to be wired into the Investigation Engine — that's a useful gate, not red tape.

### Current agents (v0.1) → engine ownership

| Agent (as shipped) | Produces findings for |
|---|---|
| Evidence Collector | Intake / Evidence Graph |
| Company Intelligence (`WhoisProvider`) | Network-type findings |
| Fraud Pattern Detection (keyword scanner) | Behaviour + Financial-type findings |
| Risk Scoring | Risk Engine |
| Narrative Generation (`NarrativeGenerator`) | Explainability Engine |

### Target agent set (as named in the Investigation File 001 prototype)

Network · Behaviour · Financial · Identity · Conversation · Evidence

**Reconciliation needed:** these six names do not map one-to-one onto the five agents actually shipped. Two honest paths, and this should be an explicit decision rather than something that drifts:

- **Rename-and-split:** rename existing agents to match this target set, splitting Fraud Pattern Detection into Behaviour + Financial, and formalize Identity and Conversation as new agents.
- **Relabel-as-roadmap:** keep the current five agents as-is for now, and treat the sixth (Identity) plus the Behaviour/Financial split as Phase 3 roadmap items rather than renaming what already works.

Recommendation: relabel-as-roadmap. Renaming shipped, working code purely to match a pitch deck's naming is exactly the kind of drift this document exists to prevent.

### Communication pattern
Agents write findings to the **Evidence Graph Engine only** — never directly to the Risk Engine or Report Engine. This is the rule that keeps the six engines decoupled: if an agent could write straight to the Risk Engine, the Risk Engine would end up with five different input formats to special-case. One write path, one read contract downstream.

---

## 6. Evidence Lifecycle

```
INGEST → EXTRACT → CORRELATE → ANALYZE → AGGREGATE → REASON → REPORT → LEARN
```

| Stage | Engine | What happens |
|---|---|---|
| Ingest | Intake Engine | Website, phone, email, screenshots, messages, images, documents, links, names, bank accounts collected and normalized |
| Extract | Investigation Engine | Structured entities pulled out — companies, people, domains, wallets, banks, countries, phone numbers |
| Correlate | Evidence Graph Engine | Cross-referenced against existing entities and prior investigations |
| Analyze | Specialist Agents | Each agent runs against the normalized evidence and emits `AgentFinding[]` |
| Aggregate | Evidence Graph Engine | Findings become graph nodes/edges; duplicates resolved |
| Reason | Risk Engine + Explainability Engine | Trust score calculated; evidence chain, hypotheses, and outstanding questions generated |
| Report | Report Engine | Audience-specific output produced |
| Learn | Learning Engine | Validated investigation updates the pattern library |

This is the same nine-step flow from the original product blueprint, condensed to eight stages and mapped explicitly to the engine responsible for each one — the blueprint described *what* happens; this table adds *which engine owns it*, which is what was missing before.

---

## 7. Data Model

### Existing v0.1 entities (unchanged)
`User`, `Organization`, `Subscription`, `Investigation`, `Evidence`, `File`, `Report`, `Company`, `Domain`, `ScamPattern`, `RiskSignal`, `AIAnalysis`, `ActivityLog`, `Notification`, plus NextAuth adapter tables.

### New entities required for the Evidence Graph + Explainability Engines

These are additive — nothing above needs to be removed, but the Evidence Graph and Explainability engines can't exist without them.

```prisma
model Entity {
  id             String   @id @default(cuid())
  investigationId String
  type           String   // "person" | "domain" | "wallet" | "bank_account" | "device" | ...
  label          String   // display label; redacted if it's a data-subject PII field
  attributes     Json
  createdAt      DateTime @default(now())
}

model EntityRelationship {
  id           String  @id @default(cuid())
  fromEntityId String
  toEntityId   String
  relationType String  // "recruited_by" | "registered_on" | "paid_to" | ...
  evidenceId   String? // link back to the Evidence row that justifies this edge
}

model Observation {
  id             String   @id @default(cuid())
  investigationId String
  evidenceId     String   // source Evidence row
  agentName      String
  type           String
  description    String
  timestamp      DateTime?
  excerpt        String?  // short, redacted quote — never a full message
}

model Finding {
  id              String   @id @default(cuid())
  investigationId String
  confidenceType  String   // "observed" | "inferred" | "conclusion"
  weight          String   // "low" | "medium" | "high" | "critical"
  description     String
  riskDelta       Int?
  observationIds  String[] // Observations this Finding is built from
}

model Hypothesis {
  id              String   @id @default(cuid())
  investigationId String
  label           String   // "Pyramid Scheme", "Legitimate Investment Platform", ...
  status          String   // "supported" | "rejected" | "pending"
  supportingFindingIds String[]
  reasoning       String
}

model OutstandingQuestion {
  id              String  @id @default(cuid())
  investigationId String
  question        String
  resolvedAt      DateTime?
}
```

`Finding.confidenceType` is the schema-level enforcement of principle #2 in §1 — there is nowhere in this model to store a fabricated confidence percentage. If a future contributor wants to add one, they have to consciously add a new column against this documented principle, not just drop a number into an existing field.

### Knowledge Layer entity

Unlike the models above, this one isn't investigation-scoped — it's shared, read-only reference data that outlives any single case.

```prisma
model KnowledgeEntry {
  id           String   @id @default(cuid())
  category     String   // "pattern_library" | "fraud_taxonomy" | "country_rule" |
                         // "regulatory_data" | "risk_rule" | "behavior_model" |
                         // "osint" | "historical_investigation"
  key          String   // e.g. "withdrawal_gated_by_referral_count"
  data         Json
  sourceInvestigationIds String[]  // which validated Investigations produced or reinforced this entry
  updatedAt    DateTime @updatedAt
}
```

`ScamPattern` becomes a `category: "pattern_library"` `KnowledgeEntry` under this model rather than a separate table — one consolidation, not a parallel structure to maintain.

---

## 8. Inter-Engine APIs

These are internal module contracts within the Next.js app today, not necessarily HTTP endpoints — but defining them as if they were network boundaries now makes it possible to split engines into separate services later without a rewrite.

```ts
// Intake → Investigation
function submitEvidence(input: RawSubmission): Promise<NormalizedEvidence[]>;

// Investigation → Specialist Agents (fan-out)
function dispatchAgents(investigationId: string, evidence: NormalizedEvidence[]): Promise<AgentOutput[]>;

// Specialist Agents → Evidence Graph
function recordFindings(investigationId: string, output: AgentOutput): Promise<void>;

// Evidence Graph → Risk Engine
function getEvidenceSnapshot(investigationId: string): Promise<{ entities: Entity[]; findings: Finding[] }>;

// Risk Engine → Explainability Engine
function getRiskAssessment(investigationId: string): Promise<{ score: number; contributors: { label: string; points: number }[] }>;

// Explainability Engine → Report Engine
function getExplanation(investigationId: string): Promise<{
  evidenceLedger: Finding[];
  evidenceChain: string[];
  hypotheses: Hypothesis[];
  outstandingQuestions: string[];
}>;

// Report Engine → external consumer
function generateReport(investigationId: string, format: "user" | "police" | "regulator" | "bank" | "insurance" | "pdf" | "api"): Promise<Report>;

// Learning Engine (batch, not per-investigation)
function ingestValidatedInvestigation(investigationId: string, approvedBy: string): Promise<void>;

// Any engine → Knowledge Layer (read-only)
function getKnowledge(category: KnowledgeEntry["category"], key?: string): Promise<KnowledgeEntry[]>;

// Learning Engine → Knowledge Layer (the only write path)
function writeKnowledge(entry: Omit<KnowledgeEntry, "id" | "updatedAt">): Promise<KnowledgeEntry>;
```

The important constraint isn't the exact function signatures — it's the direction of the arrows. Nothing downstream should reach back upstream (the Report Engine never queries raw agent output directly; it only ever reads through the Explainability Engine), and nothing but the Learning Engine calls `writeKnowledge`.

---

## 9. Trust Intelligence Maturity Model

Four levels, describing how Guardian's *behavior* changes as the six engines mature — not a replacement for the phase roadmap below, but a second lens on the same progression, focused on capability rather than delivery.

**Level 1 — Detection.** Scan evidence, identify obvious risks, generate a trust score.
**Level 2 — Investigation.** Build evidence chains, evaluate competing hypotheses, produce explainable findings.
**Level 3 — Intelligence.** Link investigations, detect emerging fraud patterns, correlate entities across cases.
**Level 4 — Prevention.** Real-time intervention, proactive alerts, network intelligence for institutions.

**Where Guardian is today: Level 1, with the first pieces of Level 2 in place.** The Risk Engine delivers real Level 1 detection. The Explainability Engine's narrative generator is an early Level 2 capability, but evidence chains and hypothesis evaluation — the features that actually define Level 2 — are still the prototype, not the product (§4.4). Level 3 depends entirely on the Evidence Graph and Learning Engines, neither of which exists yet (§4.2, §4.6). Level 4 shouldn't be discussed with investors as a near-term milestone; it depends on Level 3 being real first.

---

## 10. Roadmap Reconciliation

The original five-phase roadmap still holds; here's how it maps onto the six engines, with what's actually done marked.

| Phase | Delivers | Engine(s) | Maturity Level | Status |
|---|---|---|---|---|
| 1 — Foundation | Investigation workflow, Trust Score framework, first case ingestion | Investigation (partial), Risk | 1 | ✅ Done |
| 2 — Intelligence Engine | Entity extraction, OSINT connectors, explainable evidence aggregation, case library | Evidence Graph, Explainability | 2 | ⬜ Not started |
| 3 — AI Agent Ecosystem | Investment/company/website/conversation/psychological agents, orchestration | Investigation, all specialist agents | 2 | 🟡 Five of target six agents shipped |
| 4 — Intelligence Network | Shared intelligence graph, duplicate resolution, pattern matching, community reporting | Evidence Graph, Learning | 3 | ⬜ Not started |
| 5 — Production Platform | Mobile, browser extension, bank/regulator APIs, enterprise dashboard | Report, Learning | 4 | ⬜ Not started |

**Recommended next milestone:** Phase 2 is the honest bottleneck. The Risk Engine (Phase 1) is ahead of the Evidence Graph and Explainability Engines it should be reading from. Before adding more agents (Phase 3) or more report formats (Phase 5), close that gap: ship the `Entity` / `Finding` / `Hypothesis` schema from §7 and move the Risk Engine onto it. Everything demonstrated in the Investigation File 001 prototype becomes real in roughly that order — and Guardian doesn't earn the right to claim Level 2 in a pitch until it does.

---

## 11. Glossary

- **Evidence** — a raw piece of submitted material (message, screenshot, URL, document) after normalization.
- **Entity** — a person, domain, wallet, bank account, or device referenced by the evidence.
- **Observation** — a specific, source-attributed fact an agent extracted from a piece of Evidence.
- **Finding** — an Observation (or set of Observations) elevated to Observed/Inferred/Conclusion status with a risk weight.
- **Hypothesis** — a named explanation ("Pyramid Scheme," "Legitimate Investment Platform") evaluated as supported, rejected, or pending against the Findings.
- **Investigation** — the top-level record tying one user submission to all of its Evidence, Findings, Hypotheses, and the resulting Report.
- **Knowledge Layer** — shared, read-only reference data (patterns, taxonomy, country rules, regulatory data, risk rules, behavior models, OSINT, historical investigations) that every engine reads and only the Learning Engine writes.

Consistent use of these six terms — in code, in this document, and in anything shown externally — is what keeps the prototype, the codebase, and the investor narrative describing the same system.
