# Checkpoint 2F-A — Read-only database and application cutover audit

**Audit date:** 24 October 2026, Asia/Jakarta (WIB).
**Inspected revision:** `4ff000326de49c44a8a1f5f1d517ddd8fd3e6958`, branch `demo`.
**Starting repository state:** clean. Current local source is the baseline.
**Decision:** preparation complete; **NO-GO for an automatic full cutover**.
No migration, seed, reset, backup, restore, service restart, or test was executed.

Labels used throughout:

- **CONFIRMED:** observed through local source/configuration or read-only database inspection; database facts identify the inspected database.
- **SOURCE-ONLY:** implementation behavior inferred from code, not exercised through HTTP/browser workflows here.
- **REPORTED TEST EVIDENCE:** an earlier checkpoint report, not a test run in this audit.
- **UNVERIFIED:** not established by this audit.
- **BLOCKED:** current prerequisite prevents the relevant operation.
- **REQUIRES OWNER APPROVAL:** a proposed future mutation or unresolved product/data decision.

## 1. Environment and inspection boundary

**CONFIRMED:** Compose services are `app`, `queue`, `scheduler`, `reverb`, `nginx`,
and `postgres`. All were already up; PostgreSQL was healthy. No service lifecycle
command was issued. PostgreSQL uses the existing `postgres-data` volume. Nginx
exposes the application on host port 8080.

| Identity | Observed value |
|---|---|
| Expected development database from configuration source | `rapid_mind` |
| Resolved app-container connection | `pgsql`, host `postgres`, port `5432`, database `rapid_mind` |
| App environment / configuration cache | `local` / not cached |
| Actual app-container PDO connection | Database `rapid_mind`, role `rapid_mind`, server `172.20.0.2/32:5432` at inspection |
| Development database OID / owner | `16384` / `rapid_mind` |
| PostgreSQL server | `17.5 (Debian 17.5-1.pgdg110+1)` |
| Development extensions | `postgis` 3.5.2 and `postgis_topology` 3.5.2 |
| Development encoding / locale | UTF8 / `en_US.utf8` collation and ctype |
| Backup clients installed in PostgreSQL service | `pg_dump` 17.5 and `pg_restore` 17.5 |
| Separate testing database | `rapid_mind_testing`, OID `24577`; PostgreSQL 17.5, PostGIS 3.5.2 |

Database identity was independently established from a whitelist of resolved
Laravel configuration fields before SQL inspection. A subsequent raw PDO
connection from `app` confirmed actual connectivity and database identity. It did
not boot application service providers, use Tinker, instantiate Eloquent models,
or invoke an HTTP endpoint. Credentials were used internally, not included in
this report. Worker/scheduler in-memory code/configuration freshness is
**UNVERIFIED**; sharing current files does not prove a long-running worker has
reloaded them.

All database inspection used explicit read-only transactions, with
`transaction_read_only = on`, ending in `ROLLBACK`. Development psql snapshots
were taken at 07:37:55, 07:39:03, 07:40:19, 07:41:54, and 07:43:04 UTC
(14:37–14:43 WIB). The app PDO identity check and testing metadata check were also
read-only. These are separate snapshots, not one audit-wide snapshot; other
already-running clients were not frozen. No claim is made that other clients
could not change records during or after inspection.

The two databases are separate logical databases in the same PostgreSQL service,
accessible using the existing database role. They are not separate physical
clusters. `phpunit.xml`, `Tests\TestCase`, and concurrency-worker checks separately
guard the testing name; **no tests ran against either database here**.

## 2. Migration inventory and actual schema

**CONFIRMED:** the repository contains 25 migration files. Development has 23
migration records, matching every migration before 24 October: the initial schema
(batch 1), clinical-validation Referral source (batch 2), phone field (batch 3),
and logistics tables (batch 4). There is no earlier pending migration and no
unrecognized applied migration in this inventory comparison.

Exactly two migrations are pending:

1. `2026_10_24_000000_add_referral_domain_foundation_columns.php`
2. `2026_10_24_000001_create_emergency_dispatch_domain_tables.php`

| Required object | Actual development state | Expected additive migration |
|---|---|---|
| `referrals.emergency_verification_id` | Absent | Nullable bigint FK to verification, deletion restricted |
| `referral_status_history.previous_status` | Absent | Nullable string |
| `referrals_id_emergency_unique` | Absent | Unique `(id, emergency_event_id)` supporting composite Dispatch FK |
| `response_units` | Absent | Code uniqueness, active flag, optional facility with restricted deletion |
| `emergency_dispatches` | Absent | UUID identity; one per emergency; optional unique linked Referral; unit/actor/time and target snapshot |
| `emergency_dispatch_history` | Absent | Event/previous/current status, actor/time/notes/JSONB metadata |

