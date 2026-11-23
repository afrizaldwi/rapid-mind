# Competition fixture preparation — 10 November 2026

> **Identity supersession — 10 November 2026:** the existing six users were
> updated in place to realistic fictional names and `@rapidmind.test` addresses;
> user IDs and all clinical relationships/history were preserved. The historical
> initial-install descriptions below retain their original provenance. See
> [competition-demo-accounts.md](competition-demo-accounts.md) for the current
> mapping, guarded update and verification limits. No reset/reseed/migration ran
> for this identity update. The shared credential is private input, never a tracked
> constant; local fresh fixture creation now requires
> `COMPETITION_FIXTURE_PASSWORD_FILE` pointing to an owner-owned, single-link,
> non-symlink mode-0600 file. The existing local private input is
> `storage/app/private/competition-fixture/account-password.input`. Pass its
> container-absolute path as a command-scoped environment variable; never print
> it or copy its contents into this runbook. Testing may use random private input.
> Existing completed-marker reruns preserve accounts/passwords and never rotate them.

**Prepared against:** `demo` at `6752729354045e8da18499ef0179e28c414714d9`.
**Authorization — 10 November 2026:** the owner explicitly authorized complete
replacement of all local `rapid_mind` development application data with this
12-patient fixture. All old data is disposable synthetic competition data. No
new backup is requested and no historical data will be restored or preserved.
Existing historical backup files remain untouched. This operation is intentionally
irreversible without a new backup. Preserve schema, migrations, PostGIS, sequences,
Git history, source and Docker configuration. No routine second approval is required;
identity mismatches, failed checks or unexpected dependencies require STOP.
Execution results are recorded separately; this runbook alone is not execution evidence.
**Execution completed:** see [competition-fixture-execution.md](competition-fixture-execution.md).
The corrected focused suite passed **16 tests / 277 assertions**; development reset,
single migration, seeding, post-reset verification and six-account browser login smoke
passed. Personal-profile cleanup and new-profile encryption enrollment remain manual.
P0 classifications remain unchanged; C2 NOT ACCEPTED; C3 not started.

## Dataset and provenance

`Database\Seeders\CompetitionFixtureSeeder` is a standalone opt-in seeder; it is
not called by DatabaseSeeder, DemoSeeder or DispatchDemoSeeder. It adds one atomic
fixture and never deletes, reassigns or rewrites existing clinical data. A first installation requires every reviewed application-data table to be empty.
The transaction/advisory-locked guard runs after the completed-marker check and
before credentials or records are created. It rejects unexpected tables, views,
cross-schema dependencies, partitions, foreign tables and user triggers, and locks
all 31 data tables against concurrent writers. No partial installation is repaired.
Completed-marker reruns retain their existing validation and no-overwrite behavior.

- One explicitly synthetic region, three active Posko (1/2 → A, 3 → B), two active
  facilities and two facility-linked synthetic response units.
- Six active accounts: Admin, Relawan 1/2/3, Healthcare A/B. Account emails use the
  reserved `competition.example.invalid` domain. Phone and NIK are NULL, not invented
  telephone/NIK values. Patient UUIDs are valid deterministic internal identifiers.
- Twelve clearly labelled synthetic patients, four per Posko; twelve assessments,
  five completed and seven in progress. Five system recommendations are calculated
  by the existing validated AssessmentSynchronizer/TriageCalculator, not copied scores.
- Five emergency cases: one PENDING, three CONFIRMED and one explicitly DOWNGRADED
  to T3. Four have separate acknowledgement, secondary verification and classification
  audits, eight verification records total. Two clinical validations, two active
  referrals, three explicit read-sharing grants, two dispatches (ASSIGNED and
  COMPLETED) and five dispatch history entries.

Completed clinical decisions are **scripted fictional initial histories**, not
claims that someone confirmed a real case or passed the browser flow. The fixture
calls the existing validated Healthcare controller commands in order under the
responsible synthetic actor, then existing referral/dispatch domain services.
It does not directly force a final clinical enum, skip the acknowledgement/secondary
verification prerequisite, or fabricate scores/history rows. Separate scenario and
completion audit markers identify this provenance. FIELD_TEAM represents fictional
fixture history only: no field communication, contact, pickup or treatment occurred.

The opt-in explicitly acknowledges scripted synthetic history. The owner explicitly authorized this scripted synthetic history in this task. Actual human/UI confirmation,
notification reception, T0 offline/outbox creation and clinical progression must
still be demonstrated manually. No SRQ-17 YES is seeded: completed Q17 answers are
NO; ambiguous/incomplete Q17 stays UNANSWERED. Apparent YES confirmation/cancel is
a manual test. No browser IndexedDB, key, passphrase, recovery code or enrollment
is created by this seeder.

### Coordinate schema prerequisite

