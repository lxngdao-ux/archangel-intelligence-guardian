# Guardian — System Architecture (v0.1 Foundation)

## 1. What this document is

This is the architectural foundation for Guardian, a Trust Intelligence platform.
It captures the decisions made for the v0.1 codebase: how the system is layered,
how data flows through an investigation, how the AI pipeline is composed of
swappable agents, and what is intentionally stubbed for a later phase.

Read this before touching `src/server/agents/*` — that's where most of the
product's real value will eventually live, and it's built as a plug-in system
on purpose.

## 2. Design goals, in priority order

1. **Explainability over verdicts.** Guardian never outputs "this is a scam."
   It outputs scored signals, evidence, and confidence. The UI and the data
   model both enforce this — there is no `isScam: boolean` anywhere in the schema.
2. **Swap-ability of AI.** Every AI-ish capability (OCR, web intelligence,
   fraud classification, narrative generation) sits behind an interface with
   a rule-based or mock implementation in v0.1, so a real model/provider can be
   dropped in later without touching callers.
3. **One pipeline, six input types.** URL, screenshot, PDF, image, pasted text,
   and WhatsApp message all normalize into the same `Evidence[]` shape before
   they hit the shared analysis pipeline. New input types are new adapters,
   not new pipelines.
4. **Boring, typed, layered code.** Clean Architecture-ish layering so the
   product can grow a queue, a vector store, or a second frontend (mobile,
   browser extension) without a rewrite.

