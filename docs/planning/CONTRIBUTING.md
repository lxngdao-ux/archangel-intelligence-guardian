# Contributing to Guardian

Source of truth: `GUARDIAN_ARCHITECTURE.md`. Read it before your first pull request — specifically §2 (Architecture Principles) and §4 (the six engines). This document is about how to work within that architecture, not a restatement of it.

---

## Stack

Next.js 14 (App Router), TypeScript (strict mode), Tailwind CSS, Prisma, NextAuth. Zod for API-boundary validation (`API_DESIGN.md`). If a contribution introduces a new dependency for something the stack already covers, it needs a stated reason in the PR description.

## Repository structure

Guardian is one Next.js application, not a multi-service or split frontend/backend project. The repository should reflect that:

```
docs/          ← all documentation (this file set, plus GUARDIAN_ARCHITECTURE.md)
src/           ← application code
prisma/        ← schema and migrations
tests/         ← automated tests
scripts/       ← utility scripts
```

**Cleanup this implies, if not already done:**
- `backend/` and `frontend/` — remove. These predate the current single-app structure and aren't needed unless the project actually splits into separate deployable applications, which isn't the current architecture.
- `data/`, `examples/`, `research/` — remove if unused. If any of these hold something genuinely still needed (reference OSINT material for the Knowledge Layer, for instance), give it a real home under `docs/` or `src/` rather than an empty top-level folder with a placeholder file in it.
- `prompts/` — this is the one worth a decision rather than a straight removal. `PROMPTS.md` in `docs/` is the human-readable specification; if agents load prompt templates from a file at runtime rather than inlining them in code, that's a legitimate use for a top-level `prompts/` folder — but it should hold the actual templates the code reads, not sit empty alongside the spec.
- **`docs/architecture.md`, `docs/vision.md`, `docs/roadmap.md`, `docs/README.md`, and the root `README.md`** — these currently describe an earlier version of this project under the name "Archangel Intelligence Guardian" / AAIG, predating the Guardian rename and everything in `GUARDIAN_ARCHITECTURE.md`. Left in place, they actively contradict the current architecture rather than just being outdated — that's a worse state than having no docs at all, since a new contributor or an AI coding assistant has no way to know which one is current. Replace or remove them in the same pass as adopting this document set.

## Before you write code

1. **Does this change belong to an engine?** (`GUARDIAN_ARCHITECTURE.md` §4) If you can't say which of the six engines — or the Knowledge Layer — owns the change, stop and figure that out first. A change that doesn't map cleanly to one is usually a sign it's being built in the wrong place.
2. **Does this change require an architecture update first?** If it adds a new entity, a new inter-engine contract, or a new agent, propose the `GUARDIAN_ARCHITECTURE.md` change in the same PR (or a preceding one) — don't let code and architecture doc drift apart. That drift is the exact failure mode the whole `GUARDIAN_ARCHITECTURE.md` → `ROADMAP.md` → this document chain exists to prevent.
3. **Check `ROADMAP.md`.** If your change is scoped to a phase that hasn't started yet, confirm that's intentional (sometimes it is — small groundwork pieces are fine) rather than accidentally skipping ahead of the phase 2 bottleneck the roadmap identifies.

## Pull request checklist

Map every PR against the nine Architecture Principles (`GUARDIAN_ARCHITECTURE.md` §2) before requesting review:

- [ ] **Traceable to evidence.** Any new AI-generated conclusion in this change can be traced back to a `sourceRef`.
- [ ] **Explainable.** Any new or changed risk score has a corresponding breakdown a user could read and understand.
- [ ] **Single responsibility.** This change doesn't make an engine (or agent) do something outside its stated responsibility in `GUARDIAN_ARCHITECTURE.md` §4 or `AI_AGENTS.md`.
- [ ] **Contract-based communication.** Any new cross-engine call goes through a defined function in `GUARDIAN_ARCHITECTURE.md` §8, not a direct database read across engine boundaries.
- [ ] **No Evidence Graph bypass.** Agents write findings through `recordFindings()`, not directly into Risk- or Report-adjacent tables.
- [ ] **Providers stay swappable.** No new hardcoded dependency on a specific AI provider's API shape outside the existing interface abstractions.
- [ ] **PII redacted before it leaves.** Any new response, log line, or generated document containing evidence content has been checked against `SECURITY.md`.
- [ ] **Reproducible.** The canonical fixture (`TESTING.md`) still produces its documented result, or the PR description explains exactly why it doesn't.
- [ ] **Knowledge Layer boundary respected.** If this touches shared reference data, only the Learning Engine writes to it (`GUARDIAN_ARCHITECTURE.md` §4.7).

A PR that can't honestly check every box should say why in the description, not skip the checklist.

## Definition of done

Use the same status legend as `GUARDIAN_ARCHITECTURE.md`: ✅ Implemented · 🟡 Partially implemented · ⬜ Planned. When your PR changes an engine's status, update the corresponding row in `GUARDIAN_ARCHITECTURE.md` §3 (Platform Capability Matrix) and the relevant `### 4.x` subsection in the same PR — not as a follow-up. Documentation that lags the code by even one PR is how this document set starts drifting from reality, which is the specific problem `GUARDIAN_ARCHITECTURE.md` was written to solve.

## Working with real case data

If a contribution needs a realistic fixture (tests, demos, documentation examples), use the existing redacted Investigation File 001 case (`TESTING.md`) rather than introducing new real evidence. If new real evidence genuinely needs to be added as a fixture, it must be redacted (name, phone, email, password, ID number stripped) *before* it's committed to the repository — not redacted in a follow-up commit, since the unredacted version would then exist permanently in git history.

## Review priorities, in order

1. Does it violate a data-safety commitment (`SECURITY.md`)? Blocking, no exceptions.
2. Does it violate an Architecture Principle? Blocking unless the PR also proposes the corresponding `GUARDIAN_ARCHITECTURE.md` change.
3. Does it match the target contract shape (`AI_AGENTS.md`, `API_DESIGN.md`, `DATA_MODEL.md`) even if the rest of the codebase hasn't caught up yet? Prefer conforming to the target and flagging the gap over matching legacy patterns that are themselves due for migration.
4. Everything else — style, naming, test coverage depth — is normal code review, no different from any other project.
