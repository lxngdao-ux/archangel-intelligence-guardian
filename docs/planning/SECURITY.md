# Guardian Security

Source of truth: `ARCHITECTURE.md` Design Principle #6 (redaction by default) and Architecture Principle #7 (PII redacted before leaving the platform). This document makes those principles operational.

---

## Threat model, in plain terms

Guardian's core function requires ingesting the exact kind of data a security-conscious product would normally refuse to touch: full names, phone numbers, email addresses, screenshots, and — as has happened in real submitted evidence — plaintext account passwords, sent by a scam recruiter over WhatsApp and forwarded into the platform by a user trying to get help. That's not a hypothetical edge case; it's a realistic shape of what a genuine investigation looks like. The threat model has to start from that fact, not from an idealized version of what evidence "should" contain.

**What Guardian holds, and why each is sensitive:**
- Data-subject PII belonging to people who never consented to Guardian processing their information (the scammer, sometimes a third party mentioned in conversation).
- The submitting user's own PII.
- Third-party credentials that happened to appear in submitted evidence — these must be treated as live secrets, not as inert text, until proven otherwise.
- Financial account details (bank accounts, wallet addresses).
- Evidence of what may be an active crime in progress.

---

## Data classification

| Class | Examples | Handling |
|---|---|---|
| **Raw Evidence** | Original message text, screenshots, files | Highest sensitivity. Access restricted to the owning `Organization`. Never sent to a third-party AI provider unredacted (`PROMPTS.md` rule 3). |
| **Derived Findings** | `Finding`, `Observation` records | Redacted by construction — `Observation.excerpt` is a short quote, not a full message; agent prompts are instructed never to repeat full PII (`PROMPTS.md`). |
| **Reports** | Anything leaving the platform to a bank, regulator, or the user | Must pass a redaction check before generation completes. A report that would display a raw password, ID number, or full third-party phone number should fail to generate, not generate with the field included. |
| **Knowledge Layer** | `KnowledgeEntry` (patterns, taxonomy, rules) | Must be fully de-identified before a validated investigation contributes to it — a pattern like "withdrawal gated by referral count" is safe to retain; the specific phone number involved is not. |

## Redaction pipeline

1. Applies at ingestion (before an agent ever sees the text) for anything sent to an external AI provider.
2. Applies again at report generation, as a second, independent check — defense in depth, not a single point of failure.
3. **Detected credentials (passwords, tokens, API keys found in submitted evidence) are the highest-priority redaction case.** These are not just PII — they are live secrets that could still grant account access to whoever finds them. They should never appear in a `Finding.description`, an `Observation.excerpt`, a generated `Report`, or an application log.
4. Redaction failures fail closed (`API_DESIGN.md` error-handling section) — an unredacted field being detected should block the response, not just get flagged for later.

## Access control

- An `Investigation` and everything under it (`Evidence`, `File`, `Finding`, `Report`) is scoped to the submitting `Organization`. No cross-organization read access, including for internal staff, without an explicit, logged support-access grant.
- `KnowledgeEntry` records are shared across organizations by design (that's the point of the Knowledge Layer) — which is exactly why the de-identification step above is non-negotiable before anything enters it.
- Admin routes (`/api/admin/knowledge/*`, `API_DESIGN.md`) require an elevated role, not just an authenticated session.

## Retention

**Target policy, pending a legal/compliance decision this document doesn't make on its own:** raw Evidence should have a defined retention window after an investigation closes, after which the raw content is deleted while the redacted `Finding`/`Observation` records (which by construction shouldn't contain PII) are retained for the Knowledge Layer and audit purposes. The exact window is a policy decision, not an engineering one — flag it as an open question rather than picking a number here.

## Compliance posture

Guardian's primary jurisdiction today is South Africa — POPIA (the Protection of Personal Information Act) governs how personal information of South African data subjects is processed, and applies regardless of whether the data subject is the paying user or a third party mentioned in submitted evidence (like the recruiter in a scam conversation). As the platform expands beyond South Africa (`ARCHITECTURE.md` Design Principle #7, "Africa first, global by design"), the same redaction-by-default architecture should extend to other jurisdictions' requirements without needing a redesign — that's the point of building it as a platform-wide pipeline rather than a per-feature checklist.

## Vulnerability handling

**Target state (not yet established as process):** a documented path for reporting a security issue, dependency scanning on the Next.js/Prisma stack, and a defined SLA for patching. None of this exists yet as a formal process — this section is a placeholder for that process to be written once there's a maintainer team large enough to operate it, not a claim that it's in place today.
