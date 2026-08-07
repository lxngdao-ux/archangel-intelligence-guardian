# Guardian Roadmap

Source of truth: `GUARDIAN_ARCHITECTURE.md`. This document expands §10 (Roadmap Reconciliation) into concrete milestones and exit criteria. If a milestone here can't be traced to an engine in `GUARDIAN_ARCHITECTURE.md` §4, it doesn't belong in this roadmap yet — extend the architecture first.

**Status legend:** ✅ Done · 🟡 In progress · ⬜ Not started

---

## Phase 1 — Foundation — ✅ Done

**Delivered:** Investigation workflow, Trust Score framework, first case ingestion (text/URL), the five-agent pipeline, Prisma schema (14 entities), NextAuth (credentials + Google OAuth).
**Engines touched:** Investigation (partial), Risk (complete).
**Exit criteria (met):** A user can submit a URL or pasted text and receive a 0–100 trust score with a plain-language explanation.

---

## Phase 2 — Intelligence Engine — ⬜ Not started

This is the current bottleneck (`GUARDIAN_ARCHITECTURE.md` §10). The Risk Engine is ahead of the Evidence Graph and Explainability Engines it should be reading from. Phase 2 closes that gap before Phase 3 or Phase 5 gets more investment.

**2a — Evidence Graph schema migration**
- Ship `Entity`, `EntityRelationship`, `Observation` (`GUARDIAN_ARCHITECTURE.md` §7).
- Migrate the Risk Engine to read from `getEvidenceSnapshot()` (`GUARDIAN_ARCHITECTURE.md` §8) instead of the fraud-pattern scanner directly.
- Exit criteria: querying "everything connected to this phone number" returns a real result, not a manual join across `Company`/`Domain`.

**2b — Explainability upgrade**
- Ship `Finding`, `Hypothesis`, `OutstandingQuestion` (`GUARDIAN_ARCHITECTURE.md` §7).
- Replace narrative-only output with the Observed/Inferred/Conclusion taxonomy, evidence-weight labels, and a real "Why N?" breakdown.
- Exit criteria: a generated report can answer "why did this score reach N?" by listing weighted contributors that sum to N, not by asserting a number.

**2c — Case Library UI**
- Wire the Investigation File 001 prototype's presentation layer to real data from 2a/2b instead of hardcoded case content.
- Exit criteria: a second, real investigation can be submitted and rendered in the same UI without editing the UI's code.

**Engines touched:** Evidence Graph (new), Explainability (upgraded).

---

## Phase 3 — AI Agent Ecosystem — 🟡 In progress (five of six agents shipped)

- Resolve the naming reconciliation from `GUARDIAN_ARCHITECTURE.md` §5: adopt **relabel-as-roadmap** (recommended) unless a conscious decision is made to rename shipped agents instead.
- Add the Identity agent (KYC order, credential handling — currently uncovered).
- Split Fraud Pattern Detection into Behaviour + Financial agent responsibilities, per the target agent set.
- Exit criteria: all six target agent responsibilities (`GUARDIAN_ARCHITECTURE.md` §5) are covered by a named, testable agent — whether that's five agents with clear dual responsibilities or six agents 1:1, that decision should be recorded here once made.

**Engines touched:** Investigation (orchestration), all specialist agents.

---

## Phase 4 — Intelligence Network — ⬜ Not started

- Shared intelligence graph across investigations (depends on Phase 2a).
- Duplicate/entity resolution (same phone number or domain appearing across separate investigations).
- Pattern matching against the Knowledge Layer (`GUARDIAN_ARCHITECTURE.md` §4.7).
- Community reporting intake.
- Exit criteria: submitting a second case that shares an entity with Case 001 (e.g. the same referral domain) surfaces that connection automatically.

**Engines touched:** Evidence Graph, Learning, Knowledge Layer.

---

## Phase 5 — Production Platform — ⬜ Not started

- Mobile app, browser extension.
- Bank / regulator / insurer API integrations (`generateReport()` format targets from `GUARDIAN_ARCHITECTURE.md` §8 actually implemented, not just typed).
- Enterprise dashboard.
- Exit criteria: an external institution can call the Report Engine's API and receive a package formatted for their use case without a human assembling it manually.

**Engines touched:** Report, Learning.

---

## Non-goals (explicitly deferred, not forgotten)

- Real-time intervention (Maturity Model Level 4, `GUARDIAN_ARCHITECTURE.md` §9) — not attempted before Level 3 is real.
- Automated Learning Engine writes without human validation — the validation-step policy question in `GUARDIAN_ARCHITECTURE.md` §4.6 has to be resolved first.
- Renaming shipped agents purely for pitch-deck naming consistency (`GUARDIAN_ARCHITECTURE.md` §5) — explicitly rejected, not deferred.

## Milestone tracking

Each milestone above should become a tracked issue referencing this document and the `GUARDIAN_ARCHITECTURE.md` section it implements. When a milestone ships, update its status here **and** update the corresponding row in `GUARDIAN_ARCHITECTURE.md` §3 (Platform Capability Matrix) and §4 (engine status) in the same pull request — a roadmap update that doesn't update the architecture doc's status markers has reintroduced the drift this whole document set exists to prevent.
