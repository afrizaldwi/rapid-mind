# Checkpoint 2F-B1 — Development backup and isolated restore rehearsal

**Date:** 24 October 2026 (Asia/Jakarta, WIB). Timestamps below are UTC unless specified.
**Inspected Git revision:** `4ff000326de49c44a8a1f5f1d517ddd8fd3e6958`, branch `demo`.
**Result:** backup integrity and isolated restoration **PASS**.
**Recommendation:** **GO for considering the next owner approval**, not authorization to execute 2F-B2 or any cutover.

## Authorization and scope

The owner explicitly approved creating a protected full logical development backup
and a new isolated verification database, restoring into that new database, and
verifying it. The original `rapid_mind` and `rapid_mind_testing` databases were
not migration, restore, reset, seeder, or application-mutation targets.

The existing uncommitted `docs/checkpoint-2f-cutover-audit.md` was preserved.
This report is the only repository file created or modified by this checkpoint.
Protected backup artifacts were created outside the repository. Temporary
orchestration scripts contained only inspection/backup/restore logic and no keys
or credentials; no application source/configuration/test files were edited.

## Phase A — Current identities and baseline

The running Compose services `app`, `queue`, `scheduler`, `reverb`, `nginx`, and
`postgres` were already up; PostgreSQL was healthy. None was started, stopped,
restarted, or recreated. The PostgreSQL postmaster start time remained
`2026-10-24 03:11:17.501143+00` through final verification.

| Property | Confirmed current value |
|---|---|
| SOURCE_DATABASE | `rapid_mind` |
| TEST_DATABASE | `rapid_mind_testing` |
| Resolved app configuration | `local`, PostgreSQL at `postgres:5432`, database `rapid_mind` |
| Actual app-container PDO connection | `rapid_mind`, existing role `rapid_mind`, server `172.20.0.2/32:5432`; identity query read-only |
| PostgreSQL cluster system identifier | `7690932714053849126` |
| Development database OID / owner | `16384` / `rapid_mind` |
| Testing database OID / owner | `24577` / `rapid_mind` |
| Server and dump/restore clients | PostgreSQL 17.5 (Debian 17.5-1.pgdg110+1) |
| Database encoding / locale | UTF8 / `en_US.utf8` collation and ctype |
| PostGIS | 3.5.2, including topology and Tiger geocoder extensions |
| Other restored extensions | fuzzystrmatch 1.2, plpgsql 1.0 |
| Development migrations | 23 applied; both 24 October 2B migrations still pending |
| Testing migrations | 25 applied, including both 2B migrations |

Original database identities were independently established before operations.
Application inspection loaded only environment/configuration bootstrappers and
used a raw PDO read-only identity query, without application service-provider
boot, Tinker, Eloquent workflows, or HTTP endpoints. Credentials were not included
in output or this report.

Current source counts matched the 2F-A audit: 14 Referrals, 37 Referral histories,
104 audits, and 10 users. There was no material target/migration/count discrepancy.
Tiger geocoder was additionally inventoried; the earlier audit's initial extension
query listed only PostGIS and topology, so this is a fuller inventory, not evidence
that an extension was installed during this task.

## Phase B — Protected host storage

**Destination:** `/home/saga/Backups/rapid-mind/`

This is outside the repository, application public tree, PostgreSQL data volume,
and temporary directories. Both `Backups` and `rapid-mind` were created with
mode **0700**, owned by the current host user, UID 1000. Archive, checksum, manifests,
inventories, and retained partial archive have mode **0600**. Restrictive umask
**077** was used. Path components were opened using directory descriptors and
`O_NOFOLLOW`; writable ancestors, symlink traversal, unexpected ownership/modes,
and existing-file overwrites were rejected. New files used `O_EXCL`.

There was approximately 160.6 GB free on the host filesystem and PostgreSQL data
filesystem at preflight, versus a development database size of 22,793,363 bytes.
Remaining capacity was checked again before database creation.

