# ADR 0001 — Evidence Graph Data Semantics

**Status:** Approved for implementation. Three documentation-consistency gaps were found on the first review (missing `EntityReference` schema, ambiguous identity scope, unstated reference invariant) and fixed in §2 and §4; a fourth (`EntityRelationship` had no producer in Phase 2a) was caught independently while fixing those and is addressed in §3. A final wording correction — §5 implied `Finding` had a `status` field it doesn't have — is fixed below. None of the four required an architectural change. `2a.2` may now proceed, implementing exactly `Entity` (+`canonicalKey`), `EntityReference`, `Observation`, `Finding` (+`supersedesId`), `Hypothesis` (+`supersedesId`), and `OutstandingQuestion` — nothing beyond that list.
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

**Scope of this identity key — corrected, this was ambiguous in the first draft:** `Entity.investigationId` is a required field (per `DATA_MODEL.md`), so **Phase 2a entity identity is scoped to a single Investigation.** The normalized natural key prevents duplicate `Entity` rows *within* one investigation — it does not establish a global identity across investigations. Two separate investigations that both reference `example.com` produce two separate `Entity` rows, one per investigation, not one shared row. This is the safer migration: it preserves the current investigation boundary instead of standing up cross-investigation identity resolution as a side effect of a schema migration.

Cross-investigation entity resolution is real, deliberate future work — Phase 4 (`ROADMAP.md`), not Phase 2a. The one piece of forward-compatible groundwork worth doing now, so that future work doesn't require another migration: add `canonicalKey String` to `Entity` in the `2a.2` migration — the same normalized natural key described above, stored but **unused for any matching or deduplication logic in Phase 2a.** It's a column with no behavior attached to it yet, purely so Phase 4 can query `WHERE canonicalKey = ? AND investigationId != ?` against existing data instead of needing a backfill first. This is the only schema field in this ADR that exists ahead of a current consumer, and it's deliberately trivial (a plain string column, no index, no constraint) precisely so it doesn't smuggle in behavior scope creep alongside it.

---

## 3. Initial entity types for Phase 2a — narrower than first proposed

**Decision:** `domain` and `company` only.

This is a correction from earlier in this process, now that the actual agents have been inspected: `CompanyIntelligenceAgent` is the only agent that produces anything entity-shaped today (`Company`, `Domain`, via its existing upsert logic). `FraudPatternDetectionAgent` produces pattern matches and a raw score, not entities. `RiskEngineAgent` produces category scores. Neither has an entity to extract yet. Adding `phone`, `wallet`, `referral_code`, etc. to Phase 2a's initial type set would be building ahead of a producer — defer them until an agent actually emits one.

**Same logic applies to `EntityRelationship`, caught on re-reading rather than flagged in review:** the one relationship Phase 2a's two entity types have (`Domain` belongs to `Company`) is already represented by the existing direct foreign key (`Domain.companyId`) — nothing in this phase's actual scope needs a graph edge to describe it. `EntityRelationship` stays specified as a target model (`GUARDIAN_ARCHITECTURE.md` §7, still the right eventual shape), but **it isn't part of the `2a.2` migration** — there's no producer for it yet either. It gets created in whichever future slice first has an agent that needs to assert a relationship the existing relational schema can't already express (a likely first case: an Identity or Conversation agent asserting `recruited_by` between two `person` entities, which is Phase 3 territory, not Phase 2a).

---

## 4. Company/Domain → Entity relationship

**Decision:** Option B, with explicit indirection — confirmed by the dependency audit (nothing outside `CompanyIntelligenceAgent` and the Prisma relation itself consumes `companyId`/`domainId` directly).

```prisma
model EntityReference {
  id        String  @id @default(cuid())
  entityId  String
  companyId String?
  domainId  String?

  entity  Entity   @relation(fields: [entityId], references: [id])
  company Company? @relation(fields: [companyId], references: [id])
  domain  Domain?  @relation(fields: [domainId], references: [id])

  @@index([entityId])
  @@index([companyId])
  @@index([domainId])
}
```

**Invariant, stated explicitly because Prisma won't enforce it for us:** exactly one of `companyId` / `domainId` is set — never both, never neither. `entityId + companyId` XOR `entityId + domainId`. An `EntityReference` with both set, or neither, is a bug, not a valid "reference to multiple things."

Prisma 5.20's schema DSL doesn't support a `CHECK` constraint here, so this can't be declared in `schema.prisma` itself. Two layers of enforcement instead: **(1) application-level** — the projection step that creates `EntityReference` rows (§4 migration action) validates the XOR before insert, and this is the one that actually runs on every write. **(2) database-level, belt-and-suspenders** — Postgres does support `CHECK` constraints, so the generated migration SQL for this table can be hand-extended with `ALTER TABLE "EntityReference" ADD CONSTRAINT xor_reference CHECK ((("companyId" IS NOT NULL)::int + ("domainId" IS NOT NULL)::int) = 1);` before it's applied. Worth doing since the database is right there and capable of it, but the application check is the one to treat as load-bearing — the SQL constraint is a backstop, not a substitute for validating before insert.

Not a polymorphic foreign key — Prisma doesn't support that cleanly, and nullable `companyId?`/`domainId?` columns on `Entity` itself invite "which one is actually set" bugs. `Company` and `Domain` remain canonical; `Entity` + `EntityReference` is a graph projection over them, not a replacement.

**Migration action implied:** when `CompanyIntelligenceAgent` runs, it continues writing `Company`/`Domain` exactly as it does today, and *additionally* writes an `Entity` (or reuses an existing one, per §2's key) plus an `EntityReference` row pointing at what it just wrote. The existing upsert logic doesn't change; a projection step is added after it.

---

## 5. Immutability

**Decision:** `Evidence` and `Observation` are append-only — created, never updated. `Finding` and `Hypothesis` may evolve as more evidence arrives, but changes are represented by a new row with `supersedesId` rather than mutation in place. `Hypothesis` additionally carries an explicit `status` (`supported` | `rejected` | `pending`); `Finding` does not — deliberately not adding a `Finding.status` field just to make this sentence symmetrical, since nothing in Phase 2a's scope needs one yet.

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
| 2a.2 | Prisma migration | `Entity` (+`canonicalKey`), `EntityReference`, `Observation`, `Finding` (+`supersedesId`), `Hypothesis` (+`supersedesId`), `OutstandingQuestion` — six models. `EntityRelationship` stays specified (`GUARDIAN_ARCHITECTURE.md` §7) but is **not created in this migration** — no producer yet (§3) |
| 2a.3 | Evidence → Entity/Observation | Narrowed to `CompanyIntelligenceAgent`'s output only (§3) |
| 2a.4 | Graph relationships | `Domain.companyId` (existing FK) covers Phase 2a's one relationship; `EntityRelationship` deferred alongside it (§3, §4) |
| 2a.5 | Findings | `RiskEngineAgent`'s existing category scores projected into `Finding` rows (§6) — additive, `RiskEngineAgent` itself unchanged |
| 2a.6 | Wire Risk Engine to graph | **Deferred to 2a.6b**, out of this migration's scope |
| 2a.7 | Regression vs. INV-001 | Unchanged |

This is a smaller Phase 2a than originally described — deliberately. Everything in it is additive to code that currently works; the one genuinely risky step (rewiring `RiskEngineAgent`'s source of truth) has been separated out rather than bundled in, so approval of this ADR doesn't imply approval of that too.

---

**Next step if approved:** `2a.2` — the Prisma migration implementing exactly the models above, no more, no less.
