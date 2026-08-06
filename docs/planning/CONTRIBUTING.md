# Contributing to Guardian

Source of truth: `ARCHITECTURE.md`. Read it before your first pull request — specifically §2 (Architecture Principles) and §4 (the six engines). This document is about how to work within that architecture, not a restatement of it.

---

## Stack

Next.js 14 (App Router), TypeScript (strict mode), Tailwind CSS, Prisma, NextAuth. Zod for API-boundary validation (`API_DESIGN.md`). If a contribution introduces a new dependency for something the stack already covers, it needs a stated reason in the PR description.

## Before you write code

1. **Does this change belong to an engine?** (`ARCHITECTURE.md` §4) If you can't say which of the six engines — or the Knowledge Layer — owns the change, stop and figure that out first. A change that doesn't map cleanly to one is usually a sign it's being built in the wrong place.
2. **Does this change require an architecture update first?** If it adds a new entity, a new inter-engine contract, or a new agent, propose the `ARCHITECTURE.md` change in the same PR (or a preceding one) — don't let code and architecture doc drift apart. That drift is the exact failure mode the whole `ARCHITECTURE.md` → `ROADMAP.md` → this document chain exists to prevent.
3. **Check `ROADMAP.md`.** If your change is scoped to a phase that hasn't started yet, confirm that's intentional (sometimes it is — small groundwork pieces are fine) rather than accidentally skipping ahead of the phase 2 bottleneck the roadmap identifies.

## Pull request checklist

Map every PR against the nine Architecture Principles (`ARCHITECTURE.md` §2) before requesting review:

- [ ] **Traceable to evidence.** Any new AI-generated conclusion in this change can be traced back to a `sourceRef`.
- [ ] **Explainable.** Any new or changed risk score has a corresponding breakdown a user could read and understand.
- [ ] **Single responsibility.** This change doesn't make an engine (or agent) do something outside its stated responsibility in `ARCHITECTURE.md` §4 or `AI_AGENTS.md`.
- [ ] **Contract-based communication.** Any new cross-engine call goes through a defined function in `ARCHITECTURE.md` §8, not a direct database read across engine boundaries.
- [ ] **No Evidence Graph bypass.** Agents write findings through `recordFindings()`, not directly into Risk- or Report-adjacent tables.
- [ ] **Providers stay swappable.** No new hardcoded dependency on a specific AI provider's API shape outside the existing interface abstractions.
- [ ] **PII redacted before it leaves.** Any new response, log line, or generated document containing evidence content has been checked against `SECURITY.md`.
- [ ] **Reproducible.** The canonical fixture (`TESTING.md`) still produces its documented result, or the PR description explains exactly why it doesn't.
- [ ] **Knowledge Layer boundary respected.** If this touches shared reference data, only the Learning Engine writes to it (`ARCHITECTURE.md` §4.7).

A PR that can't honestly check every box should say why in the description, not skip the checklist.

## Definition of done

Use the same status legend as `ARCHITECTURE.md`: ✅ Implemented · 🟡 Partially implemented · ⬜ Planned. When your PR changes an engine's status, update the corresponding row in `ARCHITECTURE.md` §3 (Platform Capability Matrix) and the relevant `### 4.x` subsection in the same PR — not as a follow-up. Documentation that lags the code by even one PR is how this document set starts drifting from reality, which is the specific problem `ARCHITECTURE.md` was written to solve.

## Working with real case data

If a contribution needs a realistic fixture (tests, demos, documentation examples), use the existing redacted Investigation File 001 case (`TESTING.md`) rather than introducing new real evidence. If new real evidence genuinely needs to be added as a fixture, it must be redacted (name, phone, email, password, ID number stripped) *before* it's committed to the repository — not redacted in a follow-up commit, since the unredacted version would then exist permanently in git history.

## Review priorities, in order

1. Does it violate a data-safety commitment (`SECURITY.md`)? Blocking, no exceptions.
2. Does it violate an Architecture Principle? Blocking unless the PR also proposes the corresponding `ARCHITECTURE.md` change.
3. Does it match the target contract shape (`AI_AGENTS.md`, `API_DESIGN.md`, `DATA_MODEL.md`) even if the rest of the codebase hasn't caught up yet? Prefer conforming to the target and flagging the gap over matching legacy patterns that are themselves due for migration.
4. Everything else — style, naming, test coverage depth — is normal code review, no different from any other project.