This is an **absent deployment**, not partial or complete deployment. Dispatch
and response-unit record/status counts in development are **not applicable**:
there are no tables to count. Do not report these as zero deployed records.

**CONFIRMED:** existing Referral columns match the pre-2B structure, including
nullable emergency/clinical-validation sources, required patient/referrer/facility,
and string status default `ACTIVE`. History has ID, Referral, string status,
actor, notes, and timestamps. The only indexes on these two tables are their
primary keys. No Referral status CHECK or source-cardinality uniqueness exists.
Existing FKs are validated. Referral emergency and clinical-validation deletion
uses `SET NULL`; patient/referrer/facility and history-parent/actor deletion uses
`CASCADE`. These are audit-retention risks, not changed in this audit.

Catalog checks found **zero expected new relation/index-name collisions** and
**zero expected new constraint-name collisions**. The first migration precedes
its dependent Dispatch composite FK; all referenced parent tables already exist.
The `(id, emergency_event_id)` unique index is compatible with current primary-key
uniqueness. Adding the two nullable columns does not require a data backfill to
apply 2B. New-table checks constrain Dispatch statuses, target source, coordinate
pairs/ranges, target presence, and history enum values. New Dispatch FKs restrict
parent deletion. These constraints are **SOURCE-ONLY**, not deployed development
constraints. State-edge validity, same-patient clinical provenance, actual confirmed
verification, GPS/Posko-specific eligibility, and snapshot immutability still rely
on workflow services; the SQL checks do not implement all service rules.

**CONFIRMED testing metadata:** `rapid_mind_testing` currently records all 25
migrations, including both 2B files, and contains all three Dispatch-domain tables.
This confirms testing deployment, not development deployment or a new test pass.

**REPORTED TEST EVIDENCE:** 2B reports 115 tests/1,210 assertions, including a
fresh `RefreshDatabase` migration chain on guarded PostgreSQL/PostGIS. 2C reports
149 tests/1,670 assertions including four concurrency scenarios. 2D+2E reports
173 tests/2,057 assertions including concurrency. Overlapping runs are not summed.
`EmergencyDispatchDomainTest::test_fresh_migration_chain_creates_the_domain_and_postgis_remains_available`
provides source coverage. These reports do not prove arbitrary empty-database
provisioning: spatial migrations use geometry types without installing PostGIS.
A newly provisioned replacement database must have the required PostGIS extension
before those migrations run. No fresh chain was run in this audit.

## 3. Legacy Referral data

**CONFIRMED development aggregate counts:**

| Current status | Emergency origin | Clinical-validation origin | Total |
|---|---:|---:|---:|
| ACTIVE | 6 | 1 | 7 |
| EN_ROUTE | 0 | 0 | 0 |
| ON_SITE | 2 | 0 | 2 |
| TRANSPORT | 0 | 0 | 0 |
| COMPLETED | 3 | 2 | 5 |
| **Total** | **11** | **3** | **14** |

There are zero unknown statuses, missing/dual source associations, missing
Referral patients, referrals to unidentified emergency patients, patient/source
mismatches, orphan sources/patients/facilities/referrers, or inactive destination
facilities. All emergency-origin sources are currently CONFIRMED and each has
exactly one actual `T0_CONFIRMED` verification candidate. All assessment-origin
contexts checked reference completed assessments with `referral_required = true`.
Duplicate groups/excess records are zero per emergency, per clinical validation,
and per assessment's clinical validations.

These counts do not authorize a backfill or retroactively attest clinical validity.
The new verification reference cannot be populated in the current schema. All
**11 emergency-origin Referrals** would need an explicit source-reference decision
if the final schema makes that reference mandatory. The unique candidate in each
case supports a proposed backfill; no such write has been approved or executed.

Exactly **2 distinct current Referral records** fail a proposed current-status
restriction to `ACTIVE`/`COMPLETED`; both are emergency-origin `ON_SITE`. The union
of measured current-status/source/duplicate anomalies is also 2. This is not the
entire historical preservation workload:

