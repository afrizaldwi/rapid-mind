# Checkpoint 2F-B2.1 — Additive schema deployment preflight

Date: 24 October 2026, Asia/Jakarta (WIB). Times below are UTC unless stated.
Inspected revision: `4ff000326de49c44a8a1f5f1d517ddd8fd3e6958`, branch `demo`.

**Technical preflight PASS; NO-GO for migration execution now.** The two additive
migrations have owner approval subject to recovery, identity, and maintenance
gates. Separate approval of the service actions below and an effective write-freeze
are still required. No service action or migration was executed in this preflight.
This does not authorize final Referral lifecycle cutover or clinical-policy changes.

## Scope and evidence

Read `AGENTS.md`, read-only `docs/workflow.md`, the 2F-A audit, 2F-B1 recovery
report, 2B foundation, 2C backend, 2D+2E integration reports, and `compose.yaml`.
Inspected actual migrations, database/queue/cache/session configuration, PHP image,
Nginx routing, console schedules, Healthcare schema/read gates, Referral casts,
realtime events, and Relawan synchronization triggers. Earlier test results are
historical evidence only; no tests were run in this checkpoint.

Existing owner changes at entry were additions of `docs/checkpoint-2f-cutover-audit.md`
and `docs/checkpoints/checkpoint-2fb1-backup-restore.md`. Both were preserved.
This report is the only repository file created or modified by this checkpoint.
Temporary inspection helpers/evidence were kept under `/tmp`; backup artifacts
were read only. No patient-level data or credentials are included here.

## Recovery point independently reverified

Archive:
`/home/saga/Backups/rapid-mind/rapid_mind-20261024T080758_876733Z-bd942021.dump`

| Check | Current result |
|---|---|
| Exists; regular file; checked backup paths are not symlinks | PASS |
| Exact size | 109,432 bytes, matches expected |
| SHA-256 | Matches expected value below |
| Custom archive header | `PGDMP` |
| `pg_restore --list` | Exit 0; 224 TOC entries |
| `pg_restore --file=/dev/null` | Exit 0; full readability, no warnings; no database connection |
| Archive ownership / permissions | UID 1000; 0600 |
| `/home/saga/Backups` and its `rapid-mind` directory | UID 1000; 0700 |
| Protected restore-result manifest | Successful restore, exit 0, verification passed, all comparison flags true |
| Isolated restore database | Exists; actual read-only connection verified |

```text
82c15d04c594c38d424fa04432302767fb6a9225c141f0b77154e3b8e2cda663
```

The restore database is `rapid_mind_restore_verify_20261024_080951_724620`,
OID 102069, owner `rapid_mind`, same verified PostgreSQL cluster. It still has
23 migration records and the expected five extensions. The 2F-B1 report and
protected result manifest document successful restoration and verification at
`2026-10-24T08:09:54.321535+00:00`. This preflight independently checked its
availability/identity/migrations/extensions, not another full restore or another
64-table clone verification. No archive, manifest, or restored database was altered.

Recovery snapshot: `2026-10-24T08:07:59.010753+00:00` (15:07:59 WIB).
At-rest encryption remains unestablished; owner-only filesystem permissions are
verified. There is no verified off-host copy. The archive and PostgreSQL volume
share a host filesystem, so this is not protection from loss of that host/disk.
The earlier retained `.dump.partial` is not the primary recovery archive.

Host backup filesystem free space: 160,594,993,152 bytes at inspection.
PostgreSQL data filesystem free space: 160,594,669,568 bytes (64% used).
Development database size: 22,793,363 bytes; restore database: 21,089,427 bytes;
testing database: 21,925,011 bytes. Capacity comfortably exceeds this small
additive deployment's anticipated growth/index work; recheck immediately before
execution. This is a capacity check, not a measured future lock/runtime guarantee.

## Database identity and inspection safety

