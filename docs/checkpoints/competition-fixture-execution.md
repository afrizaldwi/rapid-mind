# Competition fixture execution — completed 10 November 2026 (Asia/Jakarta)

**PASS: authorized development data replacement and 12-patient seeding completed.**
This completion supersedes the stopped-at-test checkpoint retained below. The owner
explicitly instructed correction of that test and continuation. The prior failed
attempt is historical evidence, not the current execution status.

## A. Source correction and files

- `tests/Feature/CompetitionFixtureSeederTest.php`: the unrelated synthetic patient
  now has a valid synthetic creator, as required by the inspected patients schema.
  This is test setup only; clinical and authorization logic did not change.
- Existing changes from the prior checkpoint remain: `CompetitionFixtureSeeder.php`
  calls the dedicated `Competition/FixtureEmptyDataset.php` before credential creation;
  all 31 reviewed application tables must be empty on first installation. Unexpected
  application relations/dependencies fail closed. The completed marker path remains
  before the empty-data check and preserves manual progress and credentials.
- `docs/checkpoints/competition-fixture-preparation.md`: retains the final no-backup
  authorization and now links the completed execution and current passing test result.
- This execution report records actual runtime evidence and preserves the first attempt.

No unrelated source, dependencies, lockfiles, historical seeders, clinical rules or
Docker configuration changed. Eight scripts/c2 files, .env and compose.yaml were
verified byte-identical against this resumed run's initial hashes. No dependencies
were installed and no Git mutation occurred. Branch/HEAD remained demo at
6752729354045e8da18499ef0179e28c414714d9.

Complete fixture-scope diff: `/tmp/rapid-mind-competition-task-only.diff`.
It includes full contents of the original untracked preparation files, new guard and
report against committed HEAD, excludes scripts/c2, and does not change the Git index.

## B. Focused checks before development mutation

**PASS: 16 tests / 277 assertions**, PHPUnit 12.5.36 / PHP 8.4.26.
The exact Docker command is retained in the earlier checkpoint below. Explicit
APP_ENV=testing, configured/actual rapid_mind_testing, null broadcast, sync queue,
array mail/session/cache; DatabaseTransactions with rollback-protected coordinate
DDL and isolated temporary private test credentials. No RefreshDatabase, reset,
schema wipe or writes to development occurred in this test run.

PHP syntax: PASS for all 11 fixture PHP files. Pint --test: PASS for all 11 files.
`git diff --check`: PASS. No broad test suite, build or dependency installation ran.
The unrelated-patient regression now reaches and verifies the empty-data refusal.
The clean install, completed rerun/manual-progress preservation, notification
suppression, user/cache/table/view/cross-schema refusal regressions also passed.

## C. Actual controlled execution

| Phase | Result | Evidence |
| --- | --- | --- |
| Preflight | PASS | APP_ENV local; uncached config; configured/actual rapid_mind; postgres:5432; exact http://localhost:8080; Compose project rapid-mind; 28 applied migrations; only coordinate migration pending; exact application relation inventory; no user triggers; PostGIS 3.5.2 operational. |
| Maintenance | PASS | Laravel down; Nginx, queue, scheduler and Reverb stopped; app had only PHP-FPM processes; pg_stat_activity showed only our inspection connection. No unknown session terminated. |
| Coordinate migration | PASS | Only 2026_11_10_000000_add_competition_facility_coordinates applied. Two nullable numeric(10,7) columns and validated paired/range check verified. 29 migrations. All original data counts/fingerprints, existing indexes and constraints preserved. Facility fingerprint compared after excluding its two new NULL columns. |
| Database reset | PASS | Exactly one BEGIN/DO/TRUNCATE/COMMIT; exact 31-table allowlist, bounded 5-second lock and 60-second statement timeouts, CONTINUE IDENTITY RESTRICT; no CASCADE. Transaction rechecked target, inventory, dependencies, migrations, PostGIS and user sequence. |
| Empty-data verification | PASS | All 31 application tables zero. Migrations/spatial_ref_sys fingerprints, schema, indexes, constraints and all sequence values preserved. |
| Fixture seeding | PASS | CompetitionFixtureSeeder executed once, completed in 1,977 ms; no automatic retry or repair. Command-scoped opt-in, null broadcast, sync queue, array mail/session/cache and explicit local PostgreSQL target. |
| Fixture verification | PASS | Existing verify.php passed before recovery and again after login smoke. Supplemental read-only checks verified six password hashes, roles, twelve assignments, four-state SRQ, Q17, verification/audit histories, referral/dispatch ownership and read-only sharing scope. |
| Service recovery | PASS | All six services running; postgres healthy; Laravel up. |
| Browser login smoke | PASS | Six actual UI logins in isolated Chrome profiles; correct authenticated role and route for every account; zero attempted non-login mutations. |
| Personal browser-origin cleanup | NOT EXECUTED | No owner profile accessed or modified. Exact-origin cleanup remains manual; old data must never be imported into new accounts. |