| Historical measure | Count |
|---|---:|
| Referral history rows / Referrals represented | 37 / 14 |
| History ACTIVE / EN_ROUTE / ON_SITE / TRANSPORT / COMPLETED | 14 / 7 / 7 / 4 / 5 |
| Movement-status history rows outside the target clinical enum | 18 |
| Distinct Referrals with such history | 7 |
| Initial history rows / later transition rows | 14 / 23 |
| Missing history timestamps / orphan histories / missing actors | 0 / 0 / 0 |
| Referrals without history / latest-history status mismatches | 0 / 0 |
| Unexpected observed legacy edges ordered by timestamp and ID | 0 |
| Existing global audit rows | 104 |
| Referral/Dispatch entity audits or `REFERRAL_*`/`DISPATCH_*` actions | 0 |

`previous_status` is **absent**, so none of the 37 rows currently stores that
field. Fourteen initial rows may legitimately have no previous status; the other
23 lack an explicit stored previous state. Ordered `lag(status)` was used only
for aggregate consistency checking, not a backfill or a claim that previous
states were originally recorded.

The two current intermediate records and 18 historical movement entries are
overlapping populations, not 20 different Referrals. Five currently COMPLETED
records also retain their legacy semantics; do not silently reinterpret past
operational completion as a new clinical acceptance/treatment event. Historical
movement rows must remain readable even if the current Referral cast becomes
clinical-only. A strict clinical history cast/CHECK would reject those 18 rows.
Absence of domain audit actions does not erase the 37 existing history records;
do not manufacture retrospective audit actions attributed to past users.

## 4. Data that a reset would affect

**CONFIRMED:** 10 users, 24 patients, 16 assessments, 36 emergencies, 5 clinical
validations, 7 facilities, 7 shelters, 1 resource need, 1 allocation, and 104 audit
records are present. There are **7 users outside the three base demo accounts**.
Five emergencies are unidentified; three of those are CONFIRMED. No patient
identity, NIK, individual notes, or record-level clinical content was extracted.

**UNVERIFIED:** whether every current record is synthetic/disposable, which
accounts/facility/Posko configuration must survive, and whether a usable existing
backup exists. Earlier disposable-development-data direction is not treated as
permission to discard this current snapshot. A clean rebuild recreates only the
seeded subset unless an approved preservation/reprovisioning plan is supplied.
**SOURCE-ONLY risk:** existing browser sessions, owner-scoped Dexie records and
unsent outbox entries may retain old internal user/patient/assessment identifiers.
A clean reset needs an approved client/session recovery plan that preserves unsent
field data; a database dump does not include device-local IndexedDB. No browser
storage was inspected, cleared, or changed here.

## 5. Application compatibility and coordinated components

**SOURCE-ONLY:** Referral and Dispatch remain separate; assignment requires a
confirmed emergency and active unit but no Referral or identified patient.
Assessment validation/referral creation never automatically creates Dispatch.
Neither completion changes clinical classification. The `ON_SITE → COMPLETED`
Dispatch branch is retained. Unknown/intermediate legacy Referral values are not
mapped to clinical values by the new completion command; they conflict.

| Component group | Current dependency / final cutover coordination |
|---|---|
| `app/Enums/ReferralStatus.php`, `ClinicalReferralStatus.php` | Legacy five-state lifecycle versus two-state clinical target; coordinate writers/validators/casts and equality checks, not just enum declarations |
| `app/Models/Referral.php`, `ReferralStatusHistory.php` | Both still cast to legacy enum; current rows and historical movement rows need separate preservation/read decisions before stricter casts |
| `HealthcareController::createEmergencyReferral` | Explicit creation; writes `emergency_verification_id`; retains same-destination replay/source checks |
| `HealthcareController::validateAssessment` and `ClinicalReferralWorkflow::recordCreated` | Non-T0 creation plus atomic history/audit; history writes now include `previous_status` |
| `HealthcareController::updateReferralStatus`, `routes/web.php` | Legacy `/referrals/{id}/status` still validates and writes movement states; retirement/error contract needs approval |
| `ClinicalReferralWorkflow::complete` | New ACTIVE→COMPLETED path, expected status, exact replay, source locks; uses new history column and legacy enum in persisted writes/comparisons |
| `DispatchWorkflow`, `DispatchTargetSnapshot`, `HealthcareWorkflowAccess` | Independent transaction/lock/replay/source/unit/target rules; do not reconstruct assignment unit/time/location from legacy movement statuses |
| `HealthcareOperationsRead` and controller read methods | Schema gate, eager-loaded independent projections, queue membership and patient active-T0 projection; do not equate Referral completion with Dispatch completion |
| `Healthcare/Referrals/Index.vue`, `lib/referralStatus.ts`, `lib/healthcareOperations.ts`, `ClinicalReferralCard.vue` | ACTIVE clinical completion versus explicit legacy controls; retain accurate source/status labels until approved retirement |
| Emergency Index/Show, `EmergencyActionsTab`, Overview/History components | Sibling Referral/Dispatch actions and legacy status consumers; keep acknowledgement/classification and queue ordering intact |
| Patient Show and `OperationsTimeline.vue` | Preserve source clinical history and legacy status evidence; do not invent Dispatch from Referral |
| `HealthcareWorkflowEvents`, `DispatchUpdated`, `ReferralUpdated`, `EmergencyUpdated`, `HealthcareLayout.vue`, `routes/channels.php` | ID-only post-commit events, Healthcare-only `emergencies` channel, best-effort delivery, one subscription owner, authoritative reconciliation |
| `useHealthcareDraft`, `useHealthcareOperation`, `useEmergencyActions`, `healthcareReconciliation` | Latest acknowledged draft baseline, disposal protection, independent dirty forms, explicit manual/conflict refresh; preserve reviewed fixes |
| `DemoSeeder`, `DispatchDemoSeeder`, `DatabaseSeeder`; Referral/Dispatch factories | Seed only after prerequisites; target clinical seed statuses already independent; factories/tests still use legacy enum in places |
| Domain/lifecycle, Healthcare workflow/concurrency/integrity/projection/realtime, seeder and Node tests | Preserve concurrency/rollback/source/role/draft tests; update deliberate legacy compatibility expectations only with approved retirement contract |