Configuration was resolved inside `app` using only Laravel environment/configuration
bootstrappers and `ConfigurationUrlParser`. No application service-provider boot,
Tinker, Eloquent workflow, HTTP request, or Artisan command was invoked. Raw PDO
then verified actual connectivity in `BEGIN READ ONLY` / `ROLLBACK`.

| Property | Confirmed value |
|---|---|
| App environment / config cache | `local` / not cached |
| Resolved connection | `pgsql`, host `postgres`, port 5432, database `rapid_mind` |
| Actual PDO database / OID / existing role | `rapid_mind` / 16384 / `rapid_mind` |
| Actual server address | `172.20.0.2/32:5432` |
| PostgreSQL | 17.5 (Debian 17.5-1.pgdg110+1) |
| Cluster system identifier | `7690932714053849126` |
| Postmaster start | `2026-10-24 03:11:17.501143+00` |
| Development owner | `rapid_mind` |
| Testing identity, independently connected | `rapid_mind_testing`, OID 24577, same cluster |
| Testing migrations / PostGIS | 25 applied / 3.5.2 |
| Development and restore extensions | plpgsql 1.0; fuzzystrmatch 1.2; postgis, postgis_topology, postgis_tiger_geocoder 3.5.2 |
| Resolved queue / cache / session stores | database / database / database |

All SQL inspection was SELECT-only inside explicit read-only transactions,
terminated with `ROLLBACK`. The main development inventory used one repeatable-read
snapshot at `2026-10-24T08:30:16.072669+00:00` (15:30:16 WIB); testing and restore
metadata used separate read-only snapshots. Sequence positions were subsequently
read separately; sequences are not MVCC snapshots. No `nextval` or `setval` ran.

A temporary inspection guard initially compared PostgreSQL's JSON OID string to
an integer and stopped. A separate read-only identity check confirmed OID `16384`;
normalizing the comparison to an integer allowed inspection to complete. No
migration or state-changing retry was involved. Docker inspection required sandbox
access to the existing Docker socket; no service lifecycle action was needed.

## Migration and prerequisite inventory

There are 25 migration files and 23 applied development migration records.
Every applied name matches a repository file. Exactly these two remain pending:

1. `2026_10_24_000000_add_referral_domain_foundation_columns.php`
2. `2026_10_24_000001_create_emergency_dispatch_domain_tables.php`

| Target | Current development state |
|---|---|
| `referrals.emergency_verification_id` | Absent |
| `referral_status_history.previous_status` | Absent |
| `referrals_id_emergency_unique` and new verification FK | Absent |
| `response_units` | Absent |
| `emergency_dispatches` | Absent |
| `emergency_dispatch_history` | Absent |
| Expected new relation/index/sequence and constraint-name collisions | None found |

This is an undeployed foundation, not a partial deployment. Unit/Dispatch counts
are **not applicable**, because their tables do not exist.

Required existing parents are present with compatible keys: `referrals.id` and
`emergency_events.id` are UUIDs; `referrals.emergency_event_id` is nullable UUID;
`users.id`, `healthcare_facilities.id`, `shelters.id`, and
`emergency_verifications.id` are bigint. Existing Referral primary-key uniqueness
makes the new `(id, emergency_event_id)` unique index compatible with current rows.
The first migration supplies the index needed by the second migration's composite FK.

The first `up()` adds two nullable columns, one restricted-deletion verification
FK and one supporting unique index. The second creates three tables and their
new-domain PK/unique/FK/check/index definitions. Dispatch checks constrain known
status/source values, coordinate pairs/ranges, and target presence; history checks
constrain event/previous/current values. No geometry extension installation is
needed by these two migrations; the existing PostgreSQL/PostGIS setup satisfies
their types/features. Existing legacy status columns/constraints are not narrowed.

No data conversion, backfill, delete, truncate, reset, seeding, or legacy constraint
replacement appears in either `up()`. Their `down()` methods drop new columns/tables;
**do not treat rollback as a harmless recovery operation**. Both inherit transactional
migration behavior; PostgreSQL supports schema transactions. Laravel logs a
migration record after running its schema transaction, so interruption between
schema commit and ledger insertion still requires catalog inspection.

