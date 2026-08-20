# ADR 0002 — Protected Person Consent & Authorization Model

**Status:** Approved. Q1–Q3 (§6) are locked with explicit decisions. `linkedUserId` stays nullable per Q1's resolution. This ADR does not by itself authorize implementing anything — see §4, unchanged.
**Scope:** The data model underneath any future "protect another person's device" feature. Does not authorize building device monitoring, alerts, or the CRUD layer — those remain blocked pending a migration plan (ADR 0003) and, separately, the actual monitoring features remain blocked by the existing "do not build yet" list (SMS/WhatsApp/call interception, credential collection, remote control).
**Governing principle:** *Guardian protects people, not secretly from people.* Every decision below is checked against this before anything else.

---

## 1. The conflict with the current schema

`ProtectedDevice.userId` points directly at `User` — whoever creates the record owns it, full stop. There is no entity representing the protected person as a subject with their own standing, consent, or visibility; only a device with a free-text `name` field describing them. Consent, revocation, and transparency can't attach to a string. That's not a missing feature, it's a missing concept, and it has to exist before any endpoint reads or writes `ProtectedDevice` on another person's behalf.

**Constraint on the fix:** the migration adding `ProtectionMode`/`DeviceStatus`/`ProtectedDevice` is already applied (commit `4b8fada`). This ADR does not revert or restructure it. Anything proposed below is additive to what's already shipped, following the same discipline ADR 0001 used for `Company`/`Domain` — reference the existing canonical model, don't replace it out from under working code.

---

## 2. Proposed model

```
User (guardian account)
      │
      │ ProtectionRelationship  (authorization + consent + scope)
      ▼
ProtectedPerson  (the human being protected — first-class, not a device label)
      │
      ├── Device, Device, Device...
      │
      └── ConsentRecord, ConsentRecord...  (append-only history)
```

### `ProtectedPerson`
```prisma
model ProtectedPerson {
  id             String   @id @default(cuid())
  subjectType    String   // "adult" | "minor" | "organization_managed"
  linkedUserId   String?  // set only if/when this person has their own Guardian login — §6, Q1
  displayName    String   // redacted per SECURITY.md if it carries data-subject PII
  contactChannel Json?    // used ONLY for independent verification/notifications — never proxied
                           // through the primary account (this is what makes revocation real)
  createdAt      DateTime @default(now())
}
```

### `ProtectionRelationship`
```prisma
model ProtectionRelationship {
  id                  String   @id @default(cuid())
  guardianUserId      String   // the User @relation, i.e. the primary account
  protectedPersonId   String   // the ProtectedPerson @relation
  organizationId      String?  // reuses the existing Organization model for the org-managed case

  authorizationBasis  String   // "self_consent" | "parental_authority" | "organizational_policy"
  consentStatus       String   // "pending_verification" | "granted" | "revoked" | "expired"
  protectionScope     Json     // deliberately unstructured — filled in when real capabilities exist
  sharingScope        Json     // same

  revocationState     String   @default("active")
  revokedAt           DateTime?
  revokedByUserId     String?  // who revoked matters — the protected person revoking their own
                                // protection must be distinguishable from the guardian revoking it

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([guardianUserId])
  @@index([protectedPersonId])
}
```

### `ConsentRecord` — append-only
```prisma
model ConsentRecord {
  id                 String   @id @default(cuid())
  relationshipId     String   // the ProtectionRelationship this event belongs to
  eventType          String   // "requested" | "granted" | "revoked" | "scope_changed" | "reconfirmed"
  verificationMethod String   // "email_link" | "sms_code" | "in_person_attestation" |
                               // "parental_declaration" | "organizational_contract_ref"
  scopeSnapshot      Json     // exactly what was agreed to at this moment
  createdAt          DateTime @default(now())

  @@index([relationshipId])
}
```

Append-only for the same reason `Evidence`/`Observation` are (ADR 0001 §5): "what did this person actually consent to, and when" has to be reconstructable, not trusted as a mutable current-state flag. `ProtectionRelationship.consentStatus` is the fast-read current state; `ConsentRecord` is the audit trail that state is derived from.

### `AlertRecipient`
```prisma
model AlertRecipient {
  id             String   @id @default(cuid())
  relationshipId String
  userId         String
  addedAt        DateTime @default(now())

  @@index([relationshipId])
}
```

A queryable join table, not a JSON blob — "who receives alerts" is specifically something the protected person must be able to see (per the governing principle), and a list they can query is honest in a way a buried field isn't.

### Deferred: `AccessGrant`

A real, eventually-necessary concept — finer-grained, independently-revocable permissions under the relationship (e.g. "share risk alerts, not raw message content"). Not proposed for the current migration: nothing in the currently-authorized scope (device *management*, not device *monitoring* — see the existing "do not build yet" list) needs that granularity yet. Building it now repeats the exact mistake ADR 0001 avoided with `EntityRelationship`: a model with no producer. Revisit when a real capability needs sub-relationship permissioning, not before.

---

## 3. How `ProtectedDevice` connects to this

