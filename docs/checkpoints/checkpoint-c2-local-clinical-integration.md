# C2 local clinical integration — implementation and database verification

## Current committed handoff — 10 November 2026

Source: `demo` at `7076e13`. Owner commits `e561c98` (81), `1e44ff8` (6),
`be61204` (5) and `9f8fd4b` (7) contain exactly 99 distinct reviewed paths;
`7076e13` contains eight navigation files. Superseded scripts/c2 remain excluded.
The final six-file correction is part of `e561c98`: recipient lookup and event
send share the best-effort boundary after durable T0 persistence; focused tests
cover audience exceptions and reciprocal A/B patient-summary scope. The guarded
focused run recorded 12 tests / 348 assertions with rollback transactions and no
schema reset. CaseRouting's stale approval comment was corrected behavior-free.

The navigation fix separates Inertia online, offline bootstrap and authorized
same-document routes. Lock boundaries remain. Recorded 64 focused PASS, final
13-test subset PASS again, type-check/diff-check PASS were not rerun here.
Owner reports successful manual Chrome offline navigation after controlled worker
activation: narrow manual evidence, not full suite/native locking or a new hash.
The old November 9 build/publication hashes describe that release only.

P0 IMPLEMENTED YES; CORE BROWSER VERIFIED YES; LOCAL DEMO ACCEPTANCE CONDITIONAL
PASS. Seven browser PASS and six runner-safety PASS results preserved. Natural
background/foreground privacy locking NOT TESTED; production security acceptance
NOT ESTABLISHED. P1/P2 substantially implemented; full acceptance pending. Receiving
team owns native-lock, three-button SRQ revision (currently four controls), full
P1/P2 and remaining C2/C3 acceptance. Online double-prompt UX DEFERRED.
**C2 NOT ACCEPTED; C3 not started.** [Current inventory](../CURRENT_IMPLEMENTATION.md)
and [P0 handoff](../../P0-HANDOFF.md) supersede outdated statuses in earlier stages.

Database backup/publication/provisioning completion evidence is preserved. Local
DevTools disablement verified separately; teammates set false in their own ignored
.env. SQL/history RESOLVED: retain competition repository/history and synthetic
dump, excluding private runtime artifacts. No test/build/database/browser operation
or Git mutation was performed during this documentation alignment.


Date: 7 November 2026 (Asia/Jakarta). Baseline: branch `demo`,
`8d3ac3c5a4fd3d1f068ac181688c05362484bf95`.

**C2 is NOT ACCEPTED.** Source and approved synthetic PostgreSQL verification are
complete for this checkpoint. Both approved development migrations are now DATABASE
VERIFIED. Core P0 browser evidence, including scoped EmergencyCreated reception,
is now recorded; remaining native-lock/P1/P2/full C2 evidence is outstanding.
Local P0 demo acceptance is CONDITIONAL PASS; production security NOT ESTABLISHED.
C3 has not started.

The owner approved direct development using the existing Docker services, the
case/facility policy below, and schema/data-mutating tests in disposable
`rapid_mind_testing`. A subsequent explicit approval authorized only the two
additive development migrations after backup/preflight checks. These supersede the earlier isolation plan and its
policy/testing approval holds. The pre-existing `scripts/c2/` scaffold is preserved
and unused. No image/container was rebuilt, pulled, replaced, restarted or recreated.

## Current operations summary — 10 November

Database backup COMPLETE; frontend publication COMPLETE / HTTP VERIFIED; synthetic
provisioning COMPLETE / HTTP AND DATABASE VERIFIED. P0 IMPLEMENTED YES; P0 CORE
BROWSER VERIFIED YES; P0 LOCAL DEMO ACCEPTANCE CONDITIONAL PASS. Natural
background/foreground locking NOT TESTED; production security NOT ESTABLISHED.
Remaining P1/P2/C2/C3 evidence belongs to the receiving team. C2 NOT ACCEPTED; C3 not started.
[Provisioning record](c2-synthetic-provisioning-preflight.md) includes current
completion and historical preflight. Owner-confirmed dummy-data scope supersedes
the old provenance/preservation gates; the existing audit gap is accepted. Active
scopes6/7 and four accounts are ready. A narrow later-approved backend-only
non-routable C2 phone boundary was tested without rebuilding frontend assets.
Earlier blocked/provenance/approval entries remain historical records.

## Four checkpoints and audit coverage