Inspected migration SHA-256 values:

```text
8477cae7441ab8c86e21075abb7a7c01c1401e7b479d88182a8738741aea5228  2026_10_24_000000_add_referral_domain_foundation_columns.php
785b42acf8a808986ac9f69a4f76a49f5ad8f415cccee246cbe757c1cf43a4b3  2026_10_24_000001_create_emergency_dispatch_domain_tables.php
```

## Preservation baseline and post-backup differences

| Aggregate | 2F-A / 2F-B1 source | Current development |
|---|---:|---:|
| Users | 10 | 10 |
| Patients | 24 | 24 |
| Assessments | 16 | 16 |
| Emergency events | 36 | 36 |
| Clinical validations | 5 | 5 |
| Referrals | 14 | 14 |
| Referral histories | 37 | 37 |
| Audit logs | 104 | 104 |
| Healthcare facilities | 7 | 7 |
| Shelters | 7 | 7 |
| Resource needs | 1 | 1 |
| Resource allocations | 1 | 1 |
| Migration records | 23 | 23 |

Roles/activation match the backup: ADMIN active 1; HEALTHCARE active 2, inactive 1;
RELAWAN active 5, inactive 1. No memberships or configuration were changed.
Referrals remain ACTIVE 7, ON_SITE 2, COMPLETED 5, EN_ROUTE 0, TRANSPORT 0.
History remains ACTIVE 14, EN_ROUTE 7, ON_SITE 7, TRANSPORT 4, COMPLETED 5.

Beyond these counts, **all 64 non-system table row counts and whole-table data
fingerprints match the protected source snapshot**. Schema inventories also match:
660 column definitions (including views), 151 table constraints, 120 indexes,
35 sequence definitions, table inventory, migration names/batches, and extensions.
All 35 observed sequence positions/called flags match the recorded source values.
Fingerprints were aggregated inside PostgreSQL; no individual clinical rows were
returned. This detects retained data changes beyond count-only comparisons; it is
not a forensic proof that no outside write occurred and was later reversed.

Additional writer-state aggregates: jobs 0, failed_jobs 0, job_batches 0, cache 0,
cache_locks 0, sessions 1, refresh_tokens 315. These also match the source snapshot.
Browser-local outbox contents remain unknown and are not part of the backup.

**No retained post-backup data/schema drift was detected.** The recovery point
remains sufficient for the observed database state within 2F-B1's documented
scope. It does not include future writes, uploaded files, browser drafts/outboxes,
keys, or cluster roles. Recompare after the approved freeze; any divergence must
stop migration pending a reviewed current recovery point. Do not assume this old
archive contains later writes or overwrite it to create a newer backup.

## Current services and write sources

All six services were already running, each reported Up 5 hours; PostgreSQL healthy.
No service start time changed during this task. Observed start times on 24 October:
postgres `03:11:17Z`, queue `03:11:22Z`, app/scheduler/reverb/nginx `03:11:23Z`.

| Source | Observed behavior / write-freeze implication |
|---|---|
| `nginx` | Publishes host 8080 to HTTP; forwards Laravel requests to `app:9000` and sockets to Reverb. Must close ingress, including existing authenticated clients. |
| `app` | PHP-FPM master plus two workers; can perform domain, authentication, session, cache and synchronization writes. Keep running for approved CLI migration only after HTTP ingress is stopped and in-flight work drains. Port 9000 is internal, not host-published. |
| `queue` | Running `queue:work --sleep=3 --timeout=60`; database queue polling/reservation/failed-job handling can write even with no queued business jobs. Stop worker. |
| `scheduler` | Running `schedule:work`; no application schedules were found in current source. Stop to prevent scheduled/child work during deployment. |
| `reverb` | Running realtime server. Events use `ShouldBroadcastNow`; channel authentication can access app data. Stop for a fully quiet application window rather than assuming sockets are a write barrier. |
| PostgreSQL | Keep running; used for inspections and migrations. Background WAL/autovacuum processes are not application business writers. |
| Relawan clients | Sync on owner activation, enqueue, online/visible events and manual retry; emergency/assessment POSTs can replay without a new human submission. Session recovery also probes periodically. Closing server ingress blocks server acceptance, not local drafting. |
| Existing sessions/API clients | One database session row does not measure connected browsers; JWT clients and future requests can write. No logout/session clearing is proposed. |
| Other processes | No additional application worker was observed in inspected service process lists. Host/privileged manual CLI commands and new containers remain possible; owner coordination must prohibit them during the window. |

