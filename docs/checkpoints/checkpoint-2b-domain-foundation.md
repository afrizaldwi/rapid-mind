# Checkpoint 2B — Referral and Dispatch Domain Foundation

This checkpoint adds schema, models, factories, and lifecycle definitions only.
It does not connect dispatch to controllers, routes, frontend, or broadcasting.

## Domain

- `ClinicalReferralStatus`: `ACTIVE → COMPLETED`. This is the target clinical
  referral lifecycle, deliberately not the existing `Referral` cast yet.
- `EmergencyDispatchStatus`: `ASSIGNED → EN_ROUTE → ON_SITE → TRANSPORT → COMPLETED`,
  retaining `ON_SITE → COMPLETED` for demo compatibility.
- `EmergencyDispatchEventType`: `ASSIGNED`, `STATUS_CHANGED`, `REFERRAL_LINKED`.
- `DispatchTargetSource`: `GPS`, `SHELTER`, `MANUAL`.
- `ResponseUnit` belongs to an optional facility and has many dispatches. Unit
  availability, reservation, fleet management, and CRUD are outside this stage.
- `EmergencyEvent` has at most one dispatch. `Referral` has at most one linked
  dispatch and an optional explicit `EmergencyVerification` source.
- Dispatch has its own assigner, unit, optional referral, target snapshot, and
  ordered history. An unidentified emergency and an absent referral are supported.

Lifecycle enums define valid edges. They do not turn Eloquent `update()` into a
guarded workflow command. Checkpoint 2C must enforce transitions inside locked
transactions and write history/audit atomically. No observer or model callback
automatically assigns resources, completes referrals, or changes clinical state.

## Additive schema

Two new migrations add:

1. Nullable `referrals.emergency_verification_id` and nullable
   `referral_status_history.previous_status`; a unique `(id, emergency_event_id)`
   index supports the new dispatch linkage FK without limiting referral counts.
2. `response_units`, `emergency_dispatches`, and `emergency_dispatch_history`.

New dispatch tables enforce known enum values, existing required parents, one
dispatch per emergency, at most one dispatch per linked referral, coordinate
pairs/ranges, and coordinates or a nonblank target description. A composite FK
requires a linked referral to originate from the same emergency. New workflow
FKs restrict parent deletion rather than silently deleting assignment/history.
The history table stores previous/new status, actor, event type, notes, and JSONB
metadata. History mutation restrictions and event-specific validation are the
responsibility of later workflow writers; no database immutability trigger exists.

The target fields store a snapshot. They do not dynamically follow the current
Posko address, patient position, or emergency coordinates.

## Compatibility and deferred cutover

Existing `ReferralStatus`, `Referral.status` and history casts, controllers,
clinical rules, authorization, frontend payloads, realtime, and seeders remain
unchanged. Existing movement statuses remain writable. Old writers can omit
both new nullable columns. No backfill or new source-cardinality constraint runs.

The following must wait until the existing writers and UI are ready:

- Switch the Referral cast and writers to `ClinicalReferralStatus`; constrain
  persisted referral/history statuses to the clinical lifecycle.
- Enforce one referral per emergency/clinical validation, one clinical validation
  per assessment, and mutually exclusive complete source references.
- Enforce matching patient and actual confirmed verification provenance, active
  unit/facility selection, and confirmed-emergency assignment eligibility.
- Replace old cascading referral/history deletion relationships where needed for
  the final audit-preserving schema. This checkpoint does not rewrite those FKs.
- Implement locked creation/progression/linking, replay/conflict behavior, and
  atomic history/audit writes, then later frontend/projection/realtime integration.
- Update synthetic seeders for the separated workflow at the planned demo stage.

No development reset, reseed, or migration execution belongs to Checkpoint 2B.
The later approved cutover uses only a verified disposable development database;
there is no legacy referral-to-dispatch conversion. Keep all migrations so a fresh
installation can reproduce the schema.

## Verification boundary

Laravel tests use the existing `Tests\TestCase` guard, which checks both configured
and actual PostgreSQL database names against `rapid_mind_testing` before
`RefreshDatabase` runs. Its fresh migration chain is testing-only; never run these
tests against the development database or substitute SQLite.

Focused tests cover lifecycle matrices, relationships/casts, independent status
storage, target snapshots, PostgreSQL FK/unique/check constraints, required fields,
and compatibility with legacy referral writes. Existing Healthcare, workspace,
authentication, Relawan emergency, seeder, and database-guard suites are regression
checks. These checks do not prove browser, transport, clinical, or concurrency
behavior of dispatch workflows that have not been implemented.

Verification on 24 October 2026 through Docker:

- Focused lifecycle/domain suites: **33 tests, 177 assertions passed**.
- Eight existing regression suites: **82 tests, 1,033 assertions passed**.
- The focused suite rebuilt the migration chain through `RefreshDatabase` on the
  guarded PostgreSQL/PostGIS testing database. No development migration/reset or
  reseeding was performed. The existing seeder regression runs only in testing.
- Pint passed for all 16 newly added PHP files.
- No browser, E2E, realtime transport, frontend build, or development-database
  deployment verification was performed in this domain-only checkpoint.

## File inventory

Created:

```text
app/Enums/ClinicalReferralStatus.php
app/Enums/DispatchTargetSource.php
app/Enums/EmergencyDispatchEventType.php
app/Enums/EmergencyDispatchStatus.php
app/Models/EmergencyDispatch.php
app/Models/EmergencyDispatchHistory.php
app/Models/ResponseUnit.php
database/factories/EmergencyDispatchFactory.php
database/factories/EmergencyDispatchHistoryFactory.php
database/factories/EmergencyEventFactory.php
database/factories/ReferralFactory.php
database/factories/ResponseUnitFactory.php
database/migrations/2026_10_24_000000_add_referral_domain_foundation_columns.php
database/migrations/2026_10_24_000001_create_emergency_dispatch_domain_tables.php
tests/Feature/EmergencyDispatchDomainTest.php
tests/Unit/ReferralDispatchLifecycleTest.php
docs/checkpoint-2b-domain-foundation.md
```

Modified:

```text
app/Models/EmergencyEvent.php
app/Models/Referral.php
app/Models/ReferralStatusHistory.php
```
