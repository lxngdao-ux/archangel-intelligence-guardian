# Guardian API Design

Source of truth: `ARCHITECTURE.md` §8 (Inter-Engine APIs) defines the *internal* module contracts between engines. This document defines the *external* HTTP surface — what a browser, mobile app, or institutional integration actually calls — and maps each route to the internal contract(s) it invokes.

**A note on Current State below:** these sections reflect what's established in prior architecture and product discussions, not a fresh read of the repository — no code was uploaded in this session. Treat "Current State" as a baseline to verify against the actual Next.js route handlers, not as confirmed fact.

---

## Design principles

1. Every route maps to exactly one entry point into the engine chain — a route that needs to call two unrelated engines directly is a sign the Investigation Engine should be orchestrating instead (`ARCHITECTURE.md` Architecture Principle #4).
2. Request/response bodies are validated with Zod schemas that mirror the `AgentInput` / `AgentFinding` / `Finding` shapes in `ARCHITECTURE.md` §5 and §7 — the API layer should not invent its own parallel types.
3. Redaction happens before a response leaves the server, never in the client. A route must not return a raw `Evidence.excerpt` containing unredacted PII, even to an authenticated owner of the investigation.
4. Auth: session-based (NextAuth), scoped to `Organization` — an investigation belongs to the org that submitted it, not just the individual user.

---

## Route surface

### Investigations

| Route | Method | Purpose | Internal contract invoked |
|---|---|---|---|
| `/api/investigations` | `POST` | Submit new evidence, opens an Investigation | `submitEvidence()` → `dispatchAgents()` |
| `/api/investigations` | `GET` | List investigations for the current org | — (direct read) |
| `/api/investigations/:id` | `GET` | Fetch investigation status + summary | `getRiskAssessment()` |
| `/api/investigations/:id/evidence` | `GET` | Fetch the Evidence Ledger for an investigation | `getEvidenceSnapshot()` |
| `/api/investigations/:id/explanation` | `GET` | Fetch evidence chain, hypotheses, outstanding questions | `getExplanation()` |
| `/api/investigations/:id/report` | `POST` | Generate a report in a given format | `generateReport()` |
| `/api/investigations/:id/report/:reportId` | `GET` | Retrieve a previously generated report | — (direct read) |

**Current State:** the submit → score → narrative round trip exists in some form (v0.1's five-agent pipeline is real and callable). The `/evidence` and `/explanation` routes as separate resources **do not exist yet** — they depend on Phase 2 of `ROADMAP.md` (the Evidence Graph and Explainability schema). Until then, whatever explanation data exists today likely returns bundled with the investigation object rather than as its own resource.

**Target State:** the table above. `/explanation` is the route that should return the exact shape a client needs to render the Investigation File 001-style UI (Evidence Ledger, Evidence Chain, Hypotheses, Outstanding Questions) without the client reconstructing it from raw findings.

**Migration path:** ship `/evidence` and `/explanation` as new routes reading from the new Phase 2 tables; do not overload the existing investigation-fetch route with an ever-growing response shape.

### Reports

| Route | Method | Purpose |
|---|---|---|
| `/api/investigations/:id/report?format=user` | `POST` | Plain-language report for the submitting user |
| `/api/investigations/:id/report?format=pdf` | `POST` | PDF export |
| `/api/investigations/:id/report?format=police` | `POST` | Police report package |
| `/api/investigations/:id/report?format=regulator` | `POST` | Regulator submission package |
| `/api/investigations/:id/report?format=bank` | `POST` | Bank dispute package |
| `/api/investigations/:id/report?format=insurance` | `POST` | Insurance evidence package |

**Current State:** `format=user` (web report page) and `format=pdf` (browser print path, demonstrated in the Investigation File 001 prototype) are the only two with any working implementation. The rest are unbuilt — see `ARCHITECTURE.md` §4.5.
**Target State:** all six formats served by one `generateReport()` call, differing only in the template applied to the same underlying `getExplanation()` output — never six separate report-assembly code paths.
**Migration path:** build the template system once `format=pdf` is proven, then add formats one at a time; each new format should be a new template, not new report-generation logic.

### Knowledge Layer (internal/admin)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/knowledge` | `GET` | List `KnowledgeEntry` records by category |
| `/api/admin/knowledge/:id/approve` | `POST` | Human validation step before a Learning Engine update is written |

**Current State:** does not exist. `ScamPattern` is currently edited however seed data is currently edited (not via an API).
**Target State:** an internal-only route surface, not exposed to end users — the validation-step policy question flagged in `ARCHITECTURE.md` §4.6 has to be resolved before this is built, since this route is where that policy gets enforced in code.

### Auth

Handled by NextAuth's default route surface (`/api/auth/*`) — credentials + Google OAuth. No change proposed here; out of scope for this document beyond noting that every route above requires a valid session.

---

## Error handling

- Validation errors (Zod) → `400` with a field-level error list, never a raw stack trace.
- Redaction failures (an evidence field that should have been stripped but wasn't) should fail the request with `500`, not silently return the unredacted field. Silent redaction failure is worse than an obvious error.
- Rate limiting on `/api/investigations` `POST` is a target-state requirement before any public (non-authenticated-partner) submission path is opened — not yet a concern while all traffic is authenticated.

## Versioning

Not yet needed while there are no external integrators. Before Phase 5 (`ROADMAP.md`) opens bank/regulator/insurer API access, introduce `/api/v1/...` prefixing rather than retrofitting versioning onto an API that institutional partners already depend on.
