# Guardian

Trust Intelligence platform — investigate a website, screenshot, PDF, image,
pasted message, or WhatsApp forward, and get back a scored, explainable trust
report. Never a bare "scam / not scam" verdict — always evidence, a 0–100
score across seven categories, and a confidence level.

This is the **v0.1 foundation**: a working, end-to-end pipeline with real
(if intentionally basic) logic everywhere, and clearly-marked seams for the
AI/data providers that make it smarter over time. Read `docs/ARCHITECTURE.md`
before extending the agent pipeline — it explains *why* things are shaped
this way, not just what's there.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, the five-agent
  pipeline, and where future surfaces (browser extension, bots, mobile) attach
- [`docs/API_DESIGN.md`](docs/API_DESIGN.md) — every route, implemented and planned
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased plan from here to a monetized,
  multi-surface product

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma ·
NextAuth.js

## Getting started

**Prerequisites:** Node.js 20+, Docker (for local Postgres), and normal
outbound internet access — `npm install` needs to reach the npm registry and
Prisma's engine CDN, and `next build`/`next dev` fetch Inter and IBM Plex Mono
from Google Fonts on first run.

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Generate a real secret for NEXTAUTH_SECRET, e.g.:
openssl rand -base64 32

# 4. Set up the database
npm run db:migrate
npm run db:seed      # seeds the scam-pattern knowledge base Agent 3 reads from

# 5. Run it
npm run dev
```

Visit `http://localhost:3000`, create an account, and start an investigation.

## What's real vs. what's a placeholder in v0.1

Every agent in the pipeline does genuine, useful work — nothing is a stub
that just returns fake success. But a few things are intentionally simple
until Phase 1 (see `docs/ROADMAP.md`):

| Capability | v0.1 | Phase 1 |
|---|---|---|
| Website evidence | Real fetch + text/title/meta extraction | + JS-rendered pages |
| Screenshot / PDF / image text | File stored, OCR seam in place, not yet extracted | Claude Vision / OCR |
| Domain intelligence | Deterministic mock WHOIS | Real WHOIS/RDAP provider |
| Scam pattern matching | Rule-based keyword scanner over a seeded knowledge base | + LLM-backed analyzer alongside it |
| Report narrative | Deterministic template | LLM-generated prose over the same structured data |
| `/analyze` | Synchronous (runs in-request) | Background queue |

None of this is hidden — the report itself tells you what evidence was and
wasn't available, and `docs/ARCHITECTURE.md` §9 spells out every non-goal
explicitly.

## Project layout

```
prisma/schema.prisma        14 core entities + NextAuth tables (see docs/ARCHITECTURE.md §3)
src/server/agents/          The five-agent pipeline + orchestrator + swappable providers
src/server/auth/            NextAuth config + centralized RBAC (requireRole)
src/server/storage/         StorageService interface (local disk in dev)
src/app/api/                Route handlers — see docs/API_DESIGN.md
src/app/(app)/              Authenticated pages (dashboard, investigation flow, history, account, settings, admin)
src/components/             layout/ investigation/ report/ common/
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the scam-pattern knowledge base |
| `npm run db:studio` | Prisma Studio (inspect data visually) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next's ESLint config |