### Schema-dependent behavior before deployment

**BLOCKED:** Dispatch commands cannot run without their tables; new explicit T0
Referral creation references the missing verification column. Both source-specific
Referral creation paths use history writes containing the absent previous-status
column. New clinical completion and legacy status progression also use that
history column. These are concrete write dependencies despite schema-aware reads.
No mutation was attempted to reproduce a failure.

**SOURCE-ONLY:** missing-schema reads currently expose `operations.available:
false`, suppress new Dispatch controls, and conservatively retain confirmed T0.
This fallback is not a guarantee that legacy mutations still work against the old
schema. Applying 2B would immediately make the schema readiness check true and
activate new UI behavior: ACTIVE referrals offer clinical completion instead of
legacy movement buttons. Unit options would initially be empty until explicitly
provisioned/seeded. Approving schema deployment therefore must acknowledge the
already-committed UI activation; it is not merely an invisible schema change.
Applying 2B alone does **not** retire the legacy endpoint or create final constraints.

### Completed Dispatch without Referral

**SOURCE-ONLY:** the queue excludes a confirmed case when Dispatch is COMPLETED
and no unfinished Referral remains, including a case with no Referral at all.
Identified patients retain the emergency in Patient → Darurat history, its timeline,
and the existing emergency-detail link. The detail endpoint loads by ID without
an active-queue filter. An unidentified case has no patient-history entry: its
known emergency URL still works, but no general completed-emergency archive exists
for rediscovery. This matters for the three currently confirmed unidentified
emergencies once Dispatch is enabled. Queue policy was not changed by this audit.

## 6. Constraints and migration risks

1. **SOURCE-ONLY:** additive 2B migration ordering is valid and no present-name or
   data collision was found. Future deployment still requires lock/downtime
   planning and fresh preflight checks; this is not execution approval.
2. **REQUIRES OWNER APPROVAL:** final current-status CHECK/enum, source XOR,
   source-cardinality uniqueness, required verification provenance, and deletion
   retention changes have no final cutover migration in the current inventory.
   Define exact semantics before implementing them. The 2B foundation deliberately
   does not enforce all of these final restrictions.
3. A unique-per-source constraint currently has no duplicate blockers. A clinical
   current-status restriction has 2 blockers. Required emergency verification has
   11 references to decide/populate. Strict clinical-only history would invalidate
   18 historical entries. These populations must not be conflated.
4. Matching patient/decision result across tables is not enforced by a simple
   single-table CHECK. Retain service guards; separately approve any composite FK
   or other final enforcement design rather than claiming 2B already covers it.
5. Current `CASCADE`/`SET NULL` legacy FKs can erase/orphan provenance after parent
   deletion. New Dispatch restrictive FKs do not retroactively fix unlinked legacy
   Referral/history relationships. Retention changes need dependency-aware design.
6. Enabling restrictive status checks while the old endpoint can still write
   movement values causes failed requests. Switching both history/current casts
   before data handling causes cast failures. Coordinate code and constraint
   activation as one reviewed release.