## 3. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients (v0.1: Next.js web app)                                 │
│  Future: Browser Extension · WhatsApp Bot · Telegram Bot ·        │
│          Chrome Plugin · Mobile App · Public API                 │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTPS / JSON
┌───────────────────────────▼───────────────────────────────────────┐
│  API Layer — Next.js Route Handlers (src/app/api/**)              │
│  - Auth (NextAuth: credentials + Google OAuth)                    │
│  - Investigations CRUD + analyze trigger                          │
│  - Upload                                                          │
│  - RBAC middleware (User / Analyst / Administrator)                │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  Application Layer — Investigation Orchestrator                    │
│  (src/server/agents/orchestrator.ts)                                │
│                                                                     │
│   Evidence Collector → Company Intelligence → Fraud Pattern        │
│   Detection → Risk Engine → Explainability Engine → Report          │
│                                                                     │
│  Each stage writes its output to Postgres before the next starts,  │
│  so a failed stage leaves a partial, inspectable trail instead of   │
│  losing work.                                                      │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  Provider Layer — swappable interfaces                             │
│  WhoisProvider · NarrativeGenerator · FraudPatternAnalyzer ·        │
│  StorageService · OCRProvider (interface only, v0.1 unimplemented)  │
│  v0.1 ships rule-based / mock implementations of each.              │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  Data Layer — PostgreSQL via Prisma                                 │
│  Users · Organizations · Subscriptions · Investigations · Evidence  │
│  Files · Reports · Companies · Domains · ScamPatterns · RiskSignals │
│  AIAnalysis · ActivityLogs · Notifications                          │
└─────────────────────────────────────────────────────────────────┘
```

## 4. The investigation pipeline in detail

An `Investigation` moves through a fixed state machine:

```
PENDING → COLLECTING_EVIDENCE → ANALYZING → COMPLETED
                                          ↘ FAILED
```

`InvestigationOrchestrator.run(investigationId)` (see
`src/server/agents/orchestrator.ts`) drives this. Each agent is a class that
implements the shared `InvestigationAgent<TInput, TOutput>` contract in
`src/server/agents/base.agent.ts`:

```ts
interface InvestigationAgent<TInput, TOutput> {
  readonly name: string;
  run(input: TInput, context: AgentContext): Promise<TOutput>;
}
```

This is the seam the whole product is built around: everything the
orchestrator touches is swappable and independently testable.

### Agent 1 — Evidence Collector
Normalizes any of the six input types into a common `Evidence[]` array
(`kind`, `content`, `sourceRef`, `confidence`). v0.1 does *real* work for URL
and text/WhatsApp inputs (live fetch + HTML-to-text extraction, metadata
capture). Screenshot/PDF/Image inputs get a real file record and an
`OCRProvider` interface with a placeholder implementation — the seam is
there, the model isn't wired up yet.

### Agent 2 — Company Intelligence
Looks for entity identity signals in the evidence (registered domain age,
WHOIS registrant privacy, contact page presence, consistency between claimed
company name and domain). v0.1 ships a `MockWhoisProvider`; swapping in
WhoisXML/Clearbit/OpenCorporates later is a one-file change.

### Agent 3 — Fraud Pattern Detection
Rule-based scanner (`FraudPatternAnalyzer` interface, `RuleBasedFraudPatternAnalyzer`
implementation) that scores evidence text against known indicator families:
Ponzi/guaranteed-return language, MLM/recruitment dependency, urgency
tactics, advance-fee requests, romance-scam markers, phishing markers, fake
job indicators. Indicator families are stored as data (`ScamPattern` table),
not hardcoded, so new patterns ship as data, not deploys. The interface has
room for an `AIFraudPatternAnalyzer` that calls an LLM for nuance a rule
engine can't catch.

### Agent 4 — Risk Engine
Pure function over the signals gathered so far. Produces 0–100 scores for
seven categories (Transparency, Identity Verification, Regulatory Evidence,
Reputation, Technical Security, Sustainability, Scam Pattern Match), each
persisted as a `RiskSignal` row, and a weighted overall Trust Score + Risk
Level (`LOW | MODERATE | HIGH | CRITICAL`).

### Agent 5 — Explainability Engine
Converts the structured signals into the plain-language report sections
(summary, positive signals, warning signs, missing information, detailed
findings, recommended actions, confidence level). v0.1 ships a deterministic
template-based `NarrativeGenerator`; the interface has a
`ClaudeNarrativeGenerator` extension point documented inline for when an LLM
call should produce richer prose from the same structured input.

## 5. Why rule-based "v0" agents instead of stubs that return nothing

A foundation that only compiles isn't a foundation you can demo, test
against, or calibrate a real model against later. Every agent in v0.1 either
does real, useful, cheap work (URL fetch, regex/keyword pattern matching,
weighted scoring, templated prose) or clearly marks the seam where a paid
AI/data provider plugs in. Nothing pretends to be smarter than it is — v0.1's
own confidence scoring is deliberately conservative, and the UI always shows
"Guardian's current analysis depth" so upgrading an agent later visibly
improves the product rather than silently changing behavior.

## 6. Multi-tenancy & roles

- `User.role`: `USER | ANALYST | ADMINISTRATOR`.
- `Organization` groups users for the future Team/Enterprise/Government
  portals; a `User` can belong to zero or one `Organization` in v0.1
  (many-to-many membership is a natural follow-up once teams ship).
- `Subscription` hangs off `Organization` (falls back to per-user for
  individual plans).
- RBAC is enforced once, centrally, in `src/server/auth/rbac.ts`, and route
  handlers call `requireRole()` rather than re-implementing checks.

## 7. Where future surfaces attach without a rewrite

| Future surface | Attaches via |
|---|---|
| Browser Extension / Chrome Plugin | Public API layer (`/api/v1/investigations`) — same orchestrator |
| WhatsApp Bot / Telegram Bot | New adapter that turns a chat message into the same `CreateInvestigationInput`, calls the same orchestrator |
| Email Scanner | New adapter (IMAP/Gmail API) → same orchestrator |
| Mobile App | Same API layer; no server changes |
| Enterprise / Government / Business Portals | `Organization` + role checks already model this; new dashboards, not new data model |
| AI Chat Assistant | Reads `Investigation`/`Report` rows; doesn't need pipeline changes |
| Continuous Monitoring / Watchlists | New table + a scheduled job that re-runs the existing orchestrator on a cadence |
| Threat Intelligence Feed / Community Reporting | New ingestion path that writes to `ScamPattern` / `Domain`, which agents already read from |

Nothing above requires touching the agent contracts or the DB core — that's
the point of the seams described in §4.

## 8. Tech stack (v0.1)

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers (Node.js runtime), API-first
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (Credentials + Google OAuth), JWT sessions
- **Storage:** `StorageService` interface — local-disk implementation for
  dev, swappable for S3/GCS/R2 in production via env config
- **Deployment shape:** stateless Next.js app + managed Postgres; ready for
  Vercel, Railway, Fly.io, or containerized deploy (see `docker-compose.yml`
  for local Postgres)

## 9. Explicit non-goals of v0.1

These are named so nobody mistakes an absence for an oversight:

- No background job queue yet — `analyze` runs synchronously in-request.
  Documented as the first scaling change in `ROADMAP.md`.
- No real OCR, WHOIS, or LLM API calls wired in — interfaces exist, mock/rule
  implementations ship.
- No PDF report export yet — the `Report` model and UI are built so this is
  additive.
- No billing integration — `Subscription` model exists, Stripe wiring doesn't.
- No browser extension / bots — architecture reserves the seam (§7), code
  doesn't exist yet.
