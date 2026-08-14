# ADR 0002 — Protected Person Consent & Authorization Model

**Status:** Proposed — architectural design only. No schema changes, migrations, or code have been written against this. Three questions in §6 are explicitly left open and need a decision before `2b.1` (the actual migration) could even be scoped, not just before it's implemented.
**Scope:** The data model underneath any future "protect another person's device" feature. Does not authorize building device monitoring, alerts, or the CRUD layer — those remain blocked pending this ADR's approval and, separately, the actual monitoring features remain blocked by the existing "do not build yet" list (SMS/WhatsApp/call interception, credential collection, remote control).
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

## 6. Open questions — not resolved here, need an explicit decision

**Q1 — Full `User` account for protected adults, or a lighter verified-identity flow (magic link, no persistent login)?** This is the largest product decision hiding inside "the protected person must have visibility." A full account gives real independent control; it also adds friction for exactly the low-tech elderly users this is meant to serve. `ProtectedPerson.linkedUserId` is written nullable specifically so this doesn't have to be decided to approve the rest of the model — but it does have to be decided before `AlertRecipient`/notification delivery can be built.

**Q2 — Does `ProtectionMode` move to the relationship, or stay on the device as already shipped?** A person could reasonably want Angel Watch on a phone and Archangel on a laptop, which argues for leaving `ProtectedDevice.protectionMode` exactly as migrated. Lean: don't move it — let `ProtectionRelationship` optionally carry a default that seeds new devices, not become the sole source of truth. Not decided here.

**Q3 — Does `ConsentRecord` replace or complement `ActivityLog`?** Different shapes for a reason — `ActivityLog` is generic action/metadata, consent events need `verificationMethod`/`scopeSnapshot` specifically. Lean: complementary. `ActivityLog` still records "device paused" as an operational event; `ConsentRecord` records the consent-lifecycle event it may have been gated behind. Not decided here.

---

**Next step if approved:** none of §2's models get implemented automatically. Approval of this ADR would authorize scoping a `2b.1`-equivalent migration plan — the same inspect-first, smallest-safe-change discipline as ADR 0001 — not writing one.
