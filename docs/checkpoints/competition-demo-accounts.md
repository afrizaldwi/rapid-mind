# Competition accounts and database-driven login — 10 November 2026

**Account update, credential reconciliation, backend verification and frontend
publication: PASS. Complete browser role-switching acceptance: BLOCKED / INCOMPLETE.**

The owner resolved the attachment's domain conflict in this conversation:
**use @rapidmind.test**. The table's alias/name mappings were retained; Admin is
named `admin`, not the illustrative Nadia name. No password or hash is recorded here.

## Account mapping and actual development result

| Alias | Preserved user ID | Display name | Email | Assignment |
| --- | ---: | --- | --- | --- |
| admin | 35 | admin | admin@rapidmind.test | ADMIN |
| relawan-1 | 36 | Budi Santoso | budi.santoso@rapidmind.test | RELAWAN / original Posko 1 |
| relawan-2 | 37 | Rani Prameswari | rani.prameswari@rapidmind.test | RELAWAN / original Posko 2; manual login |
| relawan-3 | 38 | Dimas Prakoso | dimas.prakoso@rapidmind.test | RELAWAN / original Posko 3 |
| healthcare-a | 39 | dr. Maya Lestari | maya.lestari@rapidmind.test | HEALTHCARE / original Faskes A |
| healthcare-b | 40 | dr. Arief Wicaksono | arief.wicaksono@rapidmind.test | HEALTHCARE / original Faskes B |

The guarded development command executed **once** and returned
`competition_accounts: updated`. It did not reset, reseed, delete data or apply
migrations. Each account retained its role, active status, Posko/facility and all
other fields outside the explicitly changed name/email/password/version/update-time
fields. Each token_version increased exactly once. Existing session-version and
JWT-family checks therefore reject old authentication; refresh families, if
present, are revoked with the existing `version_changed` reason rather than deleted.
At this installation there were zero refresh-token families/tokens before and after.
No old-session deletion or authentication bypass was used.

Preflight verified uncached APP_ENV=local, configured and actual PostgreSQL
rapid_mind at postgres:5432, exact http://localhost:8080, completed fixture marker,
six expected original names/emails, matching old private credentials, intended
role/organization and patient ownership relationships, and unused destination emails.
The updater has its own transaction, shared fixture advisory lock and bounded user
write lock. It rejects mixed/partial identities, unexpected users or ownership.
Idempotency was tested in rollback-protected testing; the development mutation was
not repeated merely to demonstrate idempotency.

## Source changes and complete task-only diff

Modified existing files:

- `database/seeders/Competition/FixtureDefinition.php`: the six names/emails and
  identity version, preserving all scenario UUIDs/payloads and completion version.
- `database/seeders/Competition/FixtureOrganizations.php`: new fixture users receive
  those names; the existing organization/scenario construction remains unchanged.
- `database/seeders/Competition/FixtureCredentials.php`: explicit private local input,
  new identity format, strictly guarded legacy reading for the one-time updater,
  refusal of pending reconciliation and missing bundles without regeneration.
- `app/Http/Controllers/AuthController.php`: adds only permitted demo metadata to the
  ordinary login Inertia response when the verified local helper returns accounts.
- `resources/js/Pages/Auth/Login.vue`: removes historical shortcut literals and the
  embedded quick-fill credential; selection fills email, clears/hides password and
  focuses that field. Normal /login submission remains unchanged.
- `scripts/competition-fixture/verify.php`: subsequent read-only verification now
  validates the current protected bundle against all six actual password hashes.
- `tests/Feature/CompetitionFixtureSeederTest.php`: fixture-absence assertion uses
  the updated identity list rather than the obsolete email suffix.
- `docs/checkpoints/competition-fixture-preparation.md`: dated identity supersession
  and private-input instructions; historical seeding evidence is retained.

Created focused files:

- `database/seeders/Competition/FixturePasswordInput.php`: protected private CLI input.
- `database/seeders/Competition/FixtureAccountRoster.php`: marker-owned account and
  organization validation, independent of credential-file contents.
- `database/seeders/Competition/FixtureCredentialReplacement.php`: durable private
  staging/journal and atomic credential publication.
- `database/seeders/Competition/FixtureAccountUpdate.php`: narrow guarded update and
  authentication-version invalidation, without touching clinical history.