| Checkpoint | Coverage | Current evidence |
| --- | --- | --- |
| C2.1 — minimal development preflight | G10; services, configuration, routes, migration status, actual Laravel testing connection | DATABASE VERIFIED: PostgreSQL/PostGIS test target confirmed; disposable test writes explicitly owner-approved. Shared development server/volume and superuser credential remain documented limits. |
| C2.2 — Healthcare security and realtime | G1, G2, G5; routing, list/detail/direct-ID authorization, clinical/operational mutations, nested history, counts, channels/audiences, assessment invalidation | IMPLEMENTED, AUTOMATED TESTED, DATABASE VERIFIED using two Posko/two facilities. Core P0 emergency WebSocket receipt BROWSER VERIFIED; broader case/worklist/sharing/revocation browser coverage remains pending. |
| C2.3 — assessment and clinical data | G3, G6, G8, G9; stale updates, replay, scoring, immutability, encrypted records/outbox/receipts, P1/P2, patient reconciliation | IMPLEMENTED; server contracts DATABASE VERIFIED; encrypted repository/UI contracts AUTOMATED TESTED. Core P0 offline/browser-to-PostgreSQL round trip BROWSER VERIFIED; remaining P1/P2 and concurrency acceptance pending. |
| C2.4 — emergency delivery and final verification | G4, G7; retries, priority, atomic local persistence, UUID/replay/receipt integrity, lifecycle restrictions, regression/handoff | IMPLEMENTED and AUTOMATED TESTED; server emergency replay DATABASE VERIFIED. Core P0 confirmed offline T0 priority/initial receipt BROWSER VERIFIED; broader timeout/lost-response/session-race acceptance NOT TESTED. |

IMPLEMENTED, AUTOMATED TESTED, DATABASE VERIFIED, BROWSER VERIFIED, NOT TESTED and
ACCEPTED are distinct. Only the explicitly scoped core P0 browser paths above
are BROWSER VERIFIED; no complete C2 checkpoint or overall C2 is ACCEPTED.
Independent workstreams proceeded together under the owner's direct-development
instruction; the four-checkpoint plan is retained without adding a fifth phase.

## C2.1 preflight and execution boundaries

- Read-only Git inspection re-confirmed the baseline and existing C2 changes.
  No Git mutation, dependency installation or lockfile edit was performed.
- Existing services stayed running with the same IDs: app `0ff4ff942996`, nginx
  `c25747a786ce`, postgres `c69ee95a0587` (healthy), queue `05dfc0a0de08`,
  reverb `02dd79d8a7e0`, scheduler `e69446914577`. Nginx is loopback port 8080.
- Laravel configuration inspection: `local`, URL `http://localhost:8080`, pgsql
  host `postgres`, database `rapid_mind`, database session/cache/queue, Reverb,
  configuration cache disabled. No secrets were printed.
- Laravel-bootstrap read-only verification with command-scoped `APP_ENV=testing`,
  `DB_CONNECTION=pgsql`, `DB_DATABASE=rapid_mind_testing`, empty `DB_URL` checked
  configured and actual database identities in a READ ONLY transaction, then
  rolled back. Actual target: `rapid_mind_testing`, role `rapid_mind`, address
  `172.20.0.2:5432`, PostgreSQL container above, PostGIS `3.5.2`.
- The role is a superuser and the test database shares development's server and
  volume. Owner approval establishes disposability, not credential isolation.
  `phpunit.xml` forces the testing target; `Tests\TestCase` checks configured
  database and `current_database()` before test migrations. Concurrency workers
  also assert the exact test database. No test ran against `rapid_mind`.
- Development migrations were initially Pending. Both subsequently ran under
  explicit owner approval and are DATABASE VERIFIED below. No seeder, provisioning,
  assignment, historical backfill or clinical-workflow write was executed.
- The earlier proxy/no-fallback gate was superseded by the owner's selection of
  the existing localhost application. No proxy or alternate application environment
  was started, and no proxy evidence is claimed. Disposable browser profiles are
  still required for Antigravity.

## Approved Healthcare policy and implementation

The owner's approved policy is the authority for these rules:

1. Admin configures one primary active facility on each Posko. On first server
   creation, assessment and emergency records snapshot `originating_shelter_id`,
   `responsible_facility_id` and `routing_status`. Routing uses the originating
   Relawan's server assignment, including unidentified emergencies. Later Relawan,
   Posko or patient changes do not transfer existing cases.
2. Missing/inactive assignments persist as UNRESOLVED, without guessed facilities
   or broad broadcasts. Missing deployment schema also preserves fieldwork while
   Healthcare queries fail closed; counts become unknown and the UI shows that
   case access is unavailable. Server receipt is never Healthcare receipt.
3. Active Healthcare in an active responsible facility can read and manage its
   cases. Explicit referral grants allow read access only. The origin retains
   clinical authority; Dispatch/response-unit assignment grants no clinical access.
4. `clinical_case_shares` stores case-specific, referral-linked grants with actor,
   timestamps and revocation. Grant/revocation audits are preserved. An emergency
   referral explicitly shares that emergency and its linked assessment only when
   the origin actor has authority to disclose the latter. It does not share other
   assessments/emergencies belonging to the same patient. A cross-facility linked
   assessment without its own authorization is hidden, including its ID.
5. Lists, details, direct IDs, nested patient histories, prior-assessment projections,
   emergency counters, validation, Referral and Dispatch mutations use the same
   case access service. Unknown-provenance legacy referrals remain persisted but
   hidden and non-actionable; patient identity alone grants no case access.