7. Completing a legacy Referral does not create an actual Dispatch. Existing
   confirmed cases with past movement-completion evidence but no Dispatch may
   reappear as needing operational attention. Do not fabricate historical unit
   assignment, target snapshots, or operational completion to hide this mismatch.

## 7. Cutover strategies

| Dimension | A — Incremental, preserve existing records | B — Clean disposable development rebuild |
|---|---|---|
| Data retention | Retains all current records/history/configuration | Removes current live data unless preserved separately; a backup is recovery evidence, not live continuity |
| Immediate schema path | Approved additive 2B migrations with compatible application | Provision PostGIS then replay full migration chain and seed approved fixtures |
| Legacy status handling | Explicit decision for 2 ON_SITE records; retain 18 legacy history entries; approve 11 provenance references if required | No legacy conversion in replacement data; deterministic fixtures start with independent domains |
| Final lifecycle retirement | Staged code/constraint changes after approved legacy resolution | Still requires final code/constraint implementation; rebuilding current migrations alone retains legacy endpoint/casts |
| Historical truth | Keep original events; no invented Dispatch backfill | Preserve original full database/backup for history before discarding live records |
| Main risk | Mixed old/new consumers, ambiguous past operational completion, migration locks and backfill correctness | Irreversible loss of accounts/configuration/history; fixture set is not a full reproduction of present data |
| Rollback | Compatible additive schema can remain while reverting to a verified compatible release; later data/constraint changes require restore | Complete database recovery plus matching application/configuration; reseeding is not recovery |
| Downtime | Freeze writes for coordinated migration/validation; assess locks | Freeze, rebuild/seed/verify, then release; more visible disruption unless a separately approved replacement database is prepared first |
| Required tests | Migration on preserved snapshot; history readability; all writers/retired routes; source and concurrency regressions | Fresh PostGIS chain, repeat seed, final lifecycle tests, preserved configuration plan, browser scenarios |

**Recommendation — REQUIRES OWNER APPROVAL:** preservation-first Strategy A is
the safest default for the observed database. Apply only the reviewed additive
foundation in a separately authorized window, preserve legacy histories/casts,
and keep full legacy retirement blocked until the two current intermediate
records and provenance/history policies are resolved. This is a staged strategy,
not a claim that additive deployment completes cutover.

Strategy B remains a reasonable prototype alternative under the earlier disposable
data direction, but only after the owner explicitly declares this current dataset
replaceable and approves what happens to the seven additional accounts, configuration,
logistics, and audit evidence. Prefer rehearsing a clean replacement in a distinct,
new database while retaining the original over an unverified in-place reset. If
that approval is given, B avoids manufacturing operational provenance from legacy
movement data; convenience alone is not sufficient justification.

## 8. Backup and recovery proposal — not executed

**REQUIRES OWNER APPROVAL:** creating a backup, creating a recovery database,
restoring, changing application target configuration, quiescing writers, or restarting
services are future operations. No dump was created or copied into the repository.

Before any mutation:

1. Reconfirm resolved app connection and `SELECT current_database(), current_user`
   against the exact intended target. Confirm Compose project/service, PostgreSQL
   major version, PostGIS versions, database owner/encoding/locale, and application
   revision/configuration. Reject testing or a similarly named target.
2. Agree a write-freeze window covering web/API ingest, queues, scheduler, and
   offline-client replay. Existing workers can write even when a page is unavailable.
   Record backup time and define treatment of all later accepted writes. This audit
   did not freeze them or inspect pending job/session contents.
3. Back up the **whole development database**, including schema, sequences,
   migration records, users/memberships, facilities/shelters, patient/source data,
   histories/audits, logistics, and relevant database-backed application state.
   Keep the matching code revision and securely preserved application/authentication
   configuration and keys outside the repository. A database dump does not back up
   uploaded files, host/container configuration, or cluster-wide roles/secrets.
4. Use the inspected PostgreSQL 17 client with the 17 server. Keep PostGIS binaries
   compatible on recovery, provision required roles separately, and preserve encoding/
   locale. A dump produced by a newer server is not guaranteed to restore to an older
   major version. Validate actual restoration rather than assuming compatibility.
5. Use an owner-approved encrypted/access-controlled backup location outside the
   repository and Docker data volume, sufficient free space, restricted permissions,
   and a second protected copy. Do not embed credentials in command lines or reports.

Illustrative future backup commands, **NOT RUN**; destination placeholders must be
replaced with an approved path and creation itself needs approval:

