# Checkpoint 2D + 2E — Healthcare integration, realtime, and synthetic fixtures

Implemented 24 October 2026 against the current local application. This checkpoint
adds integration code and isolated automated evidence. It does **not** perform the
coordinated database/application cutover or establish browser/runtime readiness.
`docs/workflow.md` and clinical classification rules remain unchanged.

## Healthcare presentation and endpoint integration

The existing four Healthcare navigation destinations remain. The confirmed-T0
workspace presents sibling **Rujukan** and **Respons Lapangan** sections on both
the selected-case actions tab and emergency detail page.

- Referral creation continues using the existing explicit creation endpoint.
  Identified patient context is required for referral; unidentified confirmed T0
  still supports Dispatch assignment.
- `ACTIVE` referrals use `POST /healthcare/referrals/{id}/complete`, carrying
  `expected_status: ACTIVE` and optional notes. Completion means the internal work
  item is finished; it does not claim hospital acceptance, admission, or treatment
  completion. It does not complete Dispatch or change clinical classification.
- Assignment uses `POST /healthcare/emergencies/{id}/dispatches`, with an active
  server-provided unit, optional existing referral, explicit GPS/Posko/manual source,
  optional notes, and a required manual description when selected. Coordinates are
  never supplied or invented by the client. The chosen target is shown first.
- Dispatch status uses `POST /healthcare/dispatches/{id}/status`, carrying
  `expected_status`, `status`, and optional notes. Next actions come from the
  server enum. Both `ON_SITE → TRANSPORT → COMPLETED` and `ON_SITE → COMPLETED`
  remain supported. Completion uses a confirmation dialog.
- Optional later linking uses `POST /healthcare/dispatches/{id}/referral`, with
  `referral_id`, nullable `expected_referral_id`, and optional notes. Already linked
  or completed Dispatch records offer no replacement/link action.
- Controls prevent duplicate clicks during a request. Validation errors remain
  visible; stale conflicts trigger authoritative reload, blocking another write
  until reload succeeds. A network error reports uncertain receipt and requires
  reconciliation before retry. Existing server replay rules remain authoritative.
- Native confirmation dialogs provide labels, focus confinement, Escape/cancel,
  autofocus cancellation, and restoration of the invoking focus. These are source
  behaviors; actual keyboard/browser interaction remains unverified.

The global Rujukan workspace shows patient, source, destination, creation/update
 times, clinical status, and an independent linked Dispatch summary. Filters offer
all, active, completed, and legacy records. Missing provenance is reported as
unknown rather than inferred. Patient emergency history and emergency timelines
include persisted Referral/Dispatch histories with separate domain labels,
actors, timestamps, notes, and linking events. Existing clinical/assessment history
remains available. No additional Admin or Relawan clinical projection is added.

## Read contracts and query behavior

`HealthcareOperationsRead` supplies additive data while preserving existing props:

| Surface | Additive contract |
|---|---|
| Emergency queue/detail | `operationsAvailable`, active `responseUnits` (`id`, `code`, `name`, `facility_id`); each emergency has `operations` |
| Emergency `operations` | `available`; nullable compact `dispatch`; compact `referrals`; server source options `targets` |
| Dispatch projection | ID/status, immutable target snapshot, optional referral ID, unit identity, assignment time/actor, enum-derived next statuses, persisted ordered history |
| Dispatch history | ID/event type/previous and current status/notes/time, actor identity, and recorded referral ID; original assignment request metadata is excluded |
| Referral projection | ID/status, source IDs and source label, facility identity, timestamps/notes, ordered status history and actors |
| Referral list | Existing rows retained; optional eager-loaded Dispatch/unit summary and `operationsAvailable` |
| Patient detail | Existing patient graph retained; emergency `operations` and `operationsAvailable` added |

Relationships are eager-loaded in batches. The Dispatch model graph is removed
from emergency serialization after projection, avoiding duplicate serialization
and exposure of original assignment request metadata. Existing broad assessment
props and unpaginated worklists are retained rather than refactored here.

Canonical queue membership is now:

- `PENDING`, `ACKNOWLEDGED`, and `REVIEWING` remain included.
- A confirmed T0 remains while Dispatch is absent, Dispatch is unfinished, or any
  Referral is unfinished. Referral completion alone never removes it.
- A confirmed T0 leaves the active queue only when Dispatch is completed and no
  unfinished Referral remains, including a completed Dispatch without Referral.
  This is an operational queue projection, not a new clinical resolution state.
- Pending oldest-first order, deterministic ID ties, and consistent newest-first
  ordering for other queue items remain. Existing selected-case reconciliation is
  preserved; the patient active-T0 projection uses the same independent criteria.

## Runtime schema prerequisites and compatibility

