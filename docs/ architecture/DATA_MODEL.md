# Guardian Data Model

Source of truth: `GUARDIAN_ARCHITECTURE.md` §7 defines the new entities required by the Evidence Graph and Explainability Engines. This document is the fuller reference — relationships, purpose, and migration path — for the complete schema, existing and new.

**A note on Current State below:** the *new* entities in this document are specified in full here and in `GUARDIAN_ARCHITECTURE.md` — they're authoritative. The *existing* v0.1 entities are known by name from prior product discussions, but their exact field-level definitions were not re-verified against `prisma/schema.prisma` in this session. Where a field is listed below for an existing entity, treat it as a reasonable inference from the entity's stated purpose, not a confirmed column — check the actual schema file before relying on it.

---

## Existing v0.1 entities (purpose-level, fields not verified)

| Entity | Purpose | Likely relationships |
|---|---|---|
| `User` | An individual account holder | belongs to `Organization`; owns `Investigation`s |
| `Organization` | The billing/access boundary investigations are scoped to | has many `User`, `Subscription`, `Investigation` |
| `Subscription` | Billing plan and status | belongs to `Organization` |
| `Investigation` | The top-level case record | has many `Evidence`, `File`, `Report`, `RiskSignal`, `AIAnalysis` |
| `Evidence` | A submitted piece of material (message, URL, text) before/after normalization | belongs to `Investigation`; source for `Observation` (new) |
| `File` | An uploaded artifact (screenshot, document, export) | belongs to `Investigation` |
| `Report` | A generated output for a given investigation and format | belongs to `Investigation` |
| `Company` | A known or investigated business entity | referenced by `Investigation`, populated via `WhoisProvider` |
| `Domain` | A known or investigated web domain | referenced by `Investigation`, populated via `WhoisProvider` |
| `ScamPattern` | A seeded fraud-pattern definition used by the keyword scanner | read by Fraud Pattern Detection agent — **migrates into `KnowledgeEntry`, see below** |
| `RiskSignal` | An individual signal contributing to a risk score | belongs to `Investigation`; precursor to the new `Finding` model |
| `AIAnalysis` | Stored output from an AI/agent call | belongs to `Investigation` |
| `ActivityLog` | Audit trail of actions taken on an investigation | belongs to `Investigation` and/or `User` |
| `Notification` | User-facing notification records | belongs to `User` |
| NextAuth adapter tables | `Account`, `Session`, `VerificationToken`, etc. | standard NextAuth Prisma adapter shape |

**Relationship to the new model below:** `RiskSignal` and `AIAnalysis` are the closest existing analogues to the new `Finding` and `Observation` models. They are not being deleted — see Migration Path.

---

## New entities (Evidence Graph + Explainability Engines)

These are specified in full in `GUARDIAN_ARCHITECTURE.md` §7 and reproduced here for completeness. Treat `GUARDIAN_ARCHITECTURE.md` as authoritative if this ever drifts from it.

```prisma
model Entity {
  id              String   @id @default(cuid())
  investigationId String
  type            String   // "person" | "domain" | "wallet" | "bank_account" | "device" | ...
  label           String   // display label; redacted if it's a data-subject PII field
  attributes      Json
  createdAt       DateTime @default(now())
}

model EntityRelationship {
  id           String  @id @default(cuid())
  fromEntityId String
  toEntityId   String
  relationType String  // "recruited_by" | "registered_on" | "paid_to" | ...
  evidenceId   String?
}

model Observation {
  id              String   @id @default(cuid())
  investigationId String
  evidenceId      String
  agentName       String
  type            String
  description     String
  timestamp       DateTime?
  excerpt         String?  // short, redacted quote — never a full message
}

model Finding {
  id              String   @id @default(cuid())
  investigationId String
  confidenceType  String   // "observed" | "inferred" | "conclusion"
  weight          String   // "low" | "medium" | "high" | "critical"
  description     String
  riskDelta       Int?
  observationIds  String[]
}

model Hypothesis {
  id                    String   @id @default(cuid())
  investigationId       String
  label                 String
  status                String   // "supported" | "rejected" | "pending"
  supportingFindingIds  String[]
  reasoning             String
}

model OutstandingQuestion {
  id              String  @id @default(cuid())
  investigationId String
  question        String
  resolvedAt      DateTime?
}

model KnowledgeEntry {
  id                     String   @id @default(cuid())
  category               String   // "pattern_library" | "fraud_taxonomy" | "country_rule" |
                                   // "regulatory_data" | "risk_rule" | "behavior_model" |
                                   // "osint" | "historical_investigation"
  key                    String
  data                   Json
  sourceInvestigationIds String[]
  updatedAt              DateTime @updatedAt
}
```

## Entity-relationship notes

- `Entity` and `EntityRelationship` together form the Evidence Graph — a general-purpose graph, not a fixed set of foreign keys per entity type. This is deliberate: adding a new entity type (e.g. "cryptocurrency wallet") should never require a schema migration, only a new `type` value.
- `Observation.excerpt` is capped to a short quote by convention, not by database constraint — enforce the redaction/length rule at the application layer (agent output validation), not just by trusting callers.
- `Finding.observationIds` and `Hypothesis.supportingFindingIds` are string arrays rather than join tables for v1 simplicity. If query patterns on these relationships get complex (e.g. "find all Findings supporting more than one Hypothesis"), revisit as proper join tables — don't prematurely normalize before that need is real.
- `Finding.riskDelta` is denominated in **risk** terms — positive means the finding made things look more dangerous. This is the opposite direction from the shipped `Report.trustScore` (higher = more trustworthy). The two are not the same field renamed; `riskScore = 100 - trustScore` is a display-layer conversion applied where risk-direction framing is needed, never stored. See `docs/decisions/0001-evidence-graph-data-semantics.md` for the full reasoning — this was a real collision between shipped code and the documented architecture, caught by inspecting the actual `RiskEngineAgent`, not something either could have been assumed correct in isolation.

## Migration path

1. Add the new models via Prisma migration — purely additive, no existing table altered. Per ADR 0001, Phase 2a's actual set is `Entity`, `EntityReference`, `Observation`, `Finding` (+`supersedesId`), `Hypothesis` (+`supersedesId`), `OutstandingQuestion` — six models plus one join table, not seven flat models as originally sketched.
2. `CompanyIntelligenceAgent` additionally projects its existing `Company`/`Domain` output into an `Entity` + `EntityReference` pair after its current upsert logic runs. The upsert logic itself doesn't change.
3. `RiskEngineAgent` additionally projects its existing category scores into `Finding` rows (risk-direction, per the note above) after it runs. **`RiskEngineAgent`'s own inputs are not changed in this phase** — reading from the Evidence Graph instead of its current direct inputs is real behavior change to working code, deliberately deferred to a follow-up slice (ADR 0001 calls it `2a.6b`) rather than bundled into the initial migration.
4. Backfill: write a one-time script that reads existing `RiskSignal` and `AIAnalysis` rows for closed investigations and creates corresponding `Finding` / `Observation` rows, so historical investigations aren't orphaned from the new explainability UI.
5. Migrate `ScamPattern` rows into `KnowledgeEntry` with `category: "pattern_library"`. Keep the `ScamPattern` table in place, read-only, until every consumer has moved to `getKnowledge()` — then drop it in a separate migration, not the same one.
6. Do not delete `RiskSignal` or `AIAnalysis` in this migration. They may become redundant once `Finding`/`Observation` are fully adopted, but that's a follow-up cleanup migration once nothing reads them anymore, not a day-one deletion.
