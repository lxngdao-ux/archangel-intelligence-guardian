# ADR 0001 — Evidence Graph Data Semantics

**Status:** Proposed — awaiting approval before `2a.2` (Prisma migration) begins.
**Scope:** Phase 2a only (`ROADMAP.md`). Answers the semantics questions raised for `Entity`, `Observation`, `Finding`, `Hypothesis`, `EntityRelationship`, and the trust/risk score reconciliation. No code has been written against this yet.

This is a decision record, not a restatement of the architecture. Field shapes remain as specified in `GUARDIAN_ARCHITECTURE.md` §7 / `DATA_MODEL.md`; what follows is how those fields behave and why.

---

## 1. Trust score vs. risk score — RESOLVED

**Decision:** `Report.trustScore` stays exactly as shipped (0–100, higher = more trustworthy) — no change to `RiskEngineAgent`. Anywhere risk-direction framing is needed (the Explainability Engine, generated Reports, the Investigation File demos), compute `riskScore = 100 - trustScore` at that boundary, as a derived display value. It is never stored.

**Consequence for `Finding.riskDelta`:** denominated in **risk** terms — positive `riskDelta` means the finding made the situation look *more* dangerous, matching every "Why 94?" breakdown already written. When a `Finding` is projected back toward `Report.trustScore` (§6 below), the sign flips at that boundary, not before.

**Still open, not this ADR's call:** whether user-facing product copy actually says "Trust Score" or "Risk Score." That's a product/copy decision, independent of this internal convention, and doesn't block the migration either way.

---

## 2. Canonical identity key

**Decision:** identity is `type` + a normalized natural key, per type:
- `domain` — lowercased, no protocol, no path, no `www.` prefix (matches the normalization `CompanyIntelligenceAgent` already does before its `Domain.domain` lookup — reuse that logic, don't reimplement it).
- `company` — no reliable natural key exists yet (names collide, registration numbers aren't consistently captured). Phase 2a does **not** attempt company-identity matching beyond what `Company.id` already provides; two `Company` rows are two companies, full stop, until a real registration-number or jurisdiction-based key exists.
- `person` — explicitly **not** auto-deduplicated on name. Two `person` entities only merge on a stronger identifier (phone, email hash) if and when that entity type is introduced. This is a deliberate restriction, not a gap: name-based identity matching is exactly the kind of feature that turns a redaction-conscious platform into a surveillance tool by accident.

---

## 3. Initial entity types for Phase 2a — narrower than first proposed

**Decision:** `domain` and `company` only.

This is a correction from earlier in this process, now that the actual agents have been inspected: `CompanyIntelligenceAgent` is the only agent that produces anything entity-shaped today (`Company`, `Domain`, via its existing upsert logic). `FraudPatternDetectionAgent` produces pattern matches and a raw score, not entities. `RiskEngineAgent` produces category scores. Neither has an entity to extract yet. Adding `phone`, `wallet`, `referral_code`, etc. to Phase 2a's initial type set would be building ahead of a producer — defer them until an agent actually emits one.

---

## 4. Company/Domain → Entity relationship

**Decision:** Option B, with explicit indirection — confirmed by the dependency audit (nothing outside `CompanyIntelligenceAgent` and the Prisma relation itself consumes `companyId`/`domainId` directly).

```prisma
model EntityReference {
  id        String  @id @default(cuid())
  entityId  String
  companyId String?
  domainId  String?
}
```

Not a polymorphic foreign key — Prisma doesn't support that cleanly, and nullable `companyId?`/`domainId?` columns on `Entity` itself invite "which one is actually set" bugs. `Company` and `Domain` remain canonical; `Entity` + `EntityReference` is a graph projection over them, not a replacement.

**Migration action implied:** when `CompanyIntelligenceAgent` runs, it continues writing `Company`/`Domain` exactly as it does today, and *additionally* writes an `Entity` (or reuses an existing one, per §2's key) plus an `EntityReference` row pointing at what it just wrote. The existing upsert logic doesn't change; a projection step is added after it.

---

## 5. Immutability

**Decision:** `Evidence` and `Observation` are append-only — created, never updated. `Finding` and `Hypothesis` may change status as more evidence arrives, but a status change creates a new row with a `supersedesId` pointing at the row it replaces, rather than an `UPDATE` in place.

This is what makes Architecture Principle #8 (every investigation is reproducible) actually checkable rather than aspirational: the system's belief state at any point in time can be reconstructed by filtering out superseded rows, not just trusted to have been true.

`supersedesId String?` is added to both `Finding` and `Hypothesis` in the migration — this is a small addition to the shapes already specified in `GUARDIAN_ARCHITECTURE.md` §7, not a contradiction of them.

---

## 6. What Risk Engine consumes — deferred, not decided as originally scoped

The original Phase 2a plan (`ROADMAP.md` 2a.5 / the second inspection report's `2a.6`) described "wire the Risk Engine to graph-derived findings" as part of this phase. Having now read `RiskEngineAgent` directly: it's a small, working, well-tested-by-inspection unit that reads `companyIntel` and `fraudDetection` results directly. Rewiring its input source is a real behavior change to code that currently works — a different risk category than everything else in this ADR, which has all been additive.

**Revised decision for Phase 2a:** don't rewire `RiskEngineAgent`'s inputs yet. Instead, add a projection step *after* it runs: translate its existing `RiskCategoryScore[]` output into `Finding` rows (one per category, `riskDelta` computed via §1's conversion), purely so the Explainability Engine and the case-library UI have real `Finding` data to render. `RiskEngineAgent` keeps reading what it reads today.

**Actually rewiring the Risk Engine's source of truth to the Evidence Graph** — so `Finding` rows become the input rather than the output — is real, riskier work. Propose treating that as its own follow-up slice (call it `2a.6b`) once the projection direction has been running safely for a while, not bundled into the initial migration.

---

## Net effect on the `ROADMAP.md` 2a sequence

| Step | As originally scoped | As this ADR revises it |
|---|---|---|
| 2a.1 | Data semantics | This document |
| 2a.2 | Prisma migration | Unchanged — adds `Entity`, `EntityReference`, `Observation`, `Finding` (+`supersedesId`), `Hypothesis` (+`supersedesId`), `OutstandingQuestion` |
| 2a.3 | Evidence → Entity/Observation | Narrowed to `CompanyIntelligenceAgent`'s output only (§3) |
| 2a.4 | Graph relationships | `EntityReference`, not polymorphic FK (§4) |
| 2a.5 | Findings | `RiskEngineAgent`'s existing category scores projected into `Finding` rows (§6) — additive, `RiskEngineAgent` itself unchanged |
| 2a.6 | Wire Risk Engine to graph | **Deferred to 2a.6b**, out of this migration's scope |
| 2a.7 | Regression vs. INV-001 | Unchanged |

This is a smaller Phase 2a than originally described — deliberately. Everything in it is additive to code that currently works; the one genuinely risky step (rewiring `RiskEngineAgent`'s source of truth) has been separated out rather than bundled in, so approval of this ADR doesn't imply approval of that too.

---

**Next step if approved:** `2a.2` — the Prisma migration implementing exactly the models above, no more, no less.