The existing facility table has no persisted latitude/longitude fields, despite
the map already reading these fields. A narrow additive migration adds nullable,
paired, range-constrained facility coordinates. It changes no existing rows,
scoring, authorization or provisioning validation. Synthetic facilities receive
valid decimal coordinates; Posko/region use existing PostGIS geometry with SRID4326.
Coordinates and addresses are simulation locations, not real service destinations.
The controlled execution below applies only
this migration; all historical migrations and PostGIS are preserved.

### Determinism, credentials and reruns

Stable patient/assessment/emergency UUIDs come from FixtureDefinition; account
emails and organization/unit names/codes are stable. The advisory-locked atomic
completion marker prevents duplicate referral/dispatch creation. The original
COMPETITION_FIXTURE_DATE is stored in that marker. Dates are reproducible relative
to that explicit UTC anchor (scenarios run from twelve days ago through yesterday),
so choose today's UTC date on first execution for useful dashboard windows.
Reruns are read-only no-ops after validating roots and matching protected credentials;
they retain manual changes, activation, assignments, audit/status history and keys.
Missing roots/credentials or a conflicting partial namespace stop without repair.

Phone fields remain NULL under the fixture; ordinary Admin phone validation is
not relaxed. Updating a Relawan account through a phone-required form remains a
separate supported-contact requirement, not permission to invent a number.

Numeric organization/user IDs follow the database sequences; operational UUIDs
remain generated by the existing domain services. Those values are not promised
identical across fresh resets. Reproducibility means stable scenario roots and
relationships, not hardcoded account IDs, byte-identical password hashes or secrets.
The reset intentionally uses CONTINUE IDENTITY: it must not recycle old user IDs
that retained browser storage/JWTs could still refer to.

Credentials are generated with random_bytes, not hardcoded. The private bundle is
`storage/app/private/competition-fixture/credentials.json`, directory0700/file0600,
owned by the executing application user, single regular file, no symlinks or hard
links. Existing files are checked, never chmod-repaired, overwritten or rotated.
The path is already Git-ignored. Seeder stdout never prints passwords/hashes.
Credential creation is durably flushed before database commit. If the DB transaction
fails, an uncommitted private credential bundle may remain for a safe retry; no
clinical rows are partially committed. Do not publish or cat this bundle in logs.
Lost/changed credentials require owner review, not automatic password reset.

Guards require console execution, uncached config, local/rapid_mind or
 testing/rapid_mind_testing, PostgreSQL configured AND actual identity on Docker postgres:5432, exact
http://localhost:8080 app URL, explicit opt-in/date and inert transports. Command-only
array mail/session/cache, sync queue and null broadcast settings avoid changing .env.
Clinical broadcast events are additionally faked only inside fixture execution;
Eloquent creation hooks still run, including facility routing. No SMS, email,
telephone, WhatsApp, HTTP contact or actual response-unit dispatch is performed.
This command must not be embedded in a larger development transaction: use the
standalone owner CLI procedure, not a job or web request.

## Read-only pre-reset inventory — permitted inspection only