```bash
umask 077
cutover_archive='/approved-secure-backup-location/rapid_mind-20261024.dump'
docker compose exec -T postgres psql -X -U rapid_mind -d rapid_mind \
  -v ON_ERROR_STOP=1 -c 'BEGIN READ ONLY; SELECT current_database(), current_user; ROLLBACK;'
docker compose exec -T postgres pg_dump -U rapid_mind -d rapid_mind --format=custom \
  > "$cutover_archive"
sha256sum "$cutover_archive"
docker compose exec -T postgres pg_restore --list < "$cutover_archive"
docker compose exec -T postgres pg_restore --file=/dev/null < "$cutover_archive"
```

Check every command's exit status and archive size before proceeding; a shell can
create an empty destination even when `pg_dump` fails. `--list` validates the table
of contents, not a successful data restoration. Generating SQL to `/dev/null`
checks archive readability without connecting to a database; neither check replaces
a restore rehearsal.

Restore rehearsal must use a **new, explicitly named isolated database**, such as
`rapid_mind_restore_verify_20261024`, never `rapid_mind_testing` or the live database.
First independently confirm that the proposed name does not already exist. Only
then, with explicit approval, create it with the appropriate owner/locale/template
and restore the archive into that empty database:

```bash
# Future approved rehearsal only; NOT RUN. Verify target name first.
cutover_restore_db='rapid_mind_restore_verify_20261024'
docker compose exec -T postgres createdb -U rapid_mind --owner=rapid_mind \
  --template=template0 "$cutover_restore_db"
docker compose exec -T postgres psql -X -U rapid_mind -d "$cutover_restore_db" \
  -v ON_ERROR_STOP=1 -c 'BEGIN READ ONLY; SELECT current_database(), current_user; ROLLBACK;'
docker compose exec -T postgres pg_restore -U rapid_mind \
  --dbname="$cutover_restore_db" --single-transaction --exit-on-error \
  --no-owner --no-acl < "$cutover_archive"
```

These commands intentionally omit `--clean` and `--create` for restoration: they
must not silently replace an existing database or objects. If an empty-target
restore reports object/extension/ownership conflicts, stop and review; do not add
destructive flags against a live target. Restoring with `--no-owner --no-acl`
requires deliberate validation/reapplication of intended ownership/grants. The
archive retains the original metadata; cluster roles and secret handling remain
separate prerequisites.

Validate restored database identity, extensions, all migration records, schema/FKs/
checks, sequence state, aggregate counts/statuses, source integrity, histories,
audits, and approved account associations. A compatible application must then be
verified against the isolated restored copy without sending external notifications.
No such rehearsal or application connection was performed here.

A production-target restore would replace/overwrite the selected target's state
and lose newer records. Prefer a restored replacement plus an approved application
connection switch; retain the failed/current copy for investigation. Reverting only
Git/application files cannot recover deleted records or reversed clinical history.
Migration rollback of 2B drops Dispatch tables and the new columns: it destroys
assignments/provenance/history fields created after deployment and is not a safe
general rollback. Recovery after destructive changes requires the complete verified
database backup, compatible application revision/configuration/keys, roles/extensions,
and an explicit decision about post-backup writes.

## 9. Synthetic fixture deployment prerequisites and browser mapping

**CONFIRMED development prerequisites:** the three base demo accounts exist with
expected active roles; Healthcare has an active facility and Relawan has a usable
shelter association. Existing additional account privileges were not changed.
The deterministic 2DE emergency, assessment, patient, and Referral ID prefixes have
zero collisions in the inspected database. Response-unit code collision cannot
currently exist in a table that is absent; recheck after schema deployment.

**SOURCE-ONLY:** `DatabaseSeeder` calls `DemoSeeder`, which conditionally calls
`DispatchDemoSeeder` when the additive schema is ready. The dedicated seeder fails
explicitly if its schema/active base actors/active Healthcare facility are absent.
It creates the unit using stable code `SYNTHETIC-2DE-01` and reuses existing actor
memberships rather than changing privileges. Newly created patients/notes are
marked synthetic. Root/patient/Referral UUIDs are deterministic; Dispatch/history
IDs are generated once and retained by their stable root relationships. Each
scenario transaction skips an existing root, preserving later manual progression;
it does not repair a partially hand-edited existing fixture.