Two other development DB clients were idle at the inspection snapshot: addresses
mapped to `queue` and `reverb`. No other active/open development transactions,
idle-in-transaction sessions, or prepared development transactions were observed.
**Idle sessions or no active SQL do not prevent future writes.**

The application Docker network contained only these six services. Other running
containers were Grafana, Prometheus and cAdvisor, outside this network; no additional
application ingress was identified. Docker/host access can bypass normal ingress;
this procedure relies on an owner-controlled local maintenance window, not a new
security boundary or privilege change.

## Proposed maintenance/write-freeze — NOT EXECUTED

Obtain separate owner approval for the entire stop/start plan and conditional
re-isolation below. Agree a window with client operators, preserve drafts/outboxes,
and prohibit other CLI workflows, tests, seeders, app requests via direct FastCGI,
new containers, and direct database writers. Do not clear local data or sessions.
No `artisan down/up`, configuration change, firewall change, grant change, or
connection termination is required by the preferred procedure.

Exact proposed lifecycle operations, each requiring separate owner authorization
before execution (approval may explicitly cover this complete reviewed sequence):

```bash
# STOP / ISOLATE — proposal only; check each result before continuing.
docker compose stop -t 60 nginx
docker compose stop -t 90 scheduler
docker compose stop -t 90 queue
docker compose stop -t 60 reverb
```

Nginx stops first to prevent new HTTP writes and offline replay reaching Laravel.
Wait for accepted HTTP work to finish and verify transactions have drained. Queue
has up to 60 seconds job timeout; the proposed 90-second grace allows normal exit.
If any shutdown hits forced termination or a request/job outcome is unknown, stop
and reconcile persistence before proceeding. Do not silently discard or replay work.
Check scheduler child processes have exited, not merely its parent command.

Keep `app` and `postgres` running throughout; no restart/recreate of either is
needed for these schema-only changes. With only these services left on the app
network, no host-published FPM port, no in-flight requests and no unauthorized CLI
activity, app is retained as the CLI execution container. If direct FPM ingress,
unknown DB clients or other writers cannot be excluded, this plan is insufficient:
NO-GO, request an explicitly approved alternative isolation plan. Do not improvise
an app stop/one-off container, database read-only setting, or connection termination.

Verify the freeze before each migration:

- Compose confirms nginx/scheduler/queue/reverb stopped; app running; postgres healthy.
- Network/process inspection confirms the expected topology and no surviving child jobs.
- An external non-authenticated connection check to port 8080 fails to reach Laravel;
  use a transport connection check, not an authenticated application request.
- Read-only `pg_stat_activity` inspection shows no unexplained development clients,
  active transactions, or prepared transactions. Do not select SQL text/clinical payloads.
- Take two read-only aggregate/fingerprint/sequence observations a few seconds apart,
  after draining; both must match each other and the approved recovery point.
- Recheck archive identity/hash/readability, free space, actual app PDO identity,
  and the exact expected pending inventory. A changed baseline is a stop condition.

These are combined structural and observational checks; repeated unchanged counts
alone do not establish a freeze. Offline clients may keep local work and failed
transmissions; leave their outboxes intact. On reopening, those clients may replay:
do not label local persistence or a failed attempt as server acceptance. Operators
should resume deliberately and reconcile uncertain receipts using existing controls.