No backup was created; no historical backup was modified, deleted or restored.
No destructive retry, volume operation or unrelated migration occurred.

Fixture UTC anchor: **2026-11-09**, selected from the actual current UTC clock
(2026-11-09 23:45 UTC during pre-seed verification); local calendar date was
10 November in Asia/Jakarta. The two dates intentionally differ.

Before deletion, immediately-before-reset inventory matched the verified
post-migration baseline. Empty verification independently checked the committed
reset before the seeder was started. All former user IDs were at most 34;
CONTINUE IDENTITY produced six new users with IDs greater than 34. Old sessions
and refresh-token data were deleted and were zero before seeding. No old queued
jobs remain. This prevents old account identifiers from being reused; no claim
is made that personal offline storage was cleared.

## D. Final counts

This inventory was taken after service recovery and browser login checks.

| Table | Actual count |
| --- | ---: |
| assessments | 12 |
| audit_logs | 45 |
| cache | 14 |
| cache_locks | 0 |
| clinical_case_shares | 3 |
| clinical_validations | 2 |
| emergency_dispatch_history | 5 |
| emergency_dispatches | 2 |
| emergency_events | 5 |
| emergency_verifications | 8 |
| failed_jobs | 0 |
| function_responses | 15 |
| healthcare_facilities | 2 |
| job_batches | 0 |
| jobs | 0 |
| migrations | 29 |
| password_reset_tokens | 0 |
| patients | 12 |
| referral_status_history | 2 |
| referrals | 2 |
| refresh_token_families | 0 |
| refresh_tokens | 0 |
| regions | 1 |
| resource_allocations | 0 |
| resource_needs | 0 |
| response_units | 2 |
| risk_responses | 25 |
| sessions | 6 |
| shelters | 3 |
| spatial_ref_sys | 8500 |
| srq_responses | 105 |
| triage_results | 5 |
| users | 6 |

Assessments: **5 COMPLETED / 7 IN_PROGRESS**. The seven incomplete assessments
have no definitive triage. Emergency states: **1 PENDING / 3 CONFIRMED /
1 DOWNGRADED to T3**. The completed dispatch retains all four ordered history
states; the other remains ASSIGNED. These are scripted fictional histories.

The six sessions and fourteen cache rows are new authentication/rate-limit state
from the six browser logins; both tables were zero before those checks. All
clinical, organizational, audit and token table fingerprints were identical
before/after the smoke checks. No extra clinical cases were created.
Migrations remain 29 and spatial_ref_sys remains 8,500 rows with the same
fingerprint; PostGIS and post-additive schema/index/constraint fingerprints match.

## E. Credentials, notifications and preservation

Protected bundle: `storage/app/private/competition-fixture/credentials.json`.
It was absent at preflight, created once by FixtureCredentials, and validated by
that same mechanism after installation. Directory 0700, file 0600, ownership and
no-symlink/single-link checks passed. All six password hashes were verified;
all accounts are active and have their intended role/Posko/facility assignments.
No password, hash, token, cookie or recovery material was printed to tool output,
reports or tracked documentation. No credential was overwritten or rotated.