From the repository root, with existing services unchanged:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
docker compose ps
docker compose exec -T app php artisan migrate:status </dev/null
docker compose exec -T app php scripts/competition-fixture/inventory.php </dev/null
```

The inventory enforces local/testing PostgreSQL identity and starts a REPEATABLE
READ, READ ONLY transaction. It outputs only table counts, ordered row fingerprints,
column-metadata hash, migration count, PostGIS version and maximum user ID; no row,
password/hash/token, notes or personal identity is printed. The script rolls back
its read-only transaction. Full inventories belong in protected owner storage, not
new tracked clinical dumps. Recheck current inventory immediately before any reset.

The new coordinate migration should be the only pending migration. If there are
other pending migrations, unexpected tables, a cached config, a nonlocal APP_ENV,
unresolved fieldwork or an identity mismatch, STOP. Do not clear caches or guess.
Old accounts, tokens and unsynchronized clients are retired by this replacement.
Do not import their outbox or storage. Use a disposable profile for subsequent
acceptance; personal-profile cleanup is manual unless exact-origin cleanup can
be performed safely for http://localhost:8080 only.

## Authorized controlled data replacement

Run each command separately and STOP on failure. Do not run migrate:fresh,
refresh/reset/rollback, db:wipe, DROP, docker compose down -v, image rebuild or
volume deletion. Preserve .env, signing/encryption keys and historical backups.

### 1. Quiescence and aggregate-only evidence (no backup)

Record aggregate counts and schema information in a new protected directory;
these records contain no row payloads or credentials and are not backup archives:

```bash
umask 077
competition_evidence_dir=$(mktemp -d /tmp/rapid-mind-competition-evidence-XXXXXXXX)
docker compose exec -T app php scripts/competition-fixture/inventory.php </dev/null > "$competition_evidence_dir/before.json"
docker compose exec -T app php artisan down </dev/null
docker compose stop nginx queue scheduler reverb
```

Stopping Nginx closes the external request path, including API requests that may
bypass Laravel maintenance handling. Allow in-flight PHP requests to finish and
verify database sessions and application processes; do not terminate unknown sessions.
Verify no other workers or external writers remain. Preserve containers and volumes.
No new pg_dump/backup, restore, historical archive write or deletion is authorized.

### 2. Apply only the prepared additive prerequisite

After quiescence, recheck actual local/rapid_mind and the pending migration:

```bash
docker compose exec -T app php artisan migrate --path=database/migrations/2026_11_10_000000_add_competition_facility_coordinates.php </dev/null
docker compose exec -T app php artisan migrate:status </dev/null
docker compose exec -T app php scripts/competition-fixture/inventory.php </dev/null > "$competition_evidence_dir/after-coordinate-migration.json"
```

Expect only two nullable coordinate columns, one CHECK and one new migration record;
no clinical/account/organization rows change. Compare counts/fingerprints with
before.json; only the migration table and column metadata may differ. STOP on drift.
Keep after-coordinate-migration.json as the schema/migration/PostGIS preservation
baseline for the data-only reset. Do not automatically rollback on failure.

### 3. Transactional data-only reset with exact table allowlist

Review the full inventory first. Copy this SQL to the protected evidence
directory as reset-reviewed.sql. Recheck configured/actual environment and schema
immediately before executing it once. It preserves migration/extension tables and all sequences:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE expected text[] := ARRAY[
 'assessments','audit_logs','cache','cache_locks','clinical_case_shares',
 'clinical_validations','emergency_dispatch_history','emergency_dispatches',
 'emergency_events','emergency_verifications','failed_jobs','function_responses',
 'healthcare_facilities','job_batches','jobs','migrations','password_reset_tokens',
 'patients','referral_status_history','referrals','refresh_token_families',
 'refresh_tokens','regions','resource_allocations','resource_needs','response_units',
 'risk_responses','sessions','shelters','spatial_ref_sys','srq_responses',
 'triage_results','users'];
BEGIN
 IF current_database() <> 'rapid_mind' THEN RAISE EXCEPTION 'Wrong reset target'; END IF;
 IF ARRAY(SELECT tablename::text FROM pg_tables WHERE schemaname='public' ORDER BY tablename) <> expected
 THEN RAISE EXCEPTION 'Unexpected schema/table inventory'; END IF;
END $$;
TRUNCATE TABLE public.assessments, public.audit_logs, public.cache, public.cache_locks,
 public.clinical_case_shares, public.clinical_validations, public.emergency_dispatch_history,
 public.emergency_dispatches, public.emergency_events, public.emergency_verifications,
 public.failed_jobs, public.function_responses, public.healthcare_facilities,
 public.job_batches, public.jobs, public.password_reset_tokens, public.patients,
 public.referral_status_history, public.referrals, public.refresh_token_families,
 public.refresh_tokens, public.regions, public.resource_allocations, public.resource_needs,
 public.response_units, public.risk_responses, public.sessions, public.shelters,
 public.srq_responses, public.triage_results, public.users CONTINUE IDENTITY RESTRICT;
COMMIT;
```

Single authorized execution after all preceding checks pass:

```bash
docker compose exec -T postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d rapid_mind' < "$competition_evidence_dir/reset-reviewed.sql"
docker compose exec -T app php scripts/competition-fixture/inventory.php </dev/null > "$competition_evidence_dir/empty.json"
```

No CASCADE; an unexpected dependency, timeout or table mismatch fails the transaction.
On failure STOP, verify actual state read-only, and obtain owner direction. Never
retry deletion, restore or rollback a committed reset automatically. After success,
all 31 application tables should be empty; migrations (29 after the prerequisite),
spatial_ref_sys (8,500 in this inspected installation), PostGIS and schema must match
the post-coordinate-migration preservation baseline. Other installations must use
their own verified extension baseline, not assume 8,500. Sequences are not reset.

### 4. Seed once with command-scoped opt-in and inert transports

```bash
competition_fixture_date=$(date -u +%F)
docker compose exec -T \
  -e APP_ENV=local -e DB_CONNECTION=pgsql -e DB_DATABASE=rapid_mind -e DB_URL= \
  -e RAPID_MIND_COMPETITION_FIXTURE=ALLOW_SCRIPTED_SYNTHETIC_HISTORY_V1 \
  -e COMPETITION_FIXTURE_DATE="$competition_fixture_date" \
  -e COMPETITION_FIXTURE_PASSWORD_FILE=/var/www/html/storage/app/private/competition-fixture/account-password.input \
  -e BROADCAST_CONNECTION=null -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array \
  -e SESSION_DRIVER=array -e CACHE_STORE=array \
  app php artisan db:seed --class='Database\Seeders\CompetitionFixtureSeeder' </dev/null
```

