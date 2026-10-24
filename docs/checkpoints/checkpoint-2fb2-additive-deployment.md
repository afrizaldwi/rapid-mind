# Checkpoint 2F-B2.2 — Controlled additive deployment stopped at maintenance gate

**Execution date:** 24 October 2026, Asia/Jakarta (WIB); detailed times below UTC.
**Revision:** `4ff000326de49c44a8a1f5f1d517ddd8fd3e6958`, branch `demo`.
**Result: STOPPED / NO-GO. Neither migration was executed.**

The first approved service stop exhausted its grace period and Docker escalated
Nginx to SIGKILL. The owner's explicit unclean-shutdown stop condition applies.
Development remains at 23 applied migrations. Nginx is stopped; app, PostgreSQL,
scheduler, queue, and Reverb remain running. Normal host HTTP ingress is unavailable.
This report is the only repository file created or modified by this checkpoint.

## 1. Approved scope and inspected sources

The owner authorized exactly two pending 2B additive migrations on `rapid_mind`,
the reviewed sequential stops of nginx/scheduler/queue/reverb, subsequent service
starts after successful verification, and conditional re-isolation on reopening
failure. No broader cutover, new container, app/PostgreSQL restart, database
recovery, data conversion, fixture deployment, or application change was authorized.

Read `AGENTS.md`, strictly read-only `docs/workflow.md`, the 2F-A, 2F-B1 and
2F-B2.1 reports, the 2B, 2C and 2D+2E reports, and `compose.yaml`. Inspected the
actual two migration files, resolved configuration/PDO connection, schema-readiness
gate, providers, schedules and Nginx configuration. The three existing owner-added
audit/recovery/preflight reports were preserved.

## 2. Recovery archive verification — PASS

Archive:
`/home/saga/Backups/rapid-mind/rapid_mind-20261024T080758_876733Z-bd942021.dump`

```text
SHA-256: 82c15d04c594c38d424fa04432302767fb6a9225c141f0b77154e3b8e2cda663
Size: 109432 bytes
```

Verified before maintenance: regular file, no symlink at checked backup paths,
UID 1000, file 0600, backup directories 0700, `PGDMP` format, 224 TOC entries,
`pg_restore --list` exit 0 and full `pg_restore --file=/dev/null` readability
exit 0 with no warnings. Neither readability command connected to a database.
The protected restore-result manifest still records successful restoration and
all comparisons passing. The isolated recovery database was independently connected
to read-only and remains available. No backup artifact was overwritten or changed.
Final size/checksum/permissions/owner recheck also passed after the deployment stop.

Free host and PostgreSQL-data filesystem capacity at immediate preflight was
160,561,127,424 bytes, versus development database size 22,793,363 bytes: sufficient
for the planned additive operation. No migration storage was consumed.
At-rest encryption and an off-host copy remain unestablished, as in 2F-B1.
The recovery snapshot remains `2026-10-24T08:07:59.010753+00:00`.

## 3. Immediate database identity — PASS

The app's environment/configuration bootstrappers and `ConfigurationUrlParser`
resolved the connection without booting application providers or invoking workflows.
Raw app-container PDO verified actual identity inside `BEGIN READ ONLY` / `ROLLBACK`.
All PostgreSQL inventory queries also used explicit repeatable-read read-only
transactions ending in `ROLLBACK`. Only aggregate fingerprints/metadata were returned.

| Identity | Confirmed |
|---|---|
| App environment / cached config | local / false |
| Connection | pgsql; postgres:5432; rapid_mind |
| Actual development database / OID / owner | rapid_mind / 16384 / rapid_mind |
| Actual server address | 172.20.0.2/32:5432 |
| PostgreSQL | 17.5 (Debian 17.5-1.pgdg110+1) |
| Cluster system identifier | 7690932714053849126 |
| PostGIS | 3.5.2 |
| Postmaster start, unchanged | 2026-10-24 03:11:17.501143+00 |
| Testing database | rapid_mind_testing / OID 24577 / owner rapid_mind |
| Recovery database | rapid_mind_restore_verify_20261024_080951_724620 / OID 102069 / owner rapid_mind |

Testing and recovery are separate logical databases in the same verified cluster.
Neither was a migration or write target. No credentials, tokens, patient content,
or SQL payloads were selected for this report.

## 4. Initial migration and source preservation gates — PASS

Immediate development snapshot: `2026-10-24T08:42:50.870649+00:00` (15:42:50 WIB).
There were exactly 23 applied migrations and exactly the two approved pending files,
no unexpected applied migration, no partial Dispatch schema, no expected new-name
collision, and no new verification/previous-status columns.

Both migration hashes matched exactly:

```text
8477cae7441ab8c86e21075abb7a7c01c1401e7b479d88182a8738741aea5228  2026_10_24_000000_add_referral_domain_foundation_columns.php
785b42acf8a808986ac9f69a4f76a49f5ad8f415cccee246cbe757c1cf43a4b3  2026_10_24_000001_create_emergency_dispatch_domain_tables.php
```