**Protection limitation:** the observed filesystem is ext4 on `/dev/nvme1n1p5`.
No encrypted block-device layer was shown, and the home directory did not show
an ext4 encrypted-directory attribute. **At-rest encryption was not established.**
This checkpoint uses the explicitly requested owner-only filesystem protection;
it does not claim encryption. No encryption secrets were created, selected, or
managed. If encrypted storage is required for subsequent retention/cutover policy,
the owner must select an approved encrypted destination/mechanism separately.
The restore database resides in the existing PostgreSQL volume and is not an
encrypted archival replacement.

## Phases C and D — Backup creation and integrity

| Backup metadata | Verified value |
|---|---|
| Filename | `rapid_mind-20261024T080758_876733Z-bd942021.dump` |
| Absolute location | `/home/saga/Backups/rapid-mind/rapid_mind-20261024T080758_876733Z-bd942021.dump` |
| Size | **109,432 bytes** |
| Source snapshot time | `2026-10-24T08:07:59.010753+00:00` (15:07:59 WIB) |
| Exported snapshot | `00000013-000001AB-1` (expired after the backup transaction closed) |
| Dump started / completed | `08:07:59.220047` / `08:07:59.952427` UTC |
| Format | PostgreSQL custom archive, `PGDMP` header |
| Table-of-contents entries | 224 |
| Full archive readability | Passed with `pg_restore --file=/dev/null` |
| Dump process status / warnings | Exit 0 / none |
| Final mode / owner | 0600 / UID 1000 |

SHA-256, generated and independently rechecked after restoration:

```text
82c15d04c594c38d424fa04432302767fb6a9225c141f0b77154e3b8e2cda663
```

A uniquely named partial file was written first and flushed/fsynced. Finalization
used an exclusive hard link followed by removal of that task-created partial
name, so an existing archive could not be replaced. The finalized archive has
one hard link. No earlier existing backup was overwritten or deleted.

A read-only repeatable-read source transaction exported a snapshot and remained
open while `pg_dump --snapshot=... -Fc` ran. Source table counts and whole-table
fingerprints plus schema metadata were captured using that same snapshot.
Thus restored rows were compared with the backup's source snapshot, not a later
live measurement. Whole-table fingerprints were computed inside PostgreSQL;
individual clinical rows/fingerprints were not printed or placed in the report.

The dump was full and unfiltered: application schema/data, migrations, users and
relationships, clinical/source records, legacy Referral data/history, audits,
logistics, and database-backed application state were included. No services were
paused. Writes committed after the exported snapshot are outside its recovery
point; browser-local IndexedDB/outbox data is not included.

### Protected artifact inventory

All paths below are under `/home/saga/Backups/rapid-mind/`, with file mode 0600:

```text
rapid_mind-20261024T080758_876733Z-bd942021.dump
rapid_mind-20261024T080758_876733Z-bd942021.sha256
rapid_mind-20261024T080758_876733Z-bd942021.manifest.json
rapid_mind-20261024T080758_876733Z-bd942021.source-inventory.json
rapid_mind-20261024T080758_876733Z-bd942021.archive-sequences.json
rapid_mind-20261024T080758_876733Z-bd942021.restored-inventory.json
rapid_mind-20261024T080758_876733Z-bd942021.restore-result.json
rapid_mind-20261024T080506_216955Z-e1a733ea.dump.partial
```

The concise backup manifest records identity, timestamps, size, checksum, source
migration/count inventory, permissions, and archive validation results. The separate
restore-result manifest records final verification, original-database checks, and
readiness recommendation. Detailed schema/count/fingerprint inventories remain
outside Git. Raw archive contents and sensitive manifests were not copied into
documentation or the application tree.

### Pre-restore validation correction

The first dump passed custom-format, table-of-contents, and full readability checks,
but an additional validation guard stopped finalization with:

```text
RuntimeError: Archive sequence inventory incomplete; no restore attempted
```

