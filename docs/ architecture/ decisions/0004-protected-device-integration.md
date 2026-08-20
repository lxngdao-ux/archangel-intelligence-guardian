# ADR 0004 — Protected Device Integration with the Trust Intelligence Architecture

**Status:** Proposed. Answers the structural question and five of the nine sub-questions with reasoned recommendations; four are marked genuinely open and left for explicit product decision rather than resolved here (§8). No schema change, no code, no migration. Depends on ADR 0002 (approved) and ADR 0003 (proposed, unimplemented) — this document doesn't touch either.
**The question this answers:** not "where does `ProtectedDevice` live" (ADR 0002 settled that), but *what happens when a protected device produces something that looks like a scam signal* — does Guardian's existing Trust Intelligence pipeline handle it, or does Angel Watch become a second fraud-detection system running beside it.

---

## 1. Reuse the six engines, don't fork them

**Decision: Protected Device monitoring is a new Intake source, not a new pipeline.**

`GUARDIAN_ARCHITECTURE.md`'s own Intake Engine is already specified to cover "website, phone, email, screenshots, messages, images, documents, links, names, bank accounts" (§6) — a protected device's risk signal (a suspicious link opened, a message matching a known pattern) is the same *kind* of thing as a submitted WhatsApp export, differing only in how it arrives. Standing up a second, parallel risk-detection system for Angel Watch would mean maintaining two fraud-pattern libraries, two explainability models, two report formats — the exact "six more copies of the same drift" problem `GUARDIAN_ARCHITECTURE.md` §4.7 already named for the Knowledge Layer, recurring at the product-architecture level instead of the schema level.

**What this does not decide:** whether every signal becomes a full `Investigation`. That's §2.

```
Protected Device  →  Consent Gate  →  Intake (new source type)  →  [ existing pipeline, unchanged ]
```

---

## 2. Angel Watch produces an Alert, not an Investigation — Archangel can escalate one

**Decision, answering two of the nine questions at once:** a new, lightweight `Alert` concept sits in front of `Investigation`, not on top of it.

Reasoning: an `Investigation` in the current model is a substantial object — Evidence, an Evidence Graph, Findings, Hypotheses, a Report. Creating one automatically for every message a protected device receives would be disproportionate to what most of those messages are (nothing), and itself a privacy problem — it means building a persistent, detailed evidence record about a person's ordinary messages by default, which is in tension with the governing principle from ADR 0002 regardless of consent status. An `Alert` is the minimal object: one risk signal, one redacted excerpt (§3), a severity, and a state (`open | dismissed | escalated`).

- **Angel Watch** produces `Alert`s only. It does not create an `Investigation` automatically, matching its own definition in ADR 0002 §8 ("helps the protected person make safer decisions," not "silently builds a case file about them").
- **Archangel escalates.** An `Alert` becomes a full `Investigation` either when the protected person or guardian explicitly chooses to ("investigate this further" — a real action, logged, consent-checked) or when a signal falls into a category the `ProtectionRelationship.protectionScope` (ADR 0002 §2) has *explicitly* pre-authorized for automatic escalation. Not "Archangel means more automatic surveillance" — Archangel means a *wider, explicitly named* set of categories are allowed to cross that line automatically, everything else still requires a human decision to escalate.

This is the mechanism behind ADR 0002 §8's "Archangel never means unrestricted access": the boundary isn't the mode name, it's the named category list in `protectionScope`, auditable the same way everything else in this system is.

---

## 3. Evidence stays minimal by construction, not by discipline

**Decision:** a device-originated `Observation` follows the exact rule already in `DATA_MODEL.md` — `excerpt` is a short, redacted quote, never a full message. This isn't a new redaction policy invented for this ADR; it's the existing one applied to a new evidence source. What's new: for device-originated evidence specifically, the *collection* step itself should only ever capture the minimal excerpt, not capture-then-redact. `SECURITY.md`'s redaction pipeline already makes this distinction for AI-provider calls ("redact before the prompt, not after") — the same logic extends here: nothing beyond what's needed to explain the `Alert` should ever be captured off the device in the first place. This directly answers the false-positive question in §8's list: dismissing a false-positive `Alert` never involved collecting more than the minimal excerpt to begin with, so there's no larger data footprint to clean up afterward.

---

## 4. Target `Finding`, not `RiskSignal`

**Decision:** device-originated signals that do escalate into an `Investigation` produce `Finding` rows (ADR 0001's model), not `RiskSignal` rows. `RiskSignal` is the legacy shape ADR 0001 is already migrating away from for the core investigation pipeline (`DATA_MODEL.md`, Migration Path). Building new functionality against the model already earmarked for replacement would create a second thing to migrate later. Consistent, not a new decision — just applying ADR 0001's existing direction to a new evidence source.

---

## 5. Consent gates collection, not just disclosure — and travels with the evidence

**Decision, two parts:**

**Gate:** `ProtectionRelationship.protectionScope` (ADR 0002 §2) determines what categories of signal are eligible to be observed *at all* — checked before an `Observation` is created, not after, as a filter on collection rather than a permission check on already-collected data. This is what makes "Guardian protects people, not secretly from people" a structural property instead of a promise: if a category isn't in scope, Guardian has no mechanism to have collected it, not merely an instruction not to look.

**Travels with it:** every `Alert` and every device-originated `Observation` carries a reference to the `ConsentRecord` (ADR 0002 §2) that was active when it was collected — not the current consent state, the state *at the time*. This is the same append-only reproducibility argument already used for `Evidence`/`Observation` (ADR 0001 §5) and for consent itself (ADR 0002 §2): if consent scope changes or is revoked later, historical evidence should still show what was actually authorized when it was collected, not silently inherit whatever the current state happens to be.

---

## 6. What this ADR does not decide

Not vague hesitation — these are specific, separable decisions this document isn't the right place to make:

- **Exact risk thresholds** for what counts as "high-confidence" enough to appear in an Archangel auto-escalation category. Product/policy judgment, not architecture.
- **The actual list of auto-escalation categories** available to be pre-authorized. Same reason.
- **Alert notification design** — how/when a protected person and guardian are actually told about an `Alert`. UX, not data-flow.
- **Whether `Alert` needs its own model now or can be represented as a minimally-scoped `Finding` with no `Investigation` parent.** A real schema question, deliberately deferred to whichever migration-plan ADR follows this one — this document establishes that the *concept* exists and where it sits in the pipeline, not its field-level shape. Doing that now would repeat the exact mistake ADR 0001 avoided: designing a model before its first real consumer is concretely scoped.

---

**Next step if approved:** none of §§1–5 gets implemented from this document alone. A migration-plan ADR (following the same shape as ADR 0003) would be needed to actually shape `Alert` and wire Intake — that's a future step, not this one.
