# Checkpoint 2C — Referral and Dispatch Backend Workflows

This checkpoint implements backend mutations only. The Checkpoint 2B models,
enums, migrations, existing Referral cast, clinical rules, and authorization
middleware remain intact. No new database migration, frontend, or realtime event
is introduced. The existing T0/non-T0 creation endpoints retain their eligibility,
immutable decision, and replay behavior.

## Architecture

`DispatchWorkflow` owns assignment, status progression, and referral linking.
`DispatchTargetSnapshot` resolves and snapshots target context.
`ClinicalReferralWorkflow` implements the future clinical completion command and
records creation history/audit inside the existing source-specific transactions.
`HealthcareWorkflowAccess` requires a persisted, currently active Healthcare user
even when a service is called outside HTTP. Ownership remains shared Healthcare
access; no new organization restriction or Admin privilege is introduced.

The new controllers only dispatch validated service operations and translate
results to JSON or established Inertia redirect/form-error responses. Existing
HealthcareController changes are limited to referral provenance/history/audit.

## API

All routes use the existing `web`, `auth.jwt`, and `role:HEALTHCARE` middleware.
New resource route parameters must be UUIDs.

| POST route | Accepted input |
| --- | --- |
| `/healthcare/emergencies/{emergencyId}/dispatches` | Required integer `response_unit_id`; optional UUID `referral_id`, `target_source`, `target_description`, `notes` |
| `/healthcare/dispatches/{dispatchId}/status` | Required `expected_status`, `status`; optional `notes` |
| `/healthcare/dispatches/{dispatchId}/referral` | Required UUID `referral_id`; required-but-nullable `expected_referral_id`; optional `notes` |
| `/healthcare/referrals/{referralId}/complete` | Required clinical `expected_status`; optional `notes` |

Dispatch notes and manual descriptions are limited to 1,000 characters; referral
completion notes to 500. UUID link values are normalized to lowercase; notes and
descriptions are trimmed, with blank strings treated as absent.

Successful JSON responses use HTTP 200 with `message`, boolean `replayed`, and a
compact `dispatch` or `referral` containing `id` and `status`. Dispatch results also
include nullable `referral_id`. These responses confirm internal persistence only;
they do not assert an external team was contacted or a receiving facility accepted
the patient. No new realtime-delivery field is claimed.

Validation failures use 422, stale/conflicting requests 409 with canonical context,
and missing resources 404. Existing authentication/role responses remain 401/403.
Inertia success redirects back with a message; conflict redirects with `conflict`;
unexpected persistence failure redirects with a `form` error. JSON persistence
failures reach the existing exception handler as HTTP 500. None reports success
when a required history/audit write failed.

## Assignment and immutable snapshots

- New assignment requires emergency status `CONFIRMED` and an existing active unit.
  It does not create a referral and does not require identified patient context.
- Optional referral must originate from that emergency and the same identified
  patient, with no assessment-validation source mixed in. When an explicit
  emergency-verification reference exists, it must match the emergency and actual
  `T0_CONFIRMED` result. Legacy nullable provenance remains supported.
- Omitted `target_source` chooses valid emergency GPS first, then emergency Posko,
  then requires a manual description. Explicit sources are `GPS`, `SHELTER`, and
  `MANUAL`. GPS/Posko data comes from persisted source records rather than client
  coordinate overrides. Manual selection remains possible when GPS exists.
- Posko coordinates are read through PostGIS when present. Name/address are also
  snapshotted, so description-only Posko context remains usable. Coordinate pairs
  must be finite and within latitude/longitude bounds; zero is valid.
- Target, unit, assigner, and assignment timestamp have no mutation endpoint.
  Later source changes do not rewrite the saved target.
- Unit selection does not reserve capacity. Unit CRUD, fleet management, external
  contact, and availability protocols are outside this checkpoint.

## Lifecycle, locking, and retry behavior

Dispatch progression:

```text
ASSIGNED → EN_ROUTE → ON_SITE → TRANSPORT → COMPLETED
                            └────────────→ COMPLETED
```

The existing demo-compatible scene-completion branch remains. A successful
completion does not change referral or clinical state. A new referral link after
dispatch completion is rejected; replaying an already established link is a no-op.
No cancellation, reassignment, reopening, or arbitrary state skip is introduced.

Transactions lock the emergency first. New assignment then validates/locks its
optional referral, locks the selected unit and any used Posko context, and inserts
dispatch. Mutating linking locks emergency, referral, then dispatch; status changes
lock emergency then dispatch. Existing-link replay/conflict returns without
locking another referral. The shared emergency lock serializes creation before
the dispatch exists; the database unique constraint is an additional duplicate
barrier. T0 referral completion locks emergency then referral; assessment referral
completion locks assessment then referral. Legacy progression keeps its existing
referral-row lock and post-commit best-effort broadcasting.

Laravel transactions permit up to three attempts for recognized concurrency
errors. Other failures propagate after rollback. No external side effect occurs
inside these transactions.

- Assignment history stores the original normalized request and target snapshot.
  An identical retry returns the existing dispatch even after source GPS/Posko,
  unit activation, status, or referral linkage changes. A different original
  payload conflicts; it cannot create or replace an assignment. Omitted/automatic
  source and explicitly selected source are distinct original requests.