That guard incorrectly required all 35 source sequences to have separate archived
`SEQUENCE SET` entries. There are 19 such entries (18 application sequences and
one topology sequence); 16 Tiger geocoder sequences are recreated by their
extension instead. Read-only catalog inspection confirmed extension ownership.
The corrected check requires every archived SET entry and every application
sequence, and verifies all extension sequence definitions/values after restoration.
A fresh, uniquely named dump with persisted source-snapshot inventory was created.
The earlier partial was retained with 0600 permissions and is **not** the primary
verified recovery archive. This was a pre-restore guard failure; there was no failed
restore, destructive retry, or source-database change.

## Phases E and F — Isolated database and restoration

**New database:** `rapid_mind_restore_verify_20261024_080951_724620`

| Verification identity | Confirmed value |
|---|---|
| Database OID | `102069` |
| Owner | Existing role `rapid_mind` |
| Cluster | Same verified system identifier `7690932714053849126` |
| Encoding / collation / ctype | UTF8 / en_US.utf8 / en_US.utf8 |
| Template | `template0` |
| Pre-restore public table count | 0 |
| Restore completion | `2026-10-24T08:09:54.321535+00:00` (15:09:54 WIB) |
| Restore status / warnings | Exit 0 / none |

Before creation, SELECT-only checks confirmed the unique proposed name did not
exist, differed from both original names, targeted the verified instance, and
had sufficient disk space. The existing role already had database-creation
capability. No user, privilege, grant, authentication, or service setting changed.
No database was reused, overwritten, or deleted.

Executed creation/restore strategy, with explicit target and the existing-role
approach reviewed in 2F-A:

```bash
docker compose exec -T postgres createdb -U rapid_mind --owner=rapid_mind   --template=template0 --encoding=UTF8 --lc-collate=en_US.utf8 --lc-ctype=en_US.utf8   rapid_mind_restore_verify_20261024_080951_724620

docker compose exec -T postgres pg_restore -U rapid_mind   --dbname=rapid_mind_restore_verify_20261024_080951_724620   --single-transaction --exit-on-error --no-owner --no-acl   < /home/saga/Backups/rapid-mind/rapid_mind-20261024T080758_876733Z-bd942021.dump
```

The restore used neither `--clean` nor `--create`. All archive-restoration writes
were confined to the newly created database. `--no-owner --no-acl` retained the
existing-role strategy and did not replay arbitrary ownership/privilege changes.
Consequently this rehearsal is not certification that original object grants/ACLs
were reproduced; future recovery must separately review ownership/permissions.
The application configuration continued to target `rapid_mind` throughout.

## Phase G — Restored data verification

The restored inventory was read in a repeatable-read read-only transaction. All
comparisons passed:

| Inventory / comparison | Result |
|---|---|
| All non-system ordinary/partitioned tables | **64 / 64 matched** |
| Table row counts and whole-table data fingerprints | **64 / 64 matched** |
| Non-system column-definition inventory, including views | **660 matched** |
| Table constraints: PK/FK/CHECK/unique definitions and validation flags | **151 matched** |
| Index definitions | **120 matched** |
| Sequence definitions | **35 matched** |
| Archived sequence-set positions/called flags | **19 matched exactly to archive metadata** |
| Extension-created sequence positions/called flags | **16 matched recorded source values** |
| Migration names/batches | **All 23 matched** |
| Extensions and versions | **All 5 matched** |
| Application user role/activation counts | **Matched** |
| Referral/history status distributions | **Matched without conversion** |

Sequence positions are not MVCC table snapshots. The 19 archived SET values were
validated directly against their archive metadata; the 16 extension-created values
were checked against the recorded source values. No `nextval`, `setval`, application
endpoint, migration, or seeder was executed during verification.

| Aggregate | Recorded backup source | Restored |
|---|---:|---:|
| Migrations | 23 | 23 |
| Users | 10 | 10 |
| Patients | 24 | 24 |
| Assessments | 16 | 16 |
| Emergencies | 36 | 36 |
| Clinical validations | 5 | 5 |
| Referrals | 14 | 14 |
| Referral histories | 37 | 37 |
| Audit records | 104 | 104 |
| Healthcare facilities | 7 | 7 |
| Shelters | 7 | 7 |
| Resource needs | 1 | 1 |
| Resource allocations | 1 | 1 |