All 64 non-system table counts and whole-table fingerprints matched the approved
backup source. Schema inventories matched: 660 column definitions including views,
151 constraints, 120 indexes, 35 sequence definitions, tables, extensions, and
migration names/batches. All 35 observed sequence positions/called flags matched.
No meaningful retained data/schema drift was detected before maintenance.
Sequence positions are not MVCC snapshots; inspection did not call nextval/setval.

## 5. Maintenance stop command and exact result

Executed only:

```bash
docker compose stop -t 60 nginx
```

Sanitized Compose output:

```text
Container rapid-mind-nginx-1 Stopping
Container rapid-mind-nginx-1 Stopped
```

The Compose command returned **0**, but that does not establish a clean container
exit. Independent Docker state inspection showed **ExitCode 137**, `OOMKilled=false`,
`Running=false`, PID 0, and an empty Docker state error field.

Bounded read-only Docker lifecycle events establish the escalation:

| UTC time | Docker event |
|---|---|
| 08:45:06 | kill event, signal 3 (SIGQUIT, graceful shutdown request) |
| 08:46:06 | kill event, signal 9 (SIGKILL after the grace period) |
| 08:46:06 | stop event; die event with exitCode 137 |

Exact container finish time: `2026-10-24T08:46:06.459406433Z` (15:46:06 WIB).
The SIGKILL was Docker's timeout escalation within the authorized stop command;
no separate kill or process-termination command was issued by this checkpoint.
The reason Nginx did not finish during the grace period is **unverified**. No
request payloads or patient-bearing access logs were inspected to speculate about it.

**Required stop condition reached:** a service did not stop cleanly. No subsequent
scheduler/queue/Reverb stop, migration command, automatic retry, repair, rollback,
restore, alternate isolation strategy, or service start was attempted.

## 6. Write-freeze evidence — NOT ESTABLISHED

At final read-only inspection, a TCP connection to `127.0.0.1:8080` was refused
(connect result 111). No HTTP business request was submitted. Nginx is stopped,
but scheduler, queue and Reverb remain running and retain potential write capability.
Two idle development clients still mapped to queue and Reverb; no prepared
transaction was present. The app network showed no new application container.

This is partial ingress isolation, not an established write-freeze. The approved
two-observation freeze gate was not completed after the unclean stop. Later data
preservation measurements do not substitute for it. No queue contents, sessions,
client drafts or offline outboxes were cleared or inspected for patient content.
No direct connection was terminated and no database privileges were changed.

## 7. Migration 1 command/result — NOT RUN

The authorized command below was **not executed**, because the maintenance gate failed:

```bash
docker compose exec -T \
  -e 'PGOPTIONS=-c lock_timeout=5s -c statement_timeout=60s' \
  app php artisan migrate --database=pgsql \
  --path=database/migrations/2026_10_24_000000_add_referral_domain_foundation_columns.php \
  --force --no-interaction
```

There is no migration process exit code/output to report. Development still has
23 migration records; this migration remains pending. Both new nullable columns,
the verification FK and supporting unique index remain absent. Migration-1
post-deployment verification was therefore not reached.

## 8. Migration 2 command/result — NOT RUN

This authorized command was also **not executed**:

```bash
docker compose exec -T \
  -e 'PGOPTIONS=-c lock_timeout=5s -c statement_timeout=60s' \
  app php artisan migrate --database=pgsql \
  --path=database/migrations/2026_10_24_000001_create_emergency_dispatch_domain_tables.php \
  --force --no-interaction
```

No exit code/output exists. This migration remains pending. `response_units`,
`emergency_dispatches`, and `emergency_dispatch_history` remain absent. Their
record counts are not applicable, rather than zero deployed records. No new
PK/FK/unique/CHECK/index/default/JSONB definitions were deployed or claimed verified.

## 9. Final preservation checks — PASS

Final development snapshot: `2026-10-24T08:47:17.140683+00:00` (15:47:17 WIB).
All original 64 table counts and fingerprints still match the protected recovery
source, as do all original schema inventories and 35 sequence states. Since no
column was added, original whole-row fingerprints remain directly comparable;
no post-migration projection adjustment was necessary.

| Aggregate | Approved source / before stop / final |
|---|---:|
| Users | 10 / 10 / 10 |
| Patients | 24 / 24 / 24 |
| Assessments | 16 / 16 / 16 |
| Emergency events | 36 / 36 / 36 |
| Clinical validations | 5 / 5 / 5 |
| Referrals | 14 / 14 / 14 |
| Referral histories | 37 / 37 / 37 |
| Audit records | 104 / 104 / 104 |
| Facilities | 7 / 7 / 7 |
| Shelters | 7 / 7 / 7 |
| Resource needs | 1 / 1 / 1 |
| Resource allocations | 1 / 1 / 1 |
| Applied migrations | 23 / 23 / 23 |