## Proposed migration execution — NOT EXECUTED

Execute sequentially only after maintenance approval and successful freeze/recovery
checks. Reverify revision and migration hashes, app connection `pgsql` to
`rapid_mind` OID 16384 and cluster above immediately before each command. The
`--database` argument is a Laravel connection name, not a database name.
Process-scoped `PGOPTIONS` below bounds lock wait at 5 seconds and each statement
at 60 seconds; it does not modify `.env` or persistent database configuration.

```bash
# First additive migration only. Future approved execution.
docker compose exec -T -e 'PGOPTIONS=-c lock_timeout=5s -c statement_timeout=60s' app \
  php artisan migrate --database=pgsql \
  --path=database/migrations/2026_10_24_000000_add_referral_domain_foundation_columns.php \
  --force --no-interaction
```

Require exit 0, exactly 24 applied migration records, the first name recorded, and
the second still pending. Verify the two nullable fields, restricted verification
FK, and valid `(id, emergency_event_id)` unique index. All 14 verification values
and all 37 history previous-status values must be null initially; no backfill.
New Dispatch-domain tables must still be absent. Recheck every pre-existing table's
counts and preserved statuses, and verify no unexpected schema changes.

```bash
# Second additive migration only, after first-migration checks pass.
docker compose exec -T -e 'PGOPTIONS=-c lock_timeout=5s -c statement_timeout=60s' app \
  php artisan migrate --database=pgsql \
  --path=database/migrations/2026_10_24_000001_create_emergency_dispatch_domain_tables.php \
  --force --no-interaction
```

Require exit 0, exactly 25 applied migrations, both names recorded, and no pending
or unexpected names. Use SELECT-only explicit read-only catalog/data verification:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database(), current_user, current_setting('transaction_read_only');
SELECT migration, batch FROM migrations ORDER BY migration;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN
 ('referrals', 'referral_status_history', 'response_units',
  'emergency_dispatches', 'emergency_dispatch_history')
ORDER BY table_name, ordinal_position;
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN
 ('referrals', 'response_units', 'emergency_dispatches', 'emergency_dispatch_history');
SELECT conrelid::regclass, conname, contype, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid IN
 ('referrals'::regclass, 'response_units'::regclass,
  'emergency_dispatches'::regclass, 'emergency_dispatch_history'::regclass);