No external notification or real dispatch was sent by the seeder: transports were
inert and the five clinical broadcast event classes were suppressed inside fixture
execution. The focused no-mail/no-notification/no-job/no-HTTP regression passed;
seeder completion provenance explicitly identifies synthetic history and suppression.
Database jobs/failed_jobs/job_batches were zero after seeding and remain zero.

No old records remained in the 31 reset tables at empty verification. The new
fixture is now their replacement. Infrastructure/history outside that allowlist
was preserved. No historical backup was touched. .env, compose.yaml, scripts/c2,
Git history and index were preserved. Browser smoke used new private profiles,
never an owner profile; no clinical mutation was requested.

Private runtime evidence directory: `/tmp/rapid-mind-competition-resume-t1c6cd3g`.
JSON/SQL records contain only aggregate/fingerprint/schema information. Its generated
browser profile subdirectories contain private session state and must not be shared
as report artifacts. The parent and each profile directory are mode 0700. No raw
network capture, screenshots, password logging or public evidence upload was used.
Effective Inertia DevTools setting was false before browser checks.

## F. Manual testing readiness and limits

The database baseline is now ready for the owner's manual workflow matrix retained
below and in the runbook. Use http://localhost:8080 and credentials from the protected
bundle. Start with a **new disposable Relawan 1 profile**, actual login and encryption
enrollment/recovery confirmation, then hydrate patient 04 online before testing its
offline/ambiguous SRQ flow. Do not reuse the old PWA/outbox or fabricate IndexedDB.
The existing login quick-fill buttons still refer to historical demo accounts;
enter the protected competition credentials manually. No unrelated UI change was made.

Browser evidence is limited to six login forms, successful navigation and server
role projection: Admin /admin/summary, Relawan /relawan/home, Healthcare
/healthcare/emergencies. It does not establish clinical page acceptance, actual
new-profile encryption enrollment, offline behavior, realtime receipt, privacy
locking, Q17 confirmation/cancel, referral/dispatch UI acceptance or mobile behavior.
Those remain manual acceptance work. No complete clinical acceptance suite was run.
Personal-profile cleanup is manual and must be scoped only to http://localhost:8080;
new IDs and deleted sessions/tokens do not erase old local plaintext/ciphertext.

Existing acceptance classifications are preserved, not upgraded by this fixture:

| Classification | Status |
| --- | --- |
| P0 IMPLEMENTED | YES |
| P0 CORE BROWSER VERIFIED | YES |
| P0 LOCAL DEMO ACCEPTANCE | CONDITIONAL PASS |
| Natural background/foreground privacy locking | NOT TESTED |
| Production security acceptance | NOT ESTABLISHED |
| C2 | NOT ACCEPTED |
| C3 | NOT STARTED |

---

## Historical first attempt — superseded by successful continuation above

# Competition fixture execution — 10 November 2026

**STOPPED: focused test failure. Development reset was NOT EXECUTED.**

The current owner authorization permits a complete local data replacement without
another backup or routine approval. Execution stopped solely because the owner
explicitly required STOP on any focused-test failure. No maintenance or development
write was attempted. This is an incomplete execution, not a successful fixture baseline.

## A. Source changes and review artifact

Modified existing untracked preparation files:

- `database/seeders/CompetitionFixtureSeeder.php`: calls the new empty-data guard
  inside the existing transaction/advisory lock, after the completed-marker return,
  before credential creation. Pint also normalized import ordering and unary spacing.
- `tests/Feature/CompetitionFixtureSeederTest.php`: six new regressions cover unrelated
  patient, unrelated user, cache state, unexpected table, view dependency and
  cross-schema foreign-key dependency. The existing atomic-failure test now removes
  its test-only collision row before injecting a later workflow failure.