Referral statuses remain ACTIVE 7, ON_SITE 2, COMPLETED 5; EN_ROUTE/TRANSPORT 0.
History statuses remain ACTIVE 14, EN_ROUTE 7, ON_SITE 7, TRANSPORT 4, COMPLETED 5.
Original values, timestamps, clinical sources, memberships, audits and configuration
remain represented by matching fingerprints; neither ON_SITE Referral nor any
historical movement entry was converted. No retrospective Dispatch record exists.

Account role/activation counts remain ADMIN active 1; HEALTHCARE active 2/inactive 1;
RELAWAN active 5/inactive 1. Additional table counts match: jobs/failed_jobs/job_batches
all 0, cache/cache_locks 0, sessions 1, refresh_tokens 315. No individual token or
session content was selected. Observational matching cannot prove outside clients
never made and reversed a write; this task itself issued no database DML/DDL.

Independent before/after inventories of `rapid_mind_testing` (31 tables, 25 migrations)
and the recovery database (64 tables, 23 migrations) also match for all table counts/
fingerprints, schemas, indexes/validity, constraints, sequence definitions/positions,
extensions, migration records and role/status aggregates. Neither database changed
in those comparisons; this checkpoint issued only read-only SQL against them.

## 10. Service startup results and final availability

Startup phase was **not reached**. Its approval required both migrations and all
verification gates to pass. That condition was not met. No restart, start, or
conditional reopening-failure re-isolation command was run; no reopening occurred.
The explicit instruction to preserve the observed state on unclean shutdown was followed.

| Service | Final state | Action taken |
|---|---|---|
| nginx | Stopped; exit 137; host HTTP unavailable | Authorized stop only |
| scheduler | Running | None |
| queue | Running | None |
| reverb | Running | None |
| app | Running; original start time unchanged | Read-only PHP/identity inspection only |
| postgres | Running and healthy; original start time unchanged | Read-only inspection only |

No `/up` HTTP availability check or business workflow was run after reopening,
because services were not reopened. The TCP ingress check was metadata/transport
only. Neither app nor PostgreSQL was stopped/restarted; no new container was created.

## 11. Runtime prerequisites and deferred decisions

**Healthcare Dispatch schema readiness: NOT READY (deployment blocked).** Its
three table predicates and Referral verification-column predicate remain false.
New Dispatch functionality cannot be enabled by this aborted deployment. Existing
Referral statuses/casts/endpoints remain unchanged; database preservation is not
HTTP/UI readability evidence while Nginx is stopped.

No unit provisioning or fixture seeding ran. Final legacy lifecycle/endpoint/cast
retirement, provenance backfill, restrictive clinical status constraints, retained
legacy histories/deletion policies, T3 downgrade discrepancy, and unidentified
completed-case rediscovery remain separately controlled owner decisions. No
clinical classification rule or queue membership policy changed.

## 12. Warning, recovery boundary, and next prerequisites

**Blocker:** the reviewed 60-second Nginx shutdown did not complete cleanly.
Owner direction is required for restoring HTTP availability and any revised
maintenance attempt. Do not interpret prior success-conditional startup approval
as authorization to improvise recovery after this stop condition. No automatic
restart loop, longer timeout, alternative signal, one-off container, database
connection termination, permission change, restore or rollback was performed.

Before any future deployment attempt: resolve/review the shutdown blocker and
approve the next service actions, reverify identities, migration hashes and the
recovery point, reassess post-backup writes, establish the complete approved freeze,
then execute the two migrations with their individual verification gates. Current
23-migration state and preserved archive must be retained until owner direction.

**NO-GO for 2F-B3.** Both additive migrations, schema readiness, service restoration,
and minimal HTTP availability are still prerequisites. Unit/fixture preparation
and Antigravity/browser/realtime verification require their own later approval.
No production, browser UI, mobile, E2E, live-Reverb, final-cutover or clinical PASS
is claimed. No application tests were run against development, testing or recovery.

## 13. Repository and operation boundaries

Created only `docs/checkpoints/checkpoint-2fb2-additive-deployment.md`. All existing
repository files captured at entry remain byte-identical, including `docs/workflow.md`,
the three owner-added reports, application code, tests, migrations, configuration,
lockfiles and dependencies. `git diff --check` and direct report whitespace checks
passed. Temporary aggregate inspection evidence is outside the repository.

Only one authorized service operation ran. **Zero migrations ran**, including
zero unauthorized migrations. No seed, reset, truncate, deletion, backfill,
status/history conversion, final constraint, database restore, role/authentication
change, dependency change, application modification, Git mutation, or browser/E2E
operation occurred. Stopped at the required maintenance failure gate.