SELECT status, count(*) FROM referrals GROUP BY status;
SELECT status, count(*) FROM referral_status_history GROUP BY status;
ROLLBACK;
```

Run these inspection statements through `docker compose exec -T postgres psql -X
-U rapid_mind -d rapid_mind -v ON_ERROR_STOP=1`, after independent identity checking.
The post-second-migration regclass/table queries must not run prematurely when
the tables are absent. Compare actual definitions against the inspected files,
not table existence alone. Verify index validity through `pg_index`, all FKs and
checks validated, expected nullability/defaults, and the following invariants:

- Unit code unique; optional facility restricted on delete; active default true.
- Dispatch UUID PK; emergency unique; nullable Referral unique; required unit,
  assigner and time; default ASSIGNED; status/assigned-time index.
- Emergency, Referral, unit, actor and target-shelter FKs restrict deletion;
  `dispatch_referral_emergency_foreign` references the newly supported pair.
- Six Dispatch checks match source; three history checks match source; history
  dispatch/actor FKs restrict deletion, JSONB metadata and ordering index exist.
- Three new tables contain zero rows; no response unit or operational action is
  created by schema deployment. Record counts should be queried only after existence.
- Every old table's count/status remains unchanged except migration ledger 23→25.
  For fingerprint comparison, project only its preflight columns on the two altered
  tables; row-to-JSON over new nullable columns would otherwise change their digests.
  Verify old field values separately and both new fields remain null.
- Existing users/role associations, facilities/shelters, assessments/emergencies,
  audits, logistics and all legacy histories remain intact; no fabricated history.
- Healthcare readiness's four predicates now succeed: all three new tables and
  `referrals.emergency_verification_id` exist. Also verify history `previous_status`
  even though the read gate does not include it. This proves schema prerequisites,
  not HTTP/browser/realtime success. Active unit options remain empty.

Do not run a bare unrestricted migration command, seed command, final status
constraint, provenance backfill, Referral status conversion/cast replacement,
legacy endpoint retirement, DemoSeeder/DispatchDemoSeeder, or database reset.
No automated test suite may target development; testing evidence is separate.

## Proposed recovery and reopening — NOT EXECUTED

On any error, timeout, disconnect, unexpected count/schema, or missing migration
record: stop immediately; retain freeze and record exit status plus sanitized
error/catalog state. Do not execute the next migration or automatically retry.
The first may remain successfully applied while the second fails. Transactional
DDL normally rolls back a failed migration, but inspect actual objects and ledger
instead of assuming atomicity across both migrations or across ledger insertion.
Do not automatically run rollback/down, restore, reset, manual DDL, or migration
ledger repair. Each needs a reviewed owner decision; retain the current database
and verified archive. A future restore would lose post-snapshot accepted writes
and needs its own preservation/authorization plan.

Only after all schema/data checks pass, use the separately approved reopening:

```bash
# Future owner-approved service restoration; Nginx last.
docker compose start reverb
docker compose start queue
docker compose start scheduler
docker compose start nginx
```

Check each service before the next step; Reverb readiness and PostgreSQL health
must be established before admitting clients. Starting workers may resume writes;
finish preservation verification first. Reopening Nginx allows authenticated
requests and offline replay immediately. Check transport/HTTP availability using
an agreed minimal health request, then hand actual Healthcare/session/realtime
verification to the separately authorized runtime/Antigravity stage. GETs can
write sessions/cache; they are not part of this read-only preflight.

If availability fails, keep/re-establish ingress isolation (the conditional
`docker compose stop -t 60 nginx` must be covered by owner approval). Stop resumed
queue/scheduler/reverb through the approved stop commands if needed to restore a
freeze, record any writes since reopening, and inspect service state plus sanitized
logs. No automatic restart loop, app/PostgreSQL restart, migration rollback, code
reversion, configuration switch, or restore. If the approved operations cannot
restore availability, remain isolated and report the blocker for owner direction.

## Compatibility, decision and verification boundary

Additive deployment activates the already-committed schema-aware Dispatch read
projections and Healthcare controls; ACTIVE Referrals offer clinical completion.
It does **not** complete final legacy Referral lifecycle cutover. Legacy `/status`,
Referral/history casts, movement statuses and existing constraints remain. Preserve
both ON_SITE Referrals, every one of the 37 histories and all audit records.
Response-unit provisioning/fixtures require separate approval; empty options are
expected after migrations. No T3 downgrade policy change is authorized.

**Conditional GO:** backup, identities, available storage, migration inventory,
source/prerequisites and observed preservation baseline pass. **Execution NO-GO
now:** maintenance service actions have not received the required separate approval,
and no write-freeze has been established. Revalidate all gates in the actual
approved window. No additional schema/data blocker was identified for these two
additive migrations. Final lifecycle/retention/provenance and T3 decisions from
2F-A remain deferred, not prerequisites silently resolved by this preflight.

Created only `docs/checkpoints/checkpoint-2fb2-preflight.md`. Existing tracked-file
hashes, including the locked workflow and both earlier reports, were checked for
preservation. `git diff --check` and direct new-report whitespace validation passed.
No application/configuration/environment/test/dependency changes, database DML/DDL,
migration, seed, reset, restore, service lifecycle/maintenance-mode change, browser
or E2E test, dependency installation, or Git mutation was performed. SELECT-only
inspection does not imply that unrelated live clients were unable to write.

Stop after 2F-B2.1. The next task is owner review of the concrete maintenance and
migration proposal; do not execute it automatically.