6. Mutation authority is rechecked after row-lock waits, including clinical,
   Referral and Dispatch paths. An independent PostgreSQL worker test confirms
   that a facility change while acknowledgement is blocked returns 404 without
   mutation or acknowledgement audit.
7. Deactivation, facility reassignment and revoked sharing remove future reads,
   mutations and event recipients. No transfer/backfill UI was introduced.
   Historical transfers require a separately explicit audited operation; this
   implementation never infers them from organizational or demographic edits.
8. Admin keeps organization management and permitted aggregates, without access to
   Healthcare patient-specific routes or actions.

The migration adds nullable primary/snapshot keys, routing status and the sharing
relationship. It performs no historical assignment backfill or clinical row rewrite.
Existing cases therefore remain unresolved after initial deployment until an
explicitly approved assignment process exists.

### Realtime and read-only presentation

The role-wide `emergencies` channel is denied. Clinical events use private channels
of the form `healthcare.facility.{facility}.user.{user}.version.{tokenVersion}`.
Subscription checks current persisted identity, role, activity, facility and version.
Each event resolves its authorized active recipients at send time. Old subscribed
connections receive no newly unauthorized case IDs after reassignment/revocation.
The legacy facility-only channel has no clinical event publisher.

Healthcare web logout increments its account token version, retiring the old
clinical channel. This also requires its other web/API sessions to reauthenticate
under existing token-version checks; Relawan logout behavior is unchanged.

Emergency, Referral, Dispatch and assessment events carry minimal IDs only.
Assessment sync invalidation is deferred until commit and omitted on replay;
transport failure does not roll back a committed record. The layout switches/leaves
channels as canonical scope changes and ignores retired-channel callbacks. It
reloads authorized data, account scope and counts; the 15-second polling/reconnect
fallback includes validation list/detail. Dirty forms still defer reconciliation.
Shared cases display read-only controls, and server guards enforce that boundary.

Healthcare T0 downgrade to T1/T2/T3, separate clinical/Referral/Dispatch state
machines, four-state SRQ and Q17 human confirmation are preserved. No demographic
editing, clinical scoring changes, automatic SMS or responder contact was added.

### Assessment integrity

The canonical assessment now includes a SHA-256 `server_version` over its clinical
content, including SRQ/risk/function child rows and observational metadata. Map
ordering is normalized. Patient demographics, transport metadata and timestamps
are excluded; patient reconciliation and clinical scoring policy are unchanged.

Under the existing identity/row locks, a changed unfinished sync requires the
matching `base_version`; stale or missing versions return 409 before dependent
patient/response mutations. Exact/no-op unfinished replays return canonical
receipt without another write. Completed records retain their existing immutable
exact-replay rules. A same-mode entirely empty shell can be filled without a
version, supporting emergency-first creation without overwriting clinical evidence.
Changing a shell's mode requires its actual version.

The legacy SRQ/risk/function/completion endpoints also require the current version
inside their row lock, so they cannot bypass the sync guard. The owned server
assessment page supplies its version. Legacy clients without a version receive
409 and must load/review the server record; no automatic conflict merge was added.

The version travels in encrypted local records and queued snapshots. If an accepted
HTTP snapshot is older than newly edited or requeued local work, reconciliation
advances only the matching server base, preserving newer answers and the outbox.
It creates no receipt or SYNCED claim for those newer edits. The following pass
queues the newer snapshot against that accepted base. Malformed versions and
inactive-owner receipts leave records/outbox intact.

Existing unversioned local drafts that differ from populated server records may
now return 409. They are preserved for review; blindly rebasing them or deleting
them would bypass stale-write protection. There is no new conflict-resolution UI.

### Emergency transport

Transient network/timeout/unknown-response failures and HTTP 408/429/5xx receive
up to six scheduled automatic retries at 2, 5, 10, 20, 40 and 60 seconds after
their recorded failure time. Failed attempts persist the existing retry counter;
exhaustion preserves the operation for explicit/reconnection retry. A manual
attempt does not reset that persisted automatic retry budget.

Only one retry timer is active. It checks owner lease, continuity, key/access fence,
online state, visible document and READY session before delivery. Lock/invalidation,
owner changes, logout and hiding cancel the timer. HTTP 401/419 require session
recovery; 403/409/422 are not automatically retried. New runs cancel stale timers.
Automatic passes honor due times and prioritize eligible emergency items over
assessment retries. Emergency UUIDs, priority-1 atomic local/outbox persistence,
server idempotency and receipt-only SYNCED semantics are retained. The scheduler
does not create incidents, confirm SRQ-17, open SMS or perform dispatch.


## Verification and actual results