No .env edits or dependency installation. The existing exact local APP_URL and
uncached config are required. A failure stops the process; inspect counts without
automatic retry/reseed/reset. Partial SQL work rolls back; a private credentials
file may remain. Existing application/browser encryption keys are untouched.

## Post-reset verification procedure

Before restoring normal traffic, run these read-only checks:

```bash
docker compose exec -T app php scripts/competition-fixture/verify.php </dev/null
docker compose exec -T app php scripts/competition-fixture/inventory.php </dev/null > "$competition_evidence_dir/seeded.json"
docker compose exec -T app php artisan migrate:status </dev/null
git diff --check
git status --short
```

The initial-state verifier checks target identity, exact dataset counts, routing,
NULL identifiers/phones, coordinates, completion marker, scores from the real
calculator and clinical states; it emits aggregates only. It is intentionally an
initial-state check, not a command to undo later manual progress. Confirm private
credential directory/file permissions0700/0600 without printing contents. Compare
migrations/PostGIS/schema against the post-additive baseline. Check unrelated source, Docker config, .env and historical backups were preserved.
Old browser data must never be imported into the new accounts. Record the new
user IDs privately; never assume seeded account IDs1–6 or reuse old fixture accounts.

Only after post-reset verification succeeds, resume the maintenance-window services:

```bash
docker compose start queue scheduler reverb nginx
docker compose exec -T app php artisan up </dev/null
```

No service recreation, image change or asset build is needed for this backend
fixture. Confirm normal routes/role boundaries in fresh disposable browser profiles.
Enroll offline encryption through the actual Relawan gate per profile, privately
retain recovery material, and never copy seeded clinical records into IndexedDB by
SQL or developer scripts. Personal-profile cleanup remains manual when it cannot be safely scoped; do not claim it was performed.

## Manual workflow matrix — all activity remains future owner-run testing

Patients use `[SINTETIS KOMPETISI] Penyintas NN`; UUIDs are
`FixtureDefinition::id(NN)`, assessments `id(NN,2)`, emergencies `id(NN,3)`.
Relawan 1 owns01–04, Relawan2 owns05–08, Relawan3 owns09–12. Healthcare A manages
Posko1/2 cases; Healthcare B manages Posko3. Admin sees permitted aggregates and
organization operations, never patient-specific clinical commands. Existing Admin
mixed-count/provenance gaps are NOT fixed or certified by a populated dashboard.

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

All seven incomplete assessments have no TriageResult. All completed Q17 answers
are NO; do not use prepared histories to skip real human confirmation acceptance.
Manual browser work must first establish a fresh profile, exact localhost origin,
actual login/enrollment, protected recovery custody and online hydration. A database
fixture is not an offline cache: an unhydrated page offline must fail safely.
Do not send contact messages, open real dialers, infer that silent seeded events
were received, or claim C2/P1/P2 acceptance from these initial states.

## Focused verification evidence and limitations

- Target verified through Laravel: APP_ENV=testing, configured/actual
  rapid_mind_testing, PostgreSQL/PostGIS3.5.2; config uncached. The testing database
  shares the development PostgreSQL service/volume; no credential-isolation claim.
- Focused PHPUnit uses DatabaseTransactions, not RefreshDatabase. The new additive
  coordinate migration's up() runs inside each test's PostgreSQL transaction and
  rolls back; no migration record or persistent schema change, reset, DROP,
  TRUNCATE, migrate:fresh or legacy seeder is executed.
- Tests cover counts, spatial/routing/ownership relationships, real scoring and
  four-state/no-Q17-YES evidence, chronological clinical/status histories,
  reciprocal facility denial/read-only referral sharing, credential permissions and redacted SQL-error output,
  idempotent reruns preserving manual progress, guard negatives, atomic failure,
  partial/deleted-root refusal and inert transports.
- Executed focused result: **10 tests / 247 assertions PASS** on PHP8.4.26,
  PHPUnit12.5.36. Command:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql \
  -e DB_DATABASE=rapid_mind_testing -e DB_URL= -e BROADCAST_CONNECTION=null \
  -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SESSION_DRIVER=array \
  -e CACHE_STORE=array app php vendor/bin/phpunit --do-not-cache-result \
  tests/Feature/CompetitionFixtureSeederTest.php
```

Two earlier runs exposed test-only plural history-table names; both corrected
before the passing run. Chronology and private-permission assertions were then
added and passed. A final SQL-error redaction regression also passed. No domain
change or database recovery was needed.
The 10-test result above is historical preparation evidence. Current guard regression
and development execution results must be recorded in the execution report. No new
backup or restore is part of this authorized run. Browser/clinical acceptance is
separate from fixture installation.
A populated Admin dashboard does not resolve its existing official-reporting gaps.