`DemoSeeder` is **not** universally read-only or a universal reset-safe merge: it
can fill missing demo associations/phone values, initialize spatial coordinates,
create missing records, and complete known assessment/emergency seed fields. It
uses existing lookup keys that may collide with manually created records. Running
only `DispatchDemoSeeder` after separately verifying existing base actors minimizes
unrelated seeder effects for Strategy A. A clean Strategy B run may use the complete
base seeder only after approved migration/PostGIS prerequisites. Credentials from
seed definitions are intentionally omitted. A future seed can emit normal post-commit
Healthcare notifications; coordinate observers and verification sessions accordingly.

| Scenario | State | Later Antigravity location/action |
|---|---|---|
| 1 | Confirmed T0, no Referral/Dispatch | Emergency queue → Tindakan; independent creation/assignment forms |
| 2 | ASSIGNED Dispatch, no Referral | Queue → Respons Lapangan; progress without requiring Referral |
| 3 | ACTIVE Referral + EN_ROUTE Dispatch | Queue and Rujukan; display independent statuses/unit/target |
| 4 | ON_SITE Dispatch, later linked Referral | Emergency history → assignment/link/status order and actors; Posko snapshot |
| 5 | TRANSPORT | Emergency actions → terminal Dispatch confirmation |
| 6 | COMPLETED Dispatch, ACTIVE Referral | Queue remains because Referral is active; complete only Referral |
| 7 | COMPLETED Referral, ON_SITE Dispatch | Queue remains because Dispatch is unfinished; test independent completion |
| 8 | Both complete, direct ON_SITE completion branch | Patient → Darurat and Rujukan histories/detail link; absence from active queue |
| 9 | Unidentified confirmed T0 + ON_SITE, no Referral | Queue/detail → manual target and Dispatch without identity; preserve known URL before completion |
| 10 | Non-T0 ACTIVE clinical Referral, no Dispatch | Rujukan and patient history → clinical completion; no automatic Dispatch |

The matrix covers the requested representative combinations, not every browser
edge case. Scenario 9 becomes the completed-unidentified rediscovery check if
progressed later; no extra fixture or queue change is introduced here.

**BLOCKED:** Dispatch UI runtime verification needs the missing 2B schema and
active units. **UNVERIFIED:** current built/hot asset freshness, live Reverb delivery,
reconnects, real browser draft cancellation/reset/conflicts, native-dialog keyboard
focus, responsive layouts, and worker freshness. Antigravity should run only after
owner-authorized runtime preparation, using synthetic actors/patients and two
separate Healthcare sessions where needed. Verify role boundaries, normal and
ON_SITE completion branches, exact-retry/no-duplicate histories, stale conflicts,
non-T0 events, reconnect reconciliation, stable selected case, and latest-acknowledged
baseline behavior including saved nonempty → edited empty. A build or prior Node/
Laravel result is not browser evidence.

## 10. Owner decisions and recommended sequence

Every item below is **REQUIRES OWNER APPROVAL**:

- T3 downgrade support versus the earlier Healthcare T1/T2 restriction. Preserve
  current clinical behavior until explicitly resolved; no policy change is part
  of schema rollout.
- Treatment of the 2 current ON_SITE Referrals, 18 legacy movement history rows,
  11 prospective verification references, and past completed operational semantics.
  No automatic movement-to-Dispatch or movement-to-clinical conversion is approved.
- Whether and when to replace the legacy movement lifecycle/endpoint/casts, what
  error contract retired clients receive, and how legacy history remains readable.
- Preservation versus disposal of the current development snapshot and additional
  accounts/configuration; Strategy A versus B and the allowed downtime/write window.
- Exact final constraints and their activation order, including retained historical
  exceptions and parent-deletion/audit retention behavior.
- Rediscovery of completed unidentified emergencies; current known-ID access does
  not supply an archive. Do not change active-queue membership implicitly.
- Backup destination/retention, isolated restore rehearsal, recovery checks, and
  handling of any accepted writes after the backup.

Recommended next sequence, **proposal only**:

1. Review this report and approve a specific data strategy, preservation inventory,
   legacy treatment, and scoped preparation window. Full cutover remains blocked
   pending these choices.
2. Approve backup and isolated restore rehearsal; validate recoverability and record
   a matching application/configuration recovery point before any destructive action.
3. Recheck live identity/migration inventory/counts immediately before the window.
   Approve quiescing ingest/queue/scheduler work and any later service restarts.
4. For A, apply only the reviewed two additive migrations in order, verify schema
   and constraints, then approve dedicated synthetic fixture seeding if desired.
   For B, first rehearse new PostGIS database provisioning and full chain/seeding
   on a separately approved replacement; do not reset the live database by default.