- Existing dispatch records without the original assignment request are not
  silently reconstructed; a new assignment attempt conflicts. No backfill runs.
- Status retry succeeds without another write only when its expected/target pair
  and notes match a persisted transition and the target is still current. An older
  retry after further progression conflicts and requires reconciliation.
- Same referral association is a no-op and preserves original linking notes and
  actor. A different established association conflicts. An initial link requires
  the expected association to be null; it cannot overwrite an existing link.
- New clinical completion accepts only `ACTIVE → COMPLETED`; an exact completion
  retry is a no-op. Intermediate legacy movement states conflict instead of being
  silently converted. This command is separate from the existing `/status` route.

## Histories and audits

Each accepted dispatch action writes domain state, one dispatch-history row, and
one audit row in the same transaction. Histories record actor, timestamp, event,
previous/current status, notes, and assignment/link metadata. Linking preserves
the dispatch status in both previous/new fields.

Audit actions:

```text
DISPATCH_ASSIGNED
DISPATCH_STATUS_CHANGED
DISPATCH_REFERRAL_LINKED
REFERRAL_CREATED
REFERRAL_COMPLETED
REFERRAL_LEGACY_STATUS_CHANGED
```

Existing T0 referral creation now stores its actual final verification reference
when available. Both T0 and assessment referral creation append `REFERRAL_CREATED`
within their original transaction. Legacy progression additionally records its
previous status and audit, while retaining its original transition/replay behavior.
Replays add no history/audit rows. This is application workflow auditing, not a
database immutability/security-hardening mechanism.

## Compatibility and deferred work

- Existing referral routes, frontend payloads, `ReferralStatus` cast, and movement
  lifecycle remain available. The new completion command does not replace them.
- Existing emergency-origin broadcasts remain best-effort after persistence.
  Dispatch and the new completion endpoint emit no new broadcasts/subscriptions.
- No Relawan projection, Admin mutation, queue-membership projection, clinical
  classification, or canonical `docs/workflow.md` content is changed.
- Runtime use of this backend requires the additive 2B schema. This task does not
  apply pending migrations or verify deployment against the development database.
- The coordinated cutover still must switch referral casts/writers and UI together,
  retire legacy movement commands, introduce the deferred source/status constraints,
  and handle the approved disposable development reset separately.
- Checkpoint 2D still needs separate UI controls, response-unit/dispatch read props,
  canonical queue/patient projections, and the planned realtime reconciliation.
  Checkpoint 2E still needs deterministic synthetic fixtures for the separated
  workflow. Neither stage is implemented here.

## Verification

Tests run sequentially against guarded PostgreSQL/PostGIS `rapid_mind_testing`.
Real concurrency tests launch independent PHP workers, first observe both database
sessions waiting on the emergency row lock, then release it and check outcomes.
They cover identical/competing assignments and identical/competing status changes;
this is service/database concurrency evidence, not browser or HTTP load testing.

The regression selection includes both new suites, the 2B domain/lifecycle suites,
and existing Healthcare lifecycle/referral/operational, workspace, authentication,
Relawan T0, seeder-repeatability, and database-guard suites. Tests verify rollback
for required history/audit failures, including both existing referral sources.
Seeder execution and database rebuilds are limited to testing.

Observed results on 24 October 2026:

| Check | Result |
| --- | --- |
| Combined new, 2B, and existing regression selection | 149 tests, 1,670 assertions passed |
| Final focused rerun after the manual-target text edge-case correction | 34 tests, 464 assertions passed |
| Real concurrent scenarios included in focused runs | 4 passed; both waiting database sessions observed in each |
| Pint on all new PHP files | 12 files passed |
| Existing Healthcare controller syntax check | Passed |
| Healthcare route inspection | 17 routes; all four new routes retain authentication/Healthcare middleware |

The final focused rerun adds four assertions for a nonblank numeric manual location
description. It does not represent another independent set of 34 distinct tests.

No browser, frontend build, realtime transport, external response, production load,
or clinical validation is claimed. No development reset/reseed/migration, dependency
change, or Git mutation is performed.

## Files

Created:

```text
app/Domain/Healthcare/ClinicalReferralWorkflow.php
app/Domain/Healthcare/DispatchTargetSnapshot.php
app/Domain/Healthcare/DispatchWorkflow.php
app/Domain/Healthcare/HealthcareWorkflowAccess.php
app/Domain/Healthcare/WorkflowConflict.php
app/Domain/Healthcare/WorkflowResult.php
app/Http/Controllers/Healthcare/ClinicalReferralController.php
app/Http/Controllers/Healthcare/DispatchController.php
app/Http/Controllers/Healthcare/WorkflowResponses.php
tests/Feature/HealthcareDispatchWorkflowTest.php
tests/Feature/HealthcareDispatchConcurrencyTest.php
tests/Support/dispatch_workflow_worker.php
docs/checkpoint-2c-backend-workflows.md
```

Modified:

```text
app/Http/Controllers/Healthcare/HealthcareController.php
routes/web.php
```