The approved database command used command-scoped overrides:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql -e DB_DATABASE=rapid_mind_testing -e DB_URL= app php artisan test --compact
```

| Check | Actual result |
| --- | --- |
| Complete PHP suite above | PASS: **405 tests, 4,219 assertions**; PostgreSQL/PostGIS through Docker, including Feature migrations/fixtures and independent Dispatch contention workers and facility-revocation lock contention. |
| Initial focused assessment Feature run | PASS: 77 tests, 846 assertions. Final complete suite also covers them. |
| Focused case-scope/realtime/projection run | PASS: 13 tests, 258 assertions before the final Admin/no-backfill additions. All final tests passed in the complete suite. |
| `node --experimental-strip-types --test tests/Node/*.test.ts` | PASS: **33 files**, 0 failures. Aggregate totals count files, not every inner test. |
| Final synthetic-seeder check | PASS: 3 tests, 212 assertions; no ambiguous assignment backfill. |
| Independent revocation lock-race test | PASS: 1 test, 5 assertions; also included in the final complete suite. |
| Focused retry tests | PASS: 17 tests covering timed retries, exhausted budget, lost response, reconnection, lock/logout, owner switch and late receipt. |
| Mounted Healthcare worklist tests | PASS: 2 tests, covering list/detail polling, dirty drafts, assessment-event invalidation and channel replacement. |
| `node_modules/.bin/vue-tsc --noEmit` | PASS: exit 0, no diagnostics. |
| Docker `php -l` | PASS: all **56** changed/new PHP source, migration and test files. |
| `npm run build` in `/tmp/rapid-mind-c22-build-qfr9qyy3` | PASS: frontend and service worker, 31 precache entries. Existing dependencies only; private source/static copy, no `.env` or application service. |
| `git diff --check` and complete source/test/new-file review | PASS; no Git mutation. |
| Development migrations | DATABASE VERIFIED: November 3 batch 8 and November 7 batch 9; existing records preserved. |
| Development provisioning/clinical workflows | NOT TESTED / NOT EXECUTED; separate approval still required. |
| Actual browser Dexie transactions, offline recovery, live WebSocket receipt | NOT TESTED; Antigravity handoff remains pending. |

The complete suite contains 91 Unit tests (419 assertions) and the remaining
Feature coverage. Tests verify routing without identity, two-facility authorization,
read-only referral sharing, revocation, inactive scopes, restricted nested history,
unknown-provenance records, no historical backfill, and server sync integrity.
Node encryption/outbox fixtures use real repository/crypto code with substituted
IndexedDB transport. Their success does not establish browser transaction behavior
or an actual lost HTTP response after a PostgreSQL commit.

Earlier regression failures exposed old role-wide/unassigned fixture assumptions,
unlinked legacy referrals, inactive-origin versus inactive-destination assumptions,
and an AuthTest missing database isolation. Fixtures now declare their intended
single-facility scope separately from the policy tests, legacy transition fixtures
have explicit provenance, and AuthTest uses RefreshDatabase plus its own identity.
Mock/schema and frontend typing issues were corrected. No authorization rule was
weakened to retain an old test expectation.

Synthetic seeders configure primary facilities only for newly created demo Posko.
Existing ambiguous assignments are not filled; Dispatch scenarios are skipped with
an explicit warning when the demo actor is not the responsible facility. These
seeders ran only as approved test fixtures, not on development data.

Build warnings for large chunks and deprecated `inlineDynamicImports` remain.
Before/after SHA-256 checks confirmed live `public/build` and `public/hot` unchanged.
Live frontend assets were not published by this execution. No owner browser profile
was opened, no dependency was installed, and no service definition was changed.

## Development migration execution — DATABASE VERIFIED

The owner explicitly approved these two exact commands with staged pre/post checks.
Laravel READ ONLY repeatable-read transactions confirmed `APP_ENV=local`, pgsql,
actual/configured database `rapid_mind`, role `rapid_mind`, server `172.20.0.2:5432`.
Both were Pending and the expected original schema was inspected before execution.
The first command and its verification completed before the second command ran:

```bash
docker compose exec -T app php artisan migrate --path=database/migrations/2026_11_03_000000_add_assessment_observations_and_srq_states.php
```

```bash
docker compose exec -T app php artisan migrate --path=database/migrations/2026_11_07_000000_add_clinical_case_facility_scope.php
```

Actual command output (both exit 0):

```text
INFO  Running migrations.
2026_11_03_000000_add_assessment_observations_and_srq_states .. 11.14ms DONE

INFO  Running migrations.
2026_11_07_000000_add_clinical_case_facility_scope ............ 31.19ms DONE
```

Backup preflight passed before either command: protected archive
`/home/saga/Backups/rapid-mind/rapid_mind-20261024T080758_876733Z-bd942021.dump`,
109,432 bytes, mode 0600. SHA-256 matched
`82c15d04c594c38d424fa04432302767fb6a9225c141f0b77154e3b8e2cda663`.
Docker `pg_restore --file=/dev/null` read the entire archive successfully (exit 0),
without restoring. The existing restore-result manifest records successful isolated
restore and complete schema/data comparisons on October 24. That rehearsal was not
repeated. **Recovery point is October 24, not this migration session**; subsequent
writes and browser-local work are outside this backup. No new backup was created.

November 3 intermediate verification passed before proceeding: observation jsonb
and nullable note, nullable boolean answer and nullable answer_state were present;
`srq_response_answer_state_check` enforced definitive boolean versus unresolved
UNCLEAR/UNANSWERED storage. Historical boolean values were not rewritten. Status:
November 3 Ran batch 8, November 7 Pending; migration count 26 → 27.

November 7 final verification passed: nullable primary facility on shelters;
nullable originating Posko and responsible facility on assessments/emergencies;
non-null routing_status default UNRESOLVED; both routing indexes; sharing table
with UUID case/referral identifiers, grantor/facility, revocation/timestamps,
primary key and case/facility/referral unique constraint. All eight new foreign keys
reference the expected tables with ON DELETE RESTRICT. Final migration status:
November 3 Ran batch 8, November 7 Ran batch 9; 28 applied, none Pending.

All existing public application-table counts matched before, between and after
migration (only migration bookkeeping increased). Aggregate original-field
fingerprints also matched for clinical, identity, organizational, audit, token and
resource tables; added columns were excluded from that comparison. Runtime
session/cache/job tables were counted but excluded from fingerprint checks.

| Table | Before | After |
| --- | ---: | ---: |
| `assessments` | 17 | 17 |
| `audit_logs` | 110 | 110 |
| `cache` | 8 | 8 |
| `cache_locks` | 0 | 0 |
| `clinical_validations` | 5 | 5 |
| `emergency_dispatch_history` | 0 | 0 |
| `emergency_dispatches` | 0 | 0 |
| `emergency_events` | 42 | 42 |
| `emergency_verifications` | 56 | 56 |
| `failed_jobs` | 0 | 0 |
| `function_responses` | 42 | 42 |
| `healthcare_facilities` | 7 | 7 |
| `job_batches` | 0 | 0 |
| `jobs` | 0 | 0 |
| `migrations` | 26 | 28 |
| `password_reset_tokens` | 0 | 0 |
| `patients` | 25 | 25 |
| `referral_status_history` | 37 | 37 |
| `referrals` | 14 | 14 |
| `refresh_token_families` | 0 | 0 |
| `refresh_tokens` | 322 | 322 |
| `regions` | 1 | 1 |
| `resource_allocations` | 1 | 1 |
| `resource_needs` | 1 | 1 |
| `response_units` | 1 | 1 |
| `risk_responses` | 70 | 70 |
| `sessions` | 1 | 1 |
| `shelters` | 7 | 7 |
| `srq_responses` | 280 | 280 |
| `triage_results` | 14 | 14 |
| `users` | 11 | 11 |
| `clinical_case_shares` | absent | 0 |

All 17 assessments and 42 emergencies retain NULL originating/responsible IDs and
UNRESOLVED routing. All seven Posko primary mappings remain NULL. Added observation
and answer_state fields remain NULL on historical records; original SRQ booleans
remain intact. No clinical record was created, deleted or edited by a workflow.

Operational impact: facility-scoped authorization can now use the schema and P1/P2
storage is available. Existing cases remain hidden from Healthcare because none is
assigned or shared. Future cases remain unresolved until an approved Posko mapping
exists. No historical backfill or assignment was attempted. Six existing services
remain running; no restart/recreation, Git mutation or dependency installation.
Browser/HTTP/WebSocket behavior remains NOT TESTED in this execution. No resets,
rollbacks, recovery, seeders or regression tests ran against development. Stop here;
Posko configuration and Antigravity acceptance require separate arrangements.

The first adds observational metadata and four-state SRQ storage/constraints without
rewriting historical booleans. The second adds routing/sharing schema with old cases
left UNRESOLVED. No reset, seeding, case backfill, dependency installation, service
restart, real responder notification or browser clinical write is included.

After deployment approval, owner-approved Posko configuration and newly provisioned
synthetic cases are needed for browser acceptance. The separate
[c2-antigravity-browser-handoff.md](c2-antigravity-browser-handoff.md) records the
cross-role, offline recovery, WebSocket and privacy scenarios. C1 natural-background
acceptance remains pending and native mobile background lock is NOT TESTED.

## Browser preparation follow-up

Read-only reinspection confirmed both migrations Ran, all six services running and
59 historical cases still unresolved. No new main-database writes occurred.
[Browser preparation](c2-browser-preparation.md) records the seven Posko/facilities,
proposed reuse of inactive synthetic scope rows 6/7 with four dedicated accounts,
current backup procedure and controlled publication commands. Earlier temporary
assets lacked the public Reverb client key and are not publishable. A fresh private
build with the correct public key passed without replacing live assets. Public
Nginx/Reverb handshake returned 101; actual private browser events remain NOT TESTED.
The Antigravity handoff now prioritizes four first-wave scenarios; full C2 remains
NOT ACCEPTED. Backup, publication, provisioning and browser writes await approval.

## Complete changed-file inventory

This inventory covers the consolidated C2 diff against the baseline, including the
previous direct-development work. The eight earlier `scripts/c2/` additions are
preserved outside implementation scope and are listed separately below.

### Backend and schema

- `app/Domain/Healthcare/CaseAudience.php`
- `app/Domain/Healthcare/CaseRouting.php`
- `app/Domain/Healthcare/CaseSharing.php`
- `app/Domain/Healthcare/ClinicalReferralWorkflow.php`
- `app/Domain/Healthcare/DispatchWorkflow.php`
- `app/Domain/Healthcare/HealthcareCaseAccess.php`
- `app/Domain/Healthcare/HealthcareOperationsRead.php`
- `app/Domain/Healthcare/HealthcareWorkflowAccess.php`
- `app/Domain/Sync/AssessmentSynchronizer.php`
- `app/Domain/Sync/AssessmentVersion.php`
- `app/Domain/Sync/EmergencySynchronizer.php`
- `app/Domain/Sync/SyncPayload.php`
- `app/Events/AssessmentUpdated.php`
- `app/Events/DispatchUpdated.php`
- `app/Events/EmergencyCreated.php`
- `app/Events/EmergencyUpdated.php`
- `app/Events/ReferralUpdated.php`
- `app/Http/Controllers/Admin/ShelterManagementController.php`
- `app/Http/Controllers/AuthController.php`
- `app/Http/Controllers/Healthcare/HealthcareController.php`
- `app/Http/Controllers/Relawan/RelawanController.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `app/Models/Assessment.php`
- `app/Models/ClinicalCaseShare.php`
- `app/Models/Concerns/RoutesClinicalCase.php`
- `app/Models/EmergencyEvent.php`
- `app/Models/Shelter.php`
- `database/migrations/2026_11_07_000000_add_clinical_case_facility_scope.php`
- `database/seeders/DemoSeeder.php`
- `database/seeders/DispatchDemoSeeder.php`
- `routes/channels.php`

### Frontend

- `resources/js/Pages/Admin/MasterData/Form.vue`
- `resources/js/Pages/Healthcare/Emergencies/Show.vue`
- `resources/js/Pages/Healthcare/Referrals/Index.vue`
- `resources/js/Pages/Healthcare/Validations/Show.vue`
- `resources/js/Pages/Relawan/Emergency.vue`
- `resources/js/components/Healthcare/Emergencies/EmergencyActionsTab.vue`
- `resources/js/components/Healthcare/Emergencies/EmergencyCaseHeader.vue`
- `resources/js/components/Healthcare/Operations/ClinicalReferralCard.vue`
- `resources/js/components/Healthcare/Operations/DispatchPanel.vue`
- `resources/js/layouts/HealthcareLayout.vue`
- `resources/js/lib/emergencyDelivery.ts`
- `resources/js/lib/healthcareOperations.ts`
- `resources/js/lib/healthcareReconciliation.ts`
- `resources/js/offline/assessmentCanonical.ts`
- `resources/js/offline/assessmentContract.ts`
- `resources/js/offline/assessmentReceiptVersion.ts`
- `resources/js/offline/assessmentWorkflow.ts`
- `resources/js/offline/db.ts`
- `resources/js/offline/encryptedOutbox.ts`
- `resources/js/offline/outboxRepository.ts`
- `resources/js/offline/syncManager.ts`
- `resources/js/offline/syncRetry.ts`

### Tests

- `tests/Feature/HealthcareScopeRevocationRaceTest.php`
- `tests/Support/healthcare_scope_worker.php`
- `tests/Concerns/ClinicalScopeFixtures.php`
- `tests/Concerns/SendsVersionedAssessmentRequests.php`
- `tests/Concerns/SingleFacilityWorkflowFixtures.php`
- `tests/Feature/AssessmentCanonicalJsonTest.php`
- `tests/Feature/AssessmentIntegrityTest.php`
- `tests/Feature/AssessmentResponseContractTest.php`
- `tests/Feature/AssessmentResumeTest.php`
- `tests/Feature/AssessmentSyncConcurrencyTest.php`
- `tests/Feature/AuthTest.php`
- `tests/Feature/BroadcastChannelAuthorizationTest.php`
- `tests/Feature/HealthcareCaseRealtimeTest.php`
- `tests/Feature/HealthcareCaseScopeTest.php`
- `tests/Feature/HealthcareDispatchConcurrencyTest.php`
- `tests/Feature/HealthcareDispatchWorkflowTest.php`
- `tests/Feature/HealthcareEmergencyLifecycleTest.php`
- `tests/Feature/HealthcareOperationalCompletionTest.php`
- `tests/Feature/HealthcareOperationsProjectionTest.php`
- `tests/Feature/HealthcareReferralIntegrityTest.php`
- `tests/Feature/HealthcareWorkflowRealtimeTest.php`
- `tests/Feature/RelawanSyncContractTest.php`
- `tests/Feature/RelawanT0SubmissionTest.php`
- `tests/Feature/WorkspaceRelationshipTest.php`
- `tests/Node/assessmentVersion.test.ts`
- `tests/Node/emergencyDelivery.test.ts`
- `tests/Node/healthcareWorklistFreshness.test.ts`
- `tests/Node/helpers/offlineRepositoryFixture.ts`
- `tests/Node/syncRetry.test.ts`
- `tests/Unit/AssessmentVersionTest.php`

### Documentation

- `docs/checkpoints/c2-antigravity-browser-handoff.md`
- `docs/checkpoints/c2-browser-preparation.md`
- `docs/checkpoints/checkpoint-c2-local-clinical-integration.md`

### Preserved unused scaffold

- `scripts/c2/README.md`
- `scripts/c2/compose.yaml`
- `scripts/c2/copy_source.py`
- `scripts/c2/initialize-postgres.sh`
- `scripts/c2/origin-proxy.mjs`
- `scripts/c2/prepare.py`
- `scripts/c2/seed-identities.php`
- `scripts/c2/verify-database.php`

Dependencies installed: none. Git mutations: none. Suggested commit after owner
review: `fix(clinical): enforce facility case access and harden synchronization`.

## 9 November controlled publication — BLOCKED

The exact reviewed candidate `/tmp/rapid-mind-c2-browser-build-mpj_r1br` is absent.
Publication preflight therefore stopped before any asset backup or live mutation.
The live manifest SHA-256 remains
`c8326f8e5d9de218c30753fc25183652a1e75e29da3af00e61adc6b177b11dfb`.
No silent rebuild/substitution, database backup recreation, HTTP acceptance check,
clinical write, service restart or Git mutation occurred. Safe browser/PWA session
retirement confirmation was requested but has not yet been received. Even after
confirmation, the missing reviewed artifact remains a blocking condition.

The browser-preparation runbook now redirects pg_dump stdin from /dev/null;
archive-reading pg_restore commands retain their archive stdin. Syntax verification
passed without executing the backup. CaseRouting.php's outdated schema-approval
comment at line 17 remains untouched for subsequent source cleanup. A new candidate
requires separate preparation/review before publication. C2 remains NOT ACCEPTED;
C3 has not started.

## 9 November frontend candidate recovery — verified, NOT PUBLISHED

Owner authorized a fresh candidate only and confirmed safe browser/PWA retirement;
that confirmation is retained. No database backup was repeated. Existing backup
SHA-256 remains recorded as 7b21f0f6f6d9eca8cf06afe61c579c6f3c402110538e29095483215308816752.
Read-only service/migration checks: all six services running, Postgres healthy,
both November migrations Ran. HEAD demo/8d3ac3c5a4fd3d1f068ac181688c05362484bf95; 94 changed files at build capture.

Persistent staging: `/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx` (private owner-only parent).
317 current source inputs captured; existing dependencies only. Build exit 0,
59 manifest entries, 67 artifact files; all required manifest and 32 actual worker
precache references resolve. Correct public Reverb key injected and verified.
Checked configured private values absent; no .env or production config copied.
Unknown production secret values cannot be independently certified. TypeScript
and two focused Node files (Healthcare worklist freshness/sync retry) passed.

All four control-file hashes match the deleted candidate's recorded values, but
its lost source-input manifest prevents exact source comparison. Full inventories,
build log, working-tree status/diff and verification are retained in staging.
The runbook now contains the persistent path, full-inventory assertions, live-key
recheck and exact proposed publication command. Its mutation section was not run.
Source files, CaseRouting.php comment, live public/build/public/hot, database and
browser storage were preserved. No installs, images/restarts, Git mutations,
provisioning or clinical writes. Browser/HTTP/private WS acceptance remains NOT TESTED.
C2 remains NOT ACCEPTED and C3 has not started. Review the recovered candidate and
approve publication separately; the old missing-candidate attempt is superseded.

## 9 November controlled frontend publication — PASS

Owner approved the recovered candidate's exact publication command with one narrow
backup-verification improvement. Executed script SHA-256:
`35165dff67b4271dff5005cd59619cb123331e001203786a56c6172156f5b418`. Command exited 0. All 317 source inputs, 67 frozen candidate
artifacts, expected old live manifest, public Reverb key and collisions passed
preflight. No application source was edited.

Before any live replacement, the protected frontend archive's recorded checksum,
full gzip readability and every tar file's contents were compared with the full
67-file live inventory. All passed. Backup: `/home/saga/Backups/rapid-mind/c2-assets-l8q3bj97/live-build.tar.gz`;
SHA-256 `f817f2421870c0816e1a732770e552480bddf270eb2788dd62d9895583a8c0c3`. Owner-only directory/files permissions retained.

All dependencies published before the reviewed four-control-file replacement
order; 50 new paths added and 63 old non-control assets retained unchanged.
All 67 candidate files now match the live filesystem. **71 static HTTP responses
through localhost:8080 returned 200 with matching bytes/hashes**. Verified at
`2026-11-09T20:24:01.585557+07:00`. Final live manifest:
`3cdb72539ecbcf5f9db259b593f233447d58854c9353d80f3f3706eb15c8a5d8`;
service worker: `3f9b4cab2343d447f15dd4e17634b2bf10f63dfebbd90edf58ef50598ad83371`.
PWA/offline hashes, per-URL evidence and complete file inventories are linked in
[c2-browser-preparation.md](c2-browser-preparation.md). Static HTTP evidence is
not browser service-worker activation, WebSocket receipt or clinical E2E evidence.

Changed this report, the browser-preparation report, the narrowly improved private
publication script and generated frontend files. CaseRouting.php remained unchanged.
Safe-session retirement and the verified November 9 DB backup were retained;
no new DB backup, DB mutation, organization/user provisioning, browser storage
access/clearing, dependency installation, service restart or Git mutation occurred.
Stop after publication. C2 remains NOT ACCEPTED pending required Antigravity/E2E;
C3 has not started. Earlier NOT PUBLISHED recovery entries are historical stages.

## Accelerated C2 provisioning and handoff — 9 November

Executed actual validated Admin HTTP workflows on local/pgsql rapid_mind:
facilities6/7 and Posko6/7 active; audited mappings6→6 and7→7 (audit111/112).
Healthcare IDs30/31, Relawan IDs32/33 created with correct roles/scopes/version1.
Credentials generated locally and retained only in ignored private file0600 under
private directory0700; no passwords/hashes/session tokens printed.

Owner-approved phone fix: C2SyntheticPhone helper and provisioning validation accept
C2-TEST-NONROUTABLE-A/B only for the exact two new C2 Relawan names/.invalid emails,
creation only, local/rapid_mind or testing/rapid_mind_testing, localhost8080 appURL.
Core IndonesianPhone remains strict. No production/real-account exception, external
contact, frontend modification or new dependency. Existing synthetic accounts
cannot be updated using this exception; their creation-only lifecycle is documented.

AUTOMATED TESTED: 13 phone/Admin tests234 assertions plus9 case/realtime tests186
assertions, only on approved rapid_mind_testing. PHP syntax passed. Full historical
405-test regression was not repeated. The initial production negative fixture
needed a real matching CSRF token before exercising validation; corrected run passed.
HTTP/DATABASE VERIFIED: all four real logins; own channel auth200, foreign and old
role-wide403; two new assessment syncs201, scope snapshots6/7 and persisted four SRQ
states; reciprocal own/foreign patient reads200/404. Channel auth used a synthetic
socket ID and is not live WebSocket-reception proof. No browser was automated.

Dummy-data writes were authorized; no historical-record/provenance investigations
repeated and no reset/cleanup required. Current counts users15,patients27,
assessments19,emergencies42,shares0,audits112. Source change is narrow backend-only;
all67 published frontend artifacts remain unchanged. Six services running, DBhealthy.
No install, Git mutation, migrations, images/restarts, rebuild/publication, backup
recreation, browser storage access or real external contact.

Updated Antigravity handoff contains actual identities/scopes, private credential
location, HTTP fixture UUIDs and the owner-approved local dummy-write scope. First
browser wave remains real login/encryption/offline sync, actual scoped WS events,
P1/P2 persistence and confirmed offline T0 priority/retry. C2 NOT ACCEPTED until
that browser evidence exists. C3 has not started.

## Historical 10 November initial P0 handoff review — documentation only

The following describes the initial review before runner cleanup, the resolved
SQL/history decision and owner commits. Its harness/transfer blockers are
superseded by the current committed handoff above; original evidence is retained.

The owner confirms core P0 browser acceptance passed; saved p0_acceptance_results.json
contains seven PASS results and natural_tab_switch_lock=false. Correct classification:
P0 IMPLEMENTED YES; P0 CORE BROWSER VERIFIED YES; P0 LOCAL DEMO ACCEPTANCE CONDITIONAL
PASS; natural background/foreground locking NOT TESTED; production security acceptance
NOT ESTABLISHED. Preserve the headed NOT TESTED outcome; simulated visibility handler
PASS does not close native OS/mobile locking. Receiving team owns native-lock, P1/P2
and remaining C2/C3 acceptance. No tests, clinical writes or C3 work ran in this review.

P0-HANDOFF.md is corrected; p0-final-handoff-review.md contains the complete103-path
suggested commit inventory, security findings and transfer checklist. Both untracked
browser harnesses have actual enrollment literals and are held from commits as-is.
The pre-existing tracked SQL dump and ignored runtime clinical/debug/profile artifacts
also need owner transfer review. No application/harness source or private result was
modified. Earlier full browser-NOT-TESTED statements remain dated historical stages;
full C2 is still not accepted and production acceptance is not established.