Read readiness explicitly checks for the additive 2B Dispatch/history/unit tables
and Referral verification column. When prerequisites are absent, emergency reads
return `operations.available: false`, not a fabricated `dispatch: null`. Eligible
unit options are empty and new controls are unavailable with an explanatory
message. Existing referral compatibility controls remain available. Confirmed T0
cases are conservatively retained when Dispatch cannot be queried. Unexpected
query/database failures are not caught and disguised as empty data.

No migration, reset, truncation, deletion, or demo seeding was executed against the
development database. Full functionality requires the separately approved 2B
schema deployment during **2F + 2G**. The current running development schema and
new UI were not browser verified. Schema-aware reads do not make new mutation
endpoints usable before their database prerequisites exist.

Existing `/healthcare/referrals/{id}/status`, creation endpoints, `ReferralStatus`
cast, legacy permitted statuses, constraints, clinical validation, and T0
acknowledgement/classification remain. No migration or restrictive constraint is
introduced. With schema available, ACTIVE rows offer the new clinical completion
control and no competing legacy movement button. Intermediate legacy rows remain
truthfully labeled and retain legacy progression controls. Before schema readiness,
existing referral movement controls remain the compatibility fallback. No legacy
status is silently converted. Final retirement belongs to **2F + 2G**.

The earlier Healthcare design permits T1/T2 downgrade; the application also
supports T3. This discrepancy still requires an explicit owner decision. This
checkpoint authorizes no clinical-policy change.

## Realtime contracts

Both new events use the existing Healthcare-only private `emergencies` channel:

```text
DispatchUpdated: { dispatch: { id }, emergency: { id } }
ReferralUpdated: { referral: { id }, emergency: { id: UUID | null } }
```

`ReferralUpdated` covers non-T0 referrals without requiring another channel.
Dispatch assignment/progression/linking and referral creation/completion/legacy
progression register notifications only after all required state/history/audit
writes. `DB::afterCommit` delays emission until the enclosing transaction commits;
rollback discards it. Idempotent replays register no event. Event/broadcast failures
are reported best-effort after commit and cannot turn persisted success into an
HTTP persistence failure. No patient names, clinical decisions, or target locations
are included in these payloads. No external unit contact or reservation occurs.

`HealthcareLayout.vue` remains the sole subscription owner. It listens to both
new events and the existing emergency events, then reloads route-appropriate
canonical props. A 150ms coalescer permits one layout reload in flight and queues
an additional pass for events arriving during reload. Subscription/reconnection
and recovery of HTTP health also request reconciliation. Socket state changes
clear readiness while disconnected; server reachability remains a separate probe.

Draft inputs defer background reconciliation with a visible update notice and
manual refresh action. Mutations defer background reloads until completion.
Components keep their draft refs across normal prop reloads; selected-case changes
retain the existing reset behavior. Explicit mutation conflict reloads remain
available. No subscription is added to individual cards, Admin, or Relawan. No
live-Reverb delivery or reconnect behavior was browser tested in this checkpoint.

## Deterministic synthetic fixture matrix

`DemoSeeder` calls `DispatchDemoSeeder` only when additive schema is ready. The
new seeder reuses existing active demo Healthcare/Relawan actors and their current
facility; it does not create accounts or change privileges. A dedicated unit uses
stable code `SYNTHETIC-2DE-01`. Patients and fixture notes are marked
`[SINTETIS 2DE]`; no NIK is assigned to these new patients.

Emergency/assessment roots, patients, and referrals have deterministic UUIDs via
`DispatchDemoSeeder::id(scenario, entity)`. Dispatch/history/audit rows have stable
root associations, rather than forcing UUIDs or sequence IDs through live commands.
Every scenario is atomic. An existing root is skipped on repeat runs, preserving
manual changes instead of resetting the fixture. Missing actors/schema cause an
explicit failure in the dedicated seeder; existing pages are not used to run it.

| Scenario | Referral | Dispatch | Coverage |
|---|---|---|---|
| 1 | None | None | Confirmed T0 awaiting operational action |
| 2 | None | ASSIGNED | Assignment without Referral |
| 3 | ACTIVE | EN_ROUTE | Active Referral and movement |
| 4 | ACTIVE, linked after assignment | ON_SITE | Later immutable linking; Posko target |
| 5 | ACTIVE | TRANSPORT | Transport branch |
| 6 | ACTIVE | COMPLETED | Dispatch completion leaves Referral active |
| 7 | COMPLETED | ON_SITE | Referral completion leaves Dispatch active |
| 8 | COMPLETED, linked later | COMPLETED | Timeline demo; direct ON_SITE completion branch |
| 9 | None | ON_SITE | Unidentified confirmed T0; manual target |
| 10 | ACTIVE, validated assessment | None | Non-T0 Referral remains independent |

The other assignment targets use persisted synthetic GPS. Dates are fixed relative
to 24 October 2026, with ordered progression times. Referral and Dispatch commands
write their normal histories and audits; synthetic source decisions are explicit
fixture records. No real response unit or hospital is contacted. Seeder execution
in this checkpoint occurred only inside isolated testing.

## Automated verification observed