- `docs/checkpoints/competition-fixture-preparation.md`: records final authorization,
  disposable data, no backup/restore, historical-backup preservation, irreversible
  replacement, empty-data prerequisite and aggregate-only evidence. Removes the
  mandatory backup stage and all competition_backup_dir references. Adds Nginx and
  Reverb quiescence to prevent requests and stale connections during replacement.

Created:

- `database/seeders/Competition/FixtureEmptyDataset.php`: exact 31-table data allowlist;
  infrastructure excluded; rejects unexpected application relations, views, partitions,
  foreign tables, cross-schema tables and user triggers. Transactional table locks
  prevent ordinary concurrent writes between emptiness checks and fixture insertion.
  Error messages contain no records or SQL bindings. Completed rerun behavior is unchanged.
- This execution report.

The complete fixture-scope working-tree diff against committed HEAD is exported to
`/tmp/rapid-mind-competition-task-only.diff`. Since all original 11 fixture files were
already untracked at task start, this artifact includes their full contents, plus the
new guard and report; it is not presented as an incremental diff against their prior
untracked versions. It excludes all eight scripts/c2 files and performs no Git mutation.

No clinical scoring, authorization, historical seeder, Docker configuration,
dependency manifest or lockfile was changed. No dependencies were installed.

## B. Verification

Configured and actual focused-test target: `rapid_mind_testing`, APP_ENV=testing,
Docker PostgreSQL/PostGIS 3.5.2. Tests use DatabaseTransactions and an isolated
private temporary credential directory, inert transports and transactional additive
coordinate DDL; no RefreshDatabase, schema wipe or migration reset.

Exact focused command:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql \
  -e DB_DATABASE=rapid_mind_testing -e DB_URL= -e BROADCAST_CONNECTION=null \
  -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SESSION_DRIVER=array \
  -e CACHE_STORE=array app php vendor/bin/phpunit --do-not-cache-result \
  tests/Feature/CompetitionFixtureSeederTest.php