- `scripts/competition-fixture/update-accounts.php`: explicitly opted-in CLI entry.
- `app/Domain/Demo/CompetitionLoginAccounts.php`: local/origin/target-gated listing.
- `resources/js/components/DemoLoginAccounts.vue`: small responsive grouped selector.
- `tests/Feature/CompetitionDemoAccountsTest.php`: ten focused backend regressions.
- `tests/Node/demoLoginAccounts.test.ts`: three mounted actual-SFC regressions.
- This report.

Review artifact: `/tmp/rapid-mind-demo-accounts-task-only.diff`. It compares files
against their actual contents at the beginning of this task, including the previously
untracked fixture source. New task files are additions. It excludes prior fixture
work, scripts/c2, private credentials, private browser material and generated assets.
No Git index or history operation was used to create it.

No dependencies were installed; no lockfile, clinical scoring, authorization policy,
existing offline passphrase requirement, historical seeder or Docker configuration
was changed. Byte hashes confirm .env, compose.yaml and all eight scripts/c2 files
are unchanged. Git branch/history/index were not mutated. No backup was created,
rewritten, restored or deleted.

## Private credential handoff and interrupted-update behavior

The canonical protected bundle remains
`storage/app/private/competition-fixture/credentials.json`, directory0700/file0600,
owner-owned, regular, single-link and without symlink ancestors. The updater validated
the old version before mutation and reconciled the new version to all six database
hashes. The final read-only check passes. No pending or next-file artifact remains
in the canonical credential directory.

The owner-authorized shared credential was read from a mode0600 private input file;
it is not a frontend/backend constant or normal production configuration. A later
local fresh fixture installation requires that explicit private input. A completed
fixture rerun remains a validating no-op and does not reapply the shared credential
or overwrite later manual changes.

The updater durably stages `.account-update.next.json` and a private
`.account-update.pending.json` marker before modifying users. After database commit,
it validates the old/staged file identity and atomically renames the staged file,
then removes the marker. The database and filesystem cannot share one atomic commit:
any interruption leaves a visible, fail-closed reconciliation state; no automatic
repair/retry is implemented. Credential loading and shortcut publication refuse a
pending marker. Tests exercise both database rollback with old credentials retained
and database success with file publication failure. Recovery would require explicit
inspection of current DB identities and protected files; never rerun a reset/seeder.
This failure path was not encountered in development.

## Dynamic metadata and frontend publication

Actual login props contain exactly five shortcuts: admin, relawan-1, relawan-3,
healthcare-a and healthcare-b. Their names/emails/roles/organization labels come
from marker-owned database rows. Posko1/3 cover both primary facilities. Relawan2
remains active and supports normal manual login. Extra users are never enumerated.

The helper returns only id/name/email/role/organization. No credential file is read
for HTTP metadata. Production omits demoAccounts entirely; wrong origins and absent,
inconsistent or pending fixtures leave ordinary login usable without shortcuts.
Testing's isolated console runner permits rapid_mind_testing to exercise the same
path; ordinary production execution does not gain that exception. Normal validation,
throttling, session regeneration and role routing remain in place.

`npm run build`: **PASS**, with the existing large-chunk warning (>500kB), no install.
31 service-worker precache entries were generated. public/hot was absent. Before
browser login, the served manifest app script and serviceWorker.js bytes were
compared by SHA256 to the newly built files and matched. No owner service-worker
registration or browser cache was cleared or forced to activate.

## Verification results

Final focused backend command:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql \
  -e DB_DATABASE=rapid_mind_testing -e DB_URL= -e BROADCAST_CONNECTION=null \
  -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SESSION_DRIVER=array \
  -e CACHE_STORE=array app php vendor/bin/phpunit --do-not-cache-result \
  tests/Feature/CompetitionFixtureSeederTest.php tests/Feature/CompetitionDemoAccountsTest.php