All Laravel suites ran sequentially against PostgreSQL/PostGIS
`rapid_mind_testing`, enforced by `Tests\TestCase` and concurrency-worker guards.
RefreshDatabase rebuild/rollback behavior was limited to that testing database.

| Check | Observed result |
|---|---|
| Final combined Laravel selection | **173 tests, 2,057 assertions passed** |
| Existing real PostgreSQL concurrency scenarios included | **4 passed**; not an additional independent test count |
| New Node/Vue contract/rendering tests | **9 passed**, run with `node tests/Node/healthcareOperations.test.ts` |
| Existing emergency Node regression files | **3 files passed** using `node --test` |
| `npx vue-tsc --noEmit` | Passed |
| `npm run build` | Passed; existing large-chunk and inlineDynamicImports warnings |
| Focused Pint check | **11 PHP files passed** |
| Existing DemoSeeder Pint check | Existing class-attribute/string formatting findings; committed HEAD copied to a container temporary file produces the same findings. Preserved to avoid unrelated formatting |
| Controller and DemoSeeder PHP syntax | Both passed |
| `git diff --check` and locked workflow hash | Passed / unchanged |

The final Laravel selection consists of:

```text
HealthcareOperationsProjectionTest
HealthcareWorkflowRealtimeTest
DispatchDemoSeederTest
HealthcareEmergencyLifecycleTest
HealthcareOperationalCompletionTest
HealthcareDispatchWorkflowTest
HealthcareDispatchConcurrencyTest
EmergencyDispatchDomainTest
ReferralDispatchLifecycleTest (Unit)
HealthcareReferralIntegrityTest
DemoSeederRepeatabilityTest
WorkspaceRelationshipTest
AuthTest
RelawanT0SubmissionTest
RelawanSyncContractTest
```

Coverage includes independent queue/completion behavior, unidentified patients,
active units, source/role boundaries, history attribution and ordering, schema
absence, commit/replay/rollback/transport-failure event semantics, non-T0 updates,
repeat seeding, and preservation of progressed fixtures. Existing rollback and
concurrency coverage remains. Frontend tests exercise request payloads, conditional
controls, busy/validation/conflict/network states, event coalescing/draft deferral,
server-provided target choices, timeline ordering, and rendered confirmation labels.
Earlier overlapping runs are not added to the final totals.

## File inventory

Created:

```text
app/Domain/Healthcare/HealthcareOperationsRead.php
app/Domain/Healthcare/HealthcareWorkflowEvents.php
app/Events/DispatchUpdated.php
app/Events/ReferralUpdated.php
database/seeders/DispatchDemoSeeder.php
resources/js/components/Healthcare/Operations/ClinicalReferralCard.vue
resources/js/components/Healthcare/Operations/DispatchPanel.vue
resources/js/components/Healthcare/Operations/OperationConfirmation.vue
resources/js/components/Healthcare/Operations/OperationsTimeline.vue
resources/js/composables/useHealthcareOperation.ts
resources/js/lib/healthcareOperations.ts
resources/js/lib/healthcareReconciliation.ts
tests/Feature/DispatchDemoSeederTest.php
tests/Feature/HealthcareOperationsProjectionTest.php
tests/Feature/HealthcareWorkflowRealtimeTest.php
tests/Node/healthcareOperations.test.ts
docs/checkpoint-2de-frontend-realtime-fixtures.md
```

Modified:

```text
app/Domain/Healthcare/ClinicalReferralWorkflow.php
app/Domain/Healthcare/DispatchWorkflow.php
app/Http/Controllers/Healthcare/HealthcareController.php
database/seeders/DemoSeeder.php
resources/js/Pages/Healthcare/Emergencies/Index.vue
resources/js/Pages/Healthcare/Emergencies/Show.vue
resources/js/Pages/Healthcare/Patients/Show.vue
resources/js/Pages/Healthcare/Referrals/Index.vue
resources/js/components/Healthcare/Emergencies/EmergencyActionsTab.vue
resources/js/layouts/HealthcareLayout.vue
tests/Feature/HealthcareOperationalCompletionTest.php
```

No route, model cast, migration, dependency/lockfile, environment, Admin/Relawan
workflow, or previously aligned design document changed. The existing queue
regression expectation was updated because a completed Referral with no Dispatch
must now remain in the confirmed-T0 queue.

## Deferred verification and cutover

No Antigravity/browser/E2E, actual mobile layout, native dialog keyboard/focus,
live socket transport/reconnect, offline workflow, external response, clinical
validation, production security, or production-load proof is claimed. Responsive
classes and automated rendering are not browser evidence. Existing unpaginated
worklists and best-effort notifications remain prototype limitations.

No dependencies were installed and no Git mutations were performed. Review this
checkpoint before **2F + 2G**, which owns the separately approved coordinated
schema/application cutover, final legacy retirement/constraint changes, fixture
execution in the prepared runtime, and final browser verification. None of those
steps is authorized or executed here.