```

**FAIL: 16 tests, 272 assertions, 1 error**, PHP 8.4.26 / PHPUnit 12.5.36.
15 tests completed without reported failure/error. No rerun was attempted.

Failure: `test_unrelated_patient_blocks_first_installation_without_credentials`
creates a synthetic patient without required `created_by`. PostgreSQL rejects this
setup with SQLSTATE 23502 before the seeder/guard is reached. This is an agent-added
test setup defect, not evidence of a guard refusal or fixture success.
The test has deliberately not been silently fixed and rerun past the STOP boundary.

Smallest recovery: supply a valid unrelated synthetic creator for this patient test
inside its rollback-protected transaction, rerun the focused suite, then recheck the
full development preflight before any maintenance or data replacement. No development
reset, restore or recovery is needed for this failure.

Other actual checks:

- PHP syntax: PASS for all 11 fixture PHP files (including the new guard).
- Pint final check: PASS, 11 files. An initial three-file check reported one style
  issue in the seeder; focused Pint corrected it before the final all-file check.
- `git diff --check`: PASS. Untracked fixture contents are separately included in
  the review artifact; ordinary Git diff does not validate untracked files.
- Post-test read-only testing inventory: all 31 application tables remain empty;
  28 migration records, PostGIS 3.5.2 and 8,500 spatial_ref_sys rows remain.
  Schema SHA256 matches the pre-test value:
  `3bff66a3dac6454d9cfaa365ebc70626b04034ad2afc985398486a743de61b3d`.
  PostgreSQL sequences can advance through rolled-back test inserts; this is not
  a claim that every testing-database sequence value is unchanged.

No frontend build, broad backend suite, live authentication, browser, offline,
realtime or complete clinical acceptance suite was executed.

## C. Execution phases

| Phase | Result | Actual evidence / boundary |
| --- | --- | --- |
| Preflight | NOT EXECUTED in full | Initial read-only checks passed: demo branch, expected HEAD, Compose rapid-mind, six running services, local/rapid_mind, exact localhost origin, 28 migrations, PostGIS 3.5.2; only coordinate migration pending. Remaining full host/schema/dependency/writer safeguards were not completed. |
| Focused test gate | FAIL | 16 tests / 272 assertions / 1 setup error. |
| Maintenance | NOT EXECUTED | No services stopped; maintenance not enabled. |
| Coordinate migration | NOT EXECUTED | Development ledger remains at the observed 28-migration baseline. |
| Database reset | NOT EXECUTED | No destructive SQL was issued. |
| Empty-data verification (development) | NOT EXECUTED | Development still contains its old dataset. |
| Fixture seeding (development) | NOT EXECUTED | No fixture accounts or private credential bundle created by this task in development. |
| Fixture verification (development) | NOT EXECUTED | Initial-state verifier was inspected, not run against development. |
| Service recovery | NOT EXECUTED | No services were paused or changed. |
| Browser-origin cleanup | NOT EXECUTED | Personal profiles untouched; exact-origin cleanup remains manual. |

Docker initially required sandbox elevation for socket access; read-only service
inspection then succeeded. There was no automatic approval rejection.

## D. Observed development data (pre-reset inventory, not a new final fixture)

These are aggregate counts from the initial read-only inventory. Normal application
services remained active, so this is a point-in-time observation, not a frozen final
snapshot. The task performed no development writes.

| Table | Observed count |
| --- | ---: |
| regions | 1 |
| shelters | 7 |
| healthcare_facilities | 7 |
| users | 16 |
| response_units | 1 |
| patients | 34 |
| assessments | 26 |
| triage_results | 15 |
| clinical_validations | 5 |
| emergency_events | 44 |
| emergency_verifications | 56 |
| referrals | 14 |
| referral_status_history | 37 |
| emergency_dispatches | 0 |
| emergency_dispatch_history | 0 |
| clinical_case_shares | 0 |
| audit_logs | 116 |
| srq_responses | 349 |
| risk_responses | 75 |
| function_responses | 45 |
| sessions | 12 |
| refresh_tokens | 322 |
| refresh_token_families | 0 |
| password_reset_tokens | 0 |
| jobs | 0 |
| failed_jobs | 0 |
| job_batches | 0 |
| cache | 18 |
| cache_locks | 0 |
| resource_allocations | 1 |
| resource_needs | 1 |
| migrations (preserved infrastructure) | 28 |
| spatial_ref_sys (preserved infrastructure) | 8,500 |

## E. Security and preservation

- Old development records remain: their deletion was NOT performed or claimed.
- No passwords, password hashes, authentication tokens or recovery material were
  printed. The failed setup printed only the deliberately synthetic patient test row.
- Development seeder did not run. Focused tests exercised notification suppression;
  the inert-transport regression completed without reported failure/error. This
  does not certify all future runtime communications.
- No backup archive was created, opened for rewriting or deleted; no restore ran.
- No Git mutation occurred. The scripts/c2 diff SHA256 remained
  `01516861a7515ede54f030ddfa149b41c86f51da8cd13e148672fb353d1bb903`.
- No unrelated source was modified. The only SQL writes were rollback-protected
  focused tests in rapid_mind_testing; sequence advancement there is expected.
- No personal browser, PWA, IndexedDB, service worker or origin storage was accessed.
- Development credential identity/ownership and full schema drift checks remain
  pending; no claim that those reset prerequisites passed.

## F. Manual workflow readiness

**NOT READY for the new 12-patient fixture:** the database still has the old dataset.
The next action is to correct the test setup and pass the focused gate; after that,
complete the authorized controlled reset with fresh environment checks. Actual
manual acceptance starts only after post-reset verification: open a disposable
profile at http://localhost:8080, log in as the required synthetic role using the
protected bundle, establish real Relawan encryption enrollment and hydrate online.
No fixture contents may be fabricated directly in IndexedDB.

The existing intended matrix is retained below. Every state/action remains a planned
fixture or future manual test, not an installed development state in this execution.

| Patient | Owner / primary facility | Initial seeded state | Expected UI / future manual actions |
| --- | --- | --- | --- |
| 01 | R1 / A | Completed verbal; calculated T3; no validation/emergency | R1 result/history; A patient history, not pending T1/T2 validation. Check score evidence/immutability; B denied. |
| 02 | R1 / A | Completed verbal; calculated T1, no clinical decision | A pending validation; explicitly validate through UI, retain original recommendation; B direct-ID/mutation denied. |
| 03 | R1 / A | Completed calculated T1; scripted Healthcare T2 validation, no referral | A validated history; verify recommendation versus clinical outcome and immutable decision. Relawan does not gain clinical workflow authority. |
| 04 | R1 / A | IN_PROGRESS; YES, NO, UNCLEAR, UNANSWERED; Q17 UNANSWERED; no triage | Resume online after enrollment, then offline. Test single-unlock navigation/anchors/reload, ambiguity blocks completion, Q17 confirmation/cancel before saving YES; final manual T0 remains separate. |
| 05 | R2 / A | Completed NON_VERBAL; NOT_SPEAKING + OTHER note; calculated T2 | A pending validation with observational metadata and score evidence. Observations are not diagnosis/scoring/T0 inputs. Verify same score as its answers without metadata. |
| 06 | R2 / A | IN_PROGRESS NON_VERBAL; UNKNOWN only; empty SRQ; no triage | Edit reasons/mode with valid exclusive UNKNOWN/OTHER handling, hydrate locally online, then offline save/sync; no implicit answers or score. |
| 07 | R2 / A | Empty unfinished assessment plus PENDING medical T0-Suspect | A emergency-first queue; perform actual acknowledgement, secondary verification, explicit classification. Separately create a new manually confirmed offline T0 to exercise outbox/retry; no notification was emitted by seeding. |
| 08 | R2 / A | Scripted CONFIRMED T0; secondary/clinical audit history; no referral/dispatch | A active response work; explicitly assign unit A and/or create referral through eligible controls. Verify no external contact or false pickup claim. |
| 09 | R3 / B; explicit read share to A | Scripted CONFIRMED T0, active referral to A, linked ASSIGNED dispatch with unit B | B owns clinical/operational actions. A reads only shared emergency/linked assessment and cannot manage them. Progress response through supported states; unrelated B patient11 remains hidden from A. |
| 10 | R3 / B | Scripted T0 downgrade to T3, separate original report and decision, no referral/dispatch | B history shows explicit downgrade and original suspect; cannot silently overwrite decision or assign T0-only dispatch. A denied. New downgrade UI exercise requires a new manually confirmed suspect. |
| 11 | R3 / B | Scripted CONFIRMED T0 with COMPLETED dispatch (via ON_SITE → COMPLETED), no referral | B separate operational history; canonical rules may remove it from active response queue. A denied. Completed dispatch is not evidence a real vehicle moved. Unfinished associated assessment remains independent. |
| 12 | R3 / B; explicit assessment read share to A | Completed calculated T1, scripted clinical T1 validation and active non-T0 referral to A | B validated/referral history; A reads referred assessment only, not other B records. Complete referral explicitly under origin authority; no automatic Dispatch or facility acceptance. |


The suite created rollback-protected synthetic fixtures in the testing database.
It did not install the development fixture, prove browser behavior or perform human
clinical validation. Scripted histories are fictional. No complete manual suite ran.

Acceptance classifications remain unchanged:

| Classification | Status |
| --- | --- |
| P0 IMPLEMENTED | YES |
| P0 CORE BROWSER VERIFIED | YES |
| P0 LOCAL DEMO ACCEPTANCE | CONDITIONAL PASS |
| Natural background/foreground privacy locking | NOT TESTED |
| Production security acceptance | NOT ESTABLISHED |
| C2 | NOT ACCEPTED |
| C3 | NOT STARTED |