5. Verify real schema readiness, response units, source/history integrity and UI
   activation. Retain legacy compatibility until approved data decisions and the
   coordinated final code/constraint release are implemented and tested in isolation.
6. Perform the separately approved final application/constraint cutover with all
   writers/readers/tests coordinated. A rebuild of current code alone is insufficient.
7. Prepare synthetic scenarios for Antigravity, then perform separately scheduled
   browser/realtime/role/draft/history verification. Obtain owner sign-off before
   declaring 2F/2G complete; retain the recovery copy until explicitly released.

## 11. Evidence sources, executed commands, and limitations

Read-only repository inspection used `git status --short`, `git rev-parse HEAD`,
`git branch --show-current`, `git log -4 --oneline`, `rg`, file reads, and hashes.
Reviewed `AGENTS.md`, finalized workflow, current implementation register, technical
plan, Healthcare/referral interaction specifications, 2B/2C/2DE reports, verification
ledger, Compose/database configuration, migration inventory, models/enums, controllers/
services/events/routes, Healthcare pages/components/composables, seeders/factories,
and relevant test source. Older current-state documentation still says 2D/2E is
pending/backend-only; commit `4ff0003` and current source supersede those status
claims for this audit. Those documents were not edited.

Executed infrastructure inspection, with no service changes:

```text
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
docker compose exec -T app php -r <whitelisted configuration inspection>
docker compose exec -T app php -r <raw PDO read-only database identity check>
docker compose exec -T postgres psql -X -U rapid_mind -d rapid_mind -v ON_ERROR_STOP=1
  (five SELECT-only metadata/aggregate transactions, each BEGIN READ ONLY … ROLLBACK)
docker compose exec -T postgres psql -X -U rapid_mind -d rapid_mind_testing -v ON_ERROR_STOP=1
  (one SELECT-only identity/extension/migration/table metadata transaction)
docker compose exec -T postgres pg_dump --version
docker compose exec -T postgres pg_restore --version
```

The first app PHP inspection loaded only Laravel environment/configuration
bootstrappers and applied `ConfigurationUrlParser`; it printed a whitelist of
app environment/cache and connection driver/host/port/database/username. The PDO
check used that configuration, checked the expected driver/database before SQL,
then executed only an identity SELECT inside a read-only transaction. No application
providers or workflow commands ran.

Representative executed SQL contracts (all inside read-only transactions):

```sql
SELECT current_database(), current_user,
       current_setting('transaction_read_only'), current_setting('server_version');
SELECT datname, oid, datallowconn FROM pg_database
WHERE datname IN ('rapid_mind', 'rapid_mind_testing');
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('postgis', 'postgis_topology');
SELECT migration, batch FROM migrations ORDER BY migration;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN
 ('referrals', 'referral_status_history', 'response_units',
  'emergency_dispatches', 'emergency_dispatch_history');
SELECT conrelid::regclass, conname, contype, convalidated,
       pg_get_constraintdef(oid) FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN
 ('referrals', 'referral_status_history', 'response_units',
  'emergency_dispatches', 'emergency_dispatch_history');
SELECT status, count(*) FROM referrals GROUP BY status;
SELECT status, count(*) FROM referral_status_history GROUP BY status;
```

Actual constraint queries restricted results to relevant tables/names. Additional
aggregate SELECTs measured source intersections, duplicates, missing/orphan/mismatched
associations, confirmed-verification candidate counts, history actor/time/latest-state
consistency and ordered legacy edges, audit-domain counts, table totals, base-demo
prerequisites, deterministic-ID/name collisions, and unidentified-emergency totals.
No individual patient or clinical record content was selected. Metadata and counts
are evidence of this snapshot, not clinical validation or proof of disposable data.

**Verification:** the sole repository addition is this report. Existing tracked
files were compared against pre-audit SHA-256 values; `docs/workflow.md` is unchanged.
`git diff --check` plus a direct new-report whitespace check were performed. No
source/configuration/environment/test/dependency file was modified. No development
or testing data/schema writes, migration/seeder/test execution, backup/restore,
container lifecycle action, browser action, or Git mutation was performed. A SELECT
inspection cannot establish historical absence of outside writes; the audit's own
sessions were explicitly read-only.

**Remaining UNVERIFIED / BLOCKED:** backup existence/readability/restorability,
true disposability, production or external clinical/response behavior, actual HTTP/
browser success, runtime asset/worker freshness, future lock duration and constraint
activation, and owner decisions listed above. Stop at 2F-A; no later stage is
implicitly authorized by this report.