**Decision, mirroring ADR 0001 §4's Option B:** don't change what `ProtectedDevice` already points at. Add `protectedPersonId String?` — nullable, additive, no touch to existing rows or the applied migration. `userId` keeps meaning "who administers this record" (unchanged); `protectedPersonId` is populated going forward as the consent layer comes online, giving the new model something concrete to attach devices to without restructuring shipped code.

**What this deliberately doesn't do yet:** make the database structurally prevent a guardian account from reading a device before consent is granted. That check lives in application code (same pattern as `EntityReference`'s XOR invariant — app-enforced, not DB-enforced, per ADR 0001 §4). Worth being explicit that this is a real gap between "the schema supports consent" and "the schema enforces consent" — closing it is an application-layer task for whoever implements the CRUD layer, not something this data model does automatically.

---

## 4. What this does NOT authorize

Restating rather than assuming it carries over: this ADR proposes tables. It does not authorize implementing the `ProtectedDevice` CRUD layer (still blocked pending this ADR's approval), and separately does not touch the standing "do not build yet" list — SMS/WhatsApp/call interception, credential collection, spyware-like functionality, remote control. Approval of the data model is not approval of any feature built on top of it.

---

## 5. A boundary outside this ADR's competence

`subjectType: "minor"` isn't just a UX variant of `"adult"` — under South Africa's POPIA and Children's Act, a minor's personal information generally requires consent from a competent person on their behalf, with specific conditions. Whether Guardian's parental-authority pathway satisfies those conditions is a legal question, not an engineering one. This ADR proposes a schema that can *represent* `authorizationBasis: "parental_authority"` — it does not, and can't, certify that any particular implementation of that pathway is lawful. Recommend legal review before the minor pathway is actually built, independent of whether the schema itself is approved.

---

## 6. Decisions locked

**Q1 — Protected adult identity: lighter verified-identity flow, not a mandatory full account.** A protected adult is independently verified (their `contactChannel`, per §2) with an optional path to a full `User` account later — `linkedUserId` stays nullable specifically to preserve that upgrade path rather than force it. Rationale: an elderly user shouldn't need to learn a second dashboard to have real visibility and revocation; verification and account creation are separable, and forcing them together would trade the exact accessibility this feature exists for.

**Q2 — Protection mode stays on `ProtectedDevice`, not the relationship.** One protected person can reasonably want Angel Watch on a phone and Archangel on a laptop — the device is the right source of truth, not the relationship. `ProtectionRelationship` may carry an optional default that seeds new devices; it doesn't become authoritative.

**Q3 — `ConsentRecord` and `ActivityLog` are complementary ledgers, not a replacement.** They answer different questions: `ActivityLog` — "what did Guardian do" (e.g. *device paused at 14:32*). `ConsentRecord` — "what did the protected person authorize" (e.g. *permission granted for scam-risk alerts at 13:57*). Collapsing them into one table would make it impossible to cleanly answer "was this action authorized" versus "did this action happen" as two separate, independently auditable questions — which matters most exactly when Guardian has to explain itself to the person it acted on behalf of.

---

## 7. Authorization invariant

This is the enforcement rule the model in §2 exists to make checkable. It is a statement about required application behavior, not something the migration itself enforces (§3 already notes the schema makes consent representable, not enforced) — but it's binding on anything built on top of this schema, and worth stating as plainly as the governing principle itself:

```
NO CONSENT           →  NO PROTECTED-DATA ACCESS  →  NO DEVICE ACTION
CONSENT REVOKED      →  IMMEDIATELY STOP AUTHORIZED ACCESS
PROTECTED PERSON REVOKES  →  GUARDIAN CANNOT SILENTLY OVERRIDE
```

The third line is the one worth being most careful about in implementation: a revocation initiated by the protected person (distinguishable via `ProtectionRelationship.revokedByUserId`, §2) must take effect the same way a revocation initiated by the guardian account does. A consent/authorization service that checks `consentStatus` before every protected-data read is the mechanism; this invariant is the requirement that service has to satisfy. Candidate for promotion into `GUARDIAN_ARCHITECTURE.md` §2 (Architecture Principles) once Protected Devices is formally represented there — see the open item in the accompanying reply.

---

## 8. Terminology boundary: Angel Watch / Archangel

Stated now because it's a direct consequence of the governing principle, not a new capability decision (§4 still stands — nothing here authorizes building either mode):

- **Angel Watch** — passive, consent-based protection. Guardian watches for risk signals and helps the protected person make safer decisions.
- **Archangel** — higher-assistance protection, still consent-bound, where Guardian can intervene more actively *within explicitly authorized boundaries*.

The line that matters: **Archangel never means the guardian account gets unrestricted access.** It means stronger protection under stronger, more explicit authorization — a wider `protectionScope`/`sharingScope` (§2), still gated by the same `ConsentRecord` trail and the same invariant in §7, not an exemption from either. If a future implementation of Archangel can't point to what was explicitly authorized for a given action, that's a violation of this ADR, regardless of what the mode is named.

---

**Next step:** `docs/decisions/0003-protected-person-migration-plan.md` — how to introduce §2's model into the existing database additively. Still not a migration; scoping the migration is a separate, later step gated on ADR 0003's own approval.
