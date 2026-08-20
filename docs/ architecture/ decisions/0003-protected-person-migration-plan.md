# ADR 0003 — Protected Person Migration Plan

**Status:** Proposed — plan only. No `schema.prisma` edit, no migration file, no `prisma migrate` command has been run against this. Answers exactly one question: *how do we safely introduce ADR 0002's model into the existing database without disturbing what's already shipped?*
**Depends on:** ADR 0002 (approved). Does not reopen anything ADR 0002 decided.
**Explicitly does not cover:** the consent/authorization service, protected-person visibility UI, device management UI, or anything past "the tables exist and the database is in sync." Those are later steps in the build sequence, not this document's job.

---

## 1. Current state

```
User
  │
  └── ProtectedDevice
          ├── mode     (ProtectionMode: ANGEL_WATCH | ARCHANGEL)
          ├── status   (DeviceStatus: ACTIVE | PAUSED | OFFLINE | REVOKED)
          └── userId   (direct ownership — no consent concept exists yet)
```

Shipped in commit `4b8fada`, migration `20260813120204_protection_modes_and_devices`. No `ProtectedDevice` rows should exist yet in any environment where this has been applied — the CRUD layer that would create them was deliberately not built (per the earlier "do not build the CRUD layer yet" instruction). **This is stated as an expectation to verify, not a fact this document confirms** — §5 covers how to check before assuming it.

## 2. Target state

```
User
  │
  ├── ProtectionRelationship
  │         ├── guardianUserId, protectedPersonId, organizationId?
  │         ├── authorizationBasis, consentStatus
  │         ├── protectionScope, sharingScope (Json, unstructured for now)
  │         ├── revocationState, revokedAt, revokedByUserId
  │         │
  │         ├── ProtectedPerson
  │         │         ├── subjectType, linkedUserId?, contactChannel
  │         │         └── ProtectedDevice[]   (existing model, +protectedPersonId)
  │         │
  │         ├── ConsentRecord[]   (append-only)
  │         └── AlertRecipient[]
  │
  └── ProtectedDevice   (unchanged: userId relation stays exactly as shipped)
```

Every new relation is additive. `ProtectedDevice` gains exactly one nullable field (`protectedPersonId String?`) and loses nothing — `userId`, `mode`, `status` are untouched.

## 3. Migration steps, in dependency order

Prisma migrations run as a single transaction per migration file, so ordering here is about how the models are *written* in `schema.prisma` (for readability and correct relation resolution), not separate deploy steps — this is one migration, not four.

1. **`ProtectedPerson`** — no dependencies on the new models, only references `User` optionally via `linkedUserId` (no FK constraint needed on a nullable identifier that may not resolve to a `User` yet — treat `linkedUserId` as a soft reference, not a Prisma `@relation`, until Q1's "upgrade path" is actually built).
2. **`ProtectionRelationship`** — depends on `User` (existing) and `ProtectedPerson` (step 1). Optionally on `Organization` (existing).
3. **`ConsentRecord`**, **`AlertRecipient`** — both depend on `ProtectionRelationship` (step 2).
4. **`ProtectedDevice.protectedPersonId`** — an `ALTER TABLE ... ADD COLUMN` on an existing table, nullable, no default required, no backfill required if §5's expectation holds (zero existing rows). This is the only change to an already-shipped table in the entire migration.

No table is dropped, renamed, or has a column removed. No existing column changes type or nullability.

## 4. What this migration deliberately does not do

- Does not add a foreign-key constraint from `ProtectedDevice.protectedPersonId` to `ProtectedPerson` that would break if the nullable field is left unset — it stays optional at the database level, matching that population happens going forward, not retroactively (contingent on §5).
- Does not implement `AccessGrant` (ADR 0002 §2, deferred — no producer yet).
- Does not touch `ActivityLog` (ADR 0002 §6, Q3 — complementary, not merged).
- Does not add any application code that reads or writes these tables. A migration that compiles and applies cleanly with zero consumers is the entire deliverable here.

## 5. Pre-migration check — run before writing the migration, not after

**Verify the "no existing `ProtectedDevice` rows" assumption in §1 rather than trust it.** In an environment with real database access:

```sql
SELECT count(*) FROM "ProtectedDevice";
```

- **If zero:** proceed exactly as planned — §3 step 4 needs no backfill.
- **If non-zero:** stop before writing the migration. Existing rows would need a synthesized `ProtectedPerson` + `ProtectionRelationship` per distinct `userId`/device-owner pattern, with `consentStatus` set to `"pending_verification"` (never auto-granted retroactively — that would silently violate the governing principle for every pre-existing row) and a `ConsentRecord` of type `"requested"` created for each. That backfill is a materially different, higher-risk change than steps 1–4, and would need its own explicit approval before being folded into this migration rather than assumed as a footnote.

This check has to happen first because it changes whether this is a small, boring migration or a small migration plus a data-sensitive backfill — those aren't the same size of change, and conflating them would be scoping the riskier one silently.

## 6. Verification after applying (Phase 3 of the build sequence)

In an environment with real Prisma/database access — not this one; see the honesty note in the previous ADR 0001 exchange about what this sandbox can't reach:

```
npx prisma validate
npx prisma migrate status
git status
```

`git status` should show exactly: the `schema.prisma` diff and one new migration folder. Anything else in the diff means something outside this plan's scope got touched, and that's worth stopping on before committing, not explaining after.

## 7. Rollback

Purely additive schema changes roll back cleanly: `prisma migrate diff` against the prior migration produces a `DROP TABLE` for the four new models and a `DROP COLUMN` for `protectedPersonId`, with no risk to `ProtectedDevice`'s existing data (the column being dropped is the one column nothing depended on yet, by construction of §4). Worth confirming this explicitly before applying, not assuming it — but nothing in this plan should make rollback harder than it would be for any other additive migration.

---

**Next step if approved:** the actual `schema.prisma` edit implementing steps 1–4, followed by exactly the Phase 3 verification in §6 — run somewhere with real database access, reported back before anything is generated or applied, same discipline as ADR 0001's `2a.2`.