```

**PASS: 26 tests / 478 assertions**, PHP8.4.26 / PHPUnit12.5.36.
DatabaseTransactions protects all test SQL and additive coordinate DDL; no
RefreshDatabase, reset, persistent test migration or development seeding was run.
Coverage includes identities/shared private input, valid hashes, retained IDs and
clinical fingerprints, credential reconciliation, idempotency, wrong-target/state
refusal, interrupted handoffs, authentication-version/family invalidation, normal
backend HTTP login/logout for all six roles, five-account projection, production
absence and metadata secrecy. Earlier newly added test-harness issues (Inertia
version headers/component lookup and an intentionally retained destination) were
corrected before this final passing run; no authentication behavior was changed.

Mounted Vue tests: **3 PASS**. They compile the real Login/selector SFCs and verify
database labels, email selection, clearing/focusing the password field, no automatic
submission and normal login without fixture metadata. The small custom renderer
required disabling static HTML hoisting in the new test compilation; production
compilation remains unchanged.

Existing Node regression: **24 PASS** (sessionRecovery1, clinicalDomLock14,
clinicalKeyEnrollment9), including real crypto enrollment and lock/logout/owner
invalidation logic with the established test doubles. These are automated evidence.
`vue-tsc --noEmit`: PASS. PHP syntax: PASS for all 16 inspected fixture/auth PHP files.
Final Pint --test: PASS, 13 touched PHP files. git diff --check: PASS.
No broad RefreshDatabase authentication suite or complete clinical/PWA acceptance
suite was run.

## Clinical data preservation and final runtime state

Immediately after account mutation, every non-user table fingerprint was identical
to pre-update, including sessions/cache/audits at that point. Final checks after
browser attempts again confirmed all clinical/organization/audit/token fingerprints,
schema/migrations and PostGIS unchanged; only allowed user fields and normal
login session/cache state differ from the initial snapshot. All six account IDs,
roles and assignments are preserved. No patient, assessment, emergency, referral,
dispatch, share or history was added/removed/rewritten.

| Entity | Final count |
| --- | ---: |
| Users | 6 |
| Patients | 12 |
| Assessments | 12 |
| Triage results | 5 |
| Emergencies | 5 |
| Emergency verifications | 8 |
| Clinical validations | 2 |
| Referrals / referral history | 2 / 2 |
| Dispatches / dispatch history | 2 / 5 |
| Clinical shares | 3 |
| Posko / facilities / response units | 3 / 2 / 2 |
| Audit logs | 45 |
| SRQ / risk / function responses | 105 / 25 / 15 |
| Migration ledger / spatial_ref_sys | 29 / 8,500 |
| Refresh tokens / families | 0 / 0 |
| Jobs / failed jobs / batches | 0 / 0 / 0 |
| Resource needs / allocations | 0 / 0 |
| Sessions / cache (normal login activity) | 14 / 16 |

All six Compose services remain running; postgres is healthy. No maintenance window
or service restart was needed. No external message or clinical mutation was requested
in the browser checks; the harness blocked non-login/logout writes and external
page requests. No owner browser storage was accessed.

## Browser evidence, blocker and next action

**PASS:** actual localhost login page, five database-backed shortcuts, mobile390px
and desktop1280px without horizontal overflow, selected email/cleared password/focus,
current served asset hashes, Admin normal login/workspace/logout, and Relawan1 login
with the correct owner-bound continuity context and encryption gate.

**BLOCKED / INCOMPLETE:** the normal multi-role switching sequence and browser
logins for the remaining four accounts did not finish. All six passed the backend
HTTP authentication/role-route tests, but that is not six-account browser acceptance.

A fresh Relawan profile intentionally lacks the header/logout control until actual
offline encryption enrollment. The harness therefore proceeded through the existing
real enrollment UI, storing its generated recovery material privately and confirming
that it had been saved. After confirmation, the recovery panel remained visible and
the workspace/logout control did not appear within30seconds. No displayed generic
enrollment/identity/password error was observed. The cause was not established.
No direct IndexedDB writes, fabricated key, alternate logout, forced unlock,
clinical mutation or safety-policy change was used to force a pass. Earlier browser
harness pre-login issues were corrected to parse this app's Inertia3 JSON script;
those attempts did not mutate accounts or clinical records.

The browser check stopped at this dependency. The successfully updated database and
canonical credential file were preserved; no account update, reset, seeder or migration
was repeated. Disposable profiles and recovery material remain private and must not
be included in commits/reports/transfers. No password, hash, session token or recovery
value was printed. Personal-profile cleanup was neither attempted nor claimed.

**Next action:** separately diagnose the existing recovery-confirmation → workspace
handoff in the protected disposable profile using a read-only state/network review,
then complete the normal Admin → Relawan → Healthcare logout/switch sequence and
verify that a previously enrolled owner requires explicit unlock after switching.
Do not weaken the encryption gate or broaden this identity task into a privacy refactor.
Production security, natural background locking and C2/C3 acceptance remain unchanged.

Suggested owner commit message:
`feat(demo): align fixture identities and dynamic login shortcuts`