| Status | Referral source/restored | History source/restored |
|---|---:|---:|
| ACTIVE | 7 / 7 | 14 / 14 |
| EN_ROUTE | 0 / 0 | 7 / 7 |
| ON_SITE | 2 / 2 | 7 / 7 |
| TRANSPORT | 0 / 0 | 4 / 4 |
| COMPLETED | 5 / 5 | 5 / 5 |

Application user counts also matched: ADMIN active 1; HEALTHCARE active 2 and
inactive 1; RELAWAN active 5 and inactive 1. No accounts or roles were changed.

## Original database preservation

After restoration, both original databases were explicitly reconnected to using
read-only SQL. `rapid_mind` remained OID 16384 and `rapid_mind_testing` OID 24577;
the new restore database had its own OID 102069.

Development still had:

- 23 migrations and zero applied 2B migrations.
- No `response_units`, `emergency_dispatches`, or `emergency_dispatch_history` tables.
- No `referrals.emergency_verification_id` or history `previous_status` column.
- 14 Referrals, 37 history rows, 104 audits, 10 users, and the same legacy Referral
  distribution (7 ACTIVE, 2 ON_SITE, 5 COMPLETED).

Testing still had 25 migrations including both 2B files. No command targeted either
original database for restoration or application mutations. The only database
creation and restore writes targeted the newly named verification database; its
creation necessarily added that database to the cluster's catalog, as authorized.
This task issued no record/schema writes to either original database. Existing
clients remained live, so this is not a claim that unrelated clients could not
have committed writes during the checkpoint.

## Recovery limitations and next approval

- This is a tested logical recovery point for the recorded snapshot, not an
  authorization to restore again, replace the live database, or change application
  connection settings. Keep the verification database until the owner decides its
  retention; it was not deleted.
- Archive permissions are verified; **at-rest encryption is not established**.
  A second off-device/off-host copy was not created in this checkpoint. Host-disk
  failure could affect the local archive and PostgreSQL volume together.
- New writes after the snapshot, device-local IndexedDB/outbox state, filesystem
  uploads, application keys/secrets, external services, and cluster-wide roles are
  not guaranteed by this database archive. Their recovery procedures remain
  separately controlled. Browser-local unsent work must not be cleared implicitly.
- `--no-owner --no-acl` verifies an existing-role restore, not a complete grant/ACL
  reconstruction. No PostgreSQL privilege changes were performed.
- The initial sequence guard failure and retained partial are documented above;
  the finalized primary archive and isolated restore passed all reported checks.
- No Laravel/frontend tests, application mutation endpoints, browser/E2E tests,
  realtime events, or external notifications were run against any database.

**GO for considering 2F-B2 approval:** a protected archive now has successful isolated
restore evidence and the originals retain their pending schema state. There is no
remaining backup/restore execution blocker within this checkpoint's permission-based
storage scope. The owner must review the evidence and separately approve 2F-B2's
exact operations. Pending decisions from 2F-A—including legacy status/history and
provenance treatment, final constraints/endpoint retirement, data preservation,
T3 policy, and unidentified-case rediscovery—are not resolved by this rehearsal.

The two pending migrations, synthetic seeding, Referral cast changes, legacy
retirement, database resets, application cutover, service restarts, 2G, and
Antigravity verification were explicitly excluded and were not started.

## Verification of repository boundaries

Only this report was added inside the repository. Pre-checkpoint tracked-file
SHA-256 values were compared after execution, preserving all existing source,
configuration, environment, tests, dependencies/lockfiles, the 2F-A audit report,
and `docs/workflow.md`. Git inspection was read-only; no Git mutations occurred.
`git diff --check` and a direct new-report whitespace check passed. Backup files and
sensitive manifests remain outside Git. Stop after 2F-B1.
