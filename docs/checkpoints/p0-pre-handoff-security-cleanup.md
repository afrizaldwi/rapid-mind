# P0 pre-handoff security cleanup

## Later committed state — 10 November 2026

Owner commits now include clinical integration/final T0 correction `e561c98`,
synthetic provisioning `1e44ff8`, runner cleanup `be61204`, final policy/handoff
`9f8fd4b` (99 reviewed files across those four), and offline navigation `7076e13`
(eight files). The eight superseded C2 scripts are excluded. Commit inventories,
old working-tree counts and proposed commit messages below are historical review
evidence, not the current index or outstanding owner-commit instructions.

The owner reports successful manual Chrome offline navigation after controlled
worker activation; narrow evidence only. Recorded 64 focused and final 13-test
subset PASS, type-check/diff-check PASS were not rerun here. The original seven
browser PASS, six runner-safety PASS, headed NOT TESTED, verified local DevTools
correction and resolved competition SQL/history decision remain unchanged.
Current P0 local demo CONDITIONAL PASS; natural background locking NOT TESTED;
production security NOT ESTABLISHED. Full P1/P2 acceptance pending; C2 NOT ACCEPTED;
C3 not started. Teammates retain native-lock and remaining acceptance work.
See [current implementation](../CURRENT_IMPLEMENTATION.md) and
[P0 handoff](../../P0-HANDOFF.md). Private evidence is preserved, not transferred.


10 November 2026. This supersedes the harness blockers in the preceding
[final handoff review](p0-final-handoff-review.md), preserving its historical
findings, original source hashes and seven recorded clinical PASS results.

## Current status — final owner SQL/history decision, 10 November 2026

**RESOLVED:** the owner confirms all existing development data is synthetic/dummy
and accepts its historical exposure for this competition prototype. The receiving
team continues in `github.com/afrizaldwi/rapid-mind`; keep
`rapid_mind_backup_20260930_075221.sql` unchanged, together with the existing
repository, branches and commit history. Do not remove the dump or rewrite history.
The owner-reviewed SQL finding is accepted and is not a P0 handoff blocker.
The earlier history-free sanitized-export/new-repository recommendation below is
superseded for this handoff. Historical contents, including password hashes and
expired token/session data, remain accessible through Git history; they have not
been sanitized or made inaccessible. The technical findings below remain historical
observations, not a request for another owner decision.

This policy covers only the competition's synthetic data. It does not authorize
real clinical records or reusable personal credentials in future commits, or
transferring Git-ignored credentials, recovery codes, browser profiles, debug
captures or private evidence. No SQL data, repository history or authentication
credentials were modified as part of this documentation correction. All P0
classifications and historical test/runtime evidence remain unchanged.

## Local DevTools correction — verified 10 November 2026

Owner-approved follow-up: added only `INERTIA_DEVTOOLS_ENABLED=false` to the
repository-root `.env`, confirmed Git-ignored. Existing bytes and permissions were
preserved. No application/vendor/production defaults or authentication mechanisms
changed. The earlier proposed correction below is historical and now superseded
for this local checkout; SQL/history disposition is now RESOLVED as recorded above.

RUNTIME VERIFIED through Docker Laravel bootstrap and a read-only
`select current_database()` before and after:

| Check | Before | After |
| --- | --- | --- |
| APP_ENV | local | local |
| Connection driver / actual database | pgsql / rapid_mind | pgsql / rapid_mind |
| Configuration cached | false | false |
| Routes cached | false | false |
| config('inertia.devtools.enabled') | null | false (boolean) |
| DevTools::enabled() | true | false |
| Registered DevTools routes | 2 | 0 |

No application `config/inertia.php` override exists. The installed vendor default
uses local recording only when the flag is unset; explicit false disables both
the recorder and route registration. Normal fresh PHP requests picked up the
ignored environment-file change. No service restart, cache rebuild or clearing
operation was required or performed.

HTTP VERIFIED through `http://localhost:8080`, using ordinary HTTP clients rather
than a browser, with existing protected synthetic credentials kept in memory:

| Request / principal | Actual result |
| --- | --- |
| GET /_inertia/devtools/entries — anonymous, Relawan A, Healthcare A | 404 each |
| GET /_inertia/devtools/entries/{existing capture ID} — same three principals | 404 each |
| GET /login — anonymous | 200 |
| Synthetic Relawan A and Healthcare A web login | 302 to their role workspace |
| GET /relawan/home — Relawan A | 200, Relawan/Home |
| GET /relawan/assessment — Relawan A | 200, Relawan/Assessment/Index |
| GET /healthcare/emergencies — Healthcare A | 200, Healthcare/Emergencies/Index |
| Anonymous role-page requests with JSON Accept | 401 each |
| Each authenticated role requesting the other role's workspace | 403 each |

The final temporary HTTP verifier completed16 recorded checks, exit0. No DevTools
response headers were present; checked authenticated HTML contained no DevTools
markup. The direct existing-capture checks used a real retained capture ID rather
than a nonexistent fixture. No response bodies, clinical props, credentials,
cookies or session tokens were printed or saved by the verifier.

Probe history is retained precisely: the first Inertia-style route probe omitted
the asset-version handshake and received409, so its metadata assertion failed.
A repeat with diagnostic status confirmed409. A full HTML probe then received200
but its temporary parser expected the older data-page attribute format and failed.
The parser was corrected to the installed JSON script-tag format; the final check
passed. No application fix, bypass or asset rebuild was needed for either probe
issue. These HTTP smoke checks do not establish rendered-browser compatibility or
replace any clinical acceptance result.

Preservation checks: all **357 existing DevTools files** retained identical paths,
SHA-256 contents, sizes and modes before/after. No new capture appeared during
the probes. The historical seven-PASS result retains SHA-256
`c99af008642bcd740996ac3cefdb877d47b8e33317d2ba075ec8ad67087ee495`.
Successful and interrupted probes created ordinary web session/authentication
state; no logout/token-version revocation, clinical POST, sync, migration, reset,
capture deletion, clinical-suite rerun, dependency installation or Git mutation
was performed. This does not claim the entire database was byte-for-byte unchanged.

Executed verification helpers were temporary files outside the source inventory:
`docker compose exec -T app php < /tmp/p0-devtools-runtime-check.php` (before/after),
`python3 /tmp/p0-devtools-http-check.py`, plus local capture hash/mode inventory
comparison and `git diff --check`. No test/build source was edited for this task.
Changed files: ignored `.env`, `P0-HANDOFF.md`, this report and the current summary
in `p0-final-handoff-review.md`. Source commit groups/file counts remain unchanged.

The setting is local and Git-ignored: teammates must explicitly configure and
verify `INERTIA_DEVTOOLS_ENABLED=false` in their own local environment before a
shared demo. Existing captures stay private and excluded from transfer. Production
defaults remain unchanged; production security acceptance is NOT ESTABLISHED.
P0 LOCAL DEMO ACCEPTANCE stays CONDITIONAL PASS; native locking remains NOT TESTED.
Suggested documentation message: `docs(p0): record verified local DevTools disablement`.
SQL/history disposition is RESOLVED above; the owner performs all Git/transfer work.

## Status and changes

| Classification | Status |
| --- | --- |
| P0 IMPLEMENTED | YES |
| P0 CORE BROWSER VERIFIED | YES |
| P0 LOCAL DEMO ACCEPTANCE | CONDITIONAL PASS |
| Natural background/foreground privacy locking | NOT TESTED |
| Production security acceptance | NOT ESTABLISHED |

IMPLEMENTED: both browser harnesses no longer embed the actual enrollment
passphrase. They use `support/protectedInputs.mjs` to read an owner-owned,
single-link regular JSON file with mode0600, an owner-only parent directory,
and no symlinked path. `P0_TEST_SECRETS_FILE` carries only its path. The file
must contain `enrollment_passphrase` with a fresh value of at least16 characters.
Existing account credentials are separately loaded from the protected ignored
`storage/app/private/c2-acceptance/credentials.json` under the same checks.
No real secret was generated, copied into source, printed or rotated by this task.

Future operator preparation: use an owner-controlled secret editor/password
manager to write that JSON in a private directory outside Git; keep both directory
and file owner-only. Supply only the file path through `P0_TEST_SECRETS_FILE`.
Do not place secret values in CLI arguments, environment values, shell history,
source, reports or the transfer archive. No clinical-run command is authorized
here. The receiving team must arrange fresh input and retain recovery material
privately if it later authorizes a clinical run.

`support/protectedBrowserRun.mjs` creates a unique mode0700 `p0-run-*` directory
under private acceptance storage. Each report is exclusively created mode0600
as `results.json` there; profiles stay inside the new run directory. No profile
or shared directory is recursively deleted. Existing profile/evidence directories
are untouched. All launched contexts are registered for close on success/failure.
DEBUG/PWDEBUG tracing is removed from the runner environment before Playwright
loads, to avoid incidental input logging. Existing application configuration is
unchanged.

Canonical assessment/emergency bodies, database records, replay receipts, outbox
contents, frame contents and request URLs are withheld from console output.
Selected raw SRQ rows/answer values were removed from new reports; assertions
remain, with boolean verification summaries. Recovery-code length may be reported,
never the code. Caught raw errors/stacks are withheld because assertion/Playwright
messages can include filled secrets or decrypted response values. Docker tinker
uses argument-array execution with captured stderr instead of a shell command.

Every required scenario starts NOT TESTED. Only reaching its explicit assertions
can mark it PASS. Overall success requires all seven core scenarios (or the one
headed scenario) to pass and all browser closes to succeed. Fatal errors return1;
incomplete/NOT TESTED returns2; complete success returns0. Reports identify the
overall result. Unlock-helper errors no longer disappear silently. The natural
visibility check still requires a real hidden transition; its absence is NOT TESTED.

## Verification actually performed

AUTOMATED TESTED: `node --test tests/Browser/p0_runner_safety.test.mjs` — **6 PASS,
0 FAIL**, exit0, using existing Node24.21.0. This test launches Node child processes
only. The first sandbox attempt could not spawn children (EPERM); the exact
focused command passed with process-sandbox escalation. No clinical suite ran.

- Both actual entrypoints: `--negative-control=fatal` returned1 with FAIL and
  unexecuted scenarios NOT TESTED; the injected private canary was withheld.
- Both entrypoints: `--negative-control=incomplete` returned2 with NOT TESTED.
- Controls ran with nonexistent secret input and empty PATH, before credential
  loading, dynamic Playwright import, browser startup or application/Docker calls.
  Their new run directories contained only private result files.
- Controlled two-scenario callback: partial completion returned2, context-close
  failure returned1, complete synthetic callback returned0. These are runner
  controls, not clinical/browser acceptance. Run directories were distinct.
- Protected-input controls accepted private JSON, rejected public file/parent
  modes and a symlink. Ownership checks were inspected; no foreign-owner fixture
  or account change was created.

Syntax checks passed for both harnesses and both helpers. `git diff --check` passed.
Full contents of changed and untracked candidates were scanned, including the new
helpers/test, for known protected credential/config values and private-key,
JWT-shaped-token and credentialed-URL patterns; no match was found. The original
enrollment literal was checked in memory and removed from proposed source. This
is a scoped scan, not certification of all Git history or unknown secrets.

Historical evidence remains unchanged:
`storage/app/private/c2-acceptance/p0_acceptance_results.json`, SHA-256
`c99af008642bcd740996ac3cefdb877d47b8e33317d2ba075ec8ad67087ee495`.
Seven original PASS entries are historical evidence for the earlier harness,
not proof that the edited runner has been clinically rerun. The original headed
NOT TESTED limitation is retained; no separate raw headed artifact was found.
No browser, HTTP request, database operation, build, dependency install or Git
mutation was performed for this cleanup. New controls create private reports
and temporary input fixtures only.

## Historical tracked SQL dump assessment — retention accepted by owner

The observations below are preserved from the security review. Its export/history
recommendation is superseded by the final competition-specific decision above.

`rapid_mind_backup_20260930_075221.sql` remains untouched, 54,950bytes, SHA-256
`a394fa7eeda868a89aa924341ec0839dad3acef4d710d253982094322f6216ed`.
It is already in history (last touching commit `dd44f22`, 30 September2026).
Exact COPY parsing finds: users3, patients1, assessments1, SRQ20, risk5,
function3, triage1, refresh_tokens5, sessions1, migrations20. Other COPY tables
are empty; notably no password-reset, queued-job or failed-job rows.

The owner has declared all local development data synthetic. The three user
names/emails match DemoSeeder fixtures and the patient NIK has a placeholder
pattern. The patient name/NIK do not match the current DemoSeeder, and the dump
has no provenance attestation establishing every row's origin. Treat it as
owner-attested synthetic data, not independently certified anonymized content.
Never publish clinical rows simply because they are believed synthetic.

All three user rows are active with bcrypt hashes, no remember tokens. Hashes
are offline password-verification material and can remain relevant wherever
the same passwords/hashes are reused. Current password validity was not tested;
no login attempt, password cracking, live account comparison or rotation occurred.
The five old refresh rows store JTI identifiers (not bearer JWT strings) and
expired on 7 October2026. Current opaque-refresh code instead requires hashed
credentials and families. The serialized session contains a CSRF token and web
login field; its last activity is 30 September2026 00:27:03UTC, well beyond the
currently configured120-minute lifetime. No JWT-shaped bearer string was found
in that decoded session. These age/schema facts reduce direct replay risk but
do not make the dump safe for source transfer or rule out reused passwords.

**Superseded recommendation, retained as historical evidence:** create an
allowlisted, history-free sanitized source export/new repository, excluding this
dump, all other database archives, .env,
private credentials/evidence/profiles/captures/logs, installed dependencies,
generated builds and Group E scaffolding. Review the exported file inventory
before sharing; preserve the original private repository/evidence separately.
An ordinary clone includes the dump because it is in HEAD/history. A future
owner commit removing the dump and ignoring backup patterns prevents new source
inclusion but does not erase history. If Git history must travel, the owner must
arrange a separately approved history-cleaning/export strategy and assess reused
authentication material. No dump deletion, Git command or history rewrite is
performed or prescribed as already done here.

## Historical Inertia DevTools privacy review: correction initially proposed

Read-only inspection found351 JSON captures,350 with a response body;108 bodies
and100 propValues objects matched clinical keys/known synthetic markers. These
are field/marker counts, not an exhaustive count of all clinical data. No values
were printed. Captures can grow under other use; these are inspection-time counts.
The parent directory is0700, but many files are0755. Filesystem privacy does
not prevent access through an application route.

Installed vendor RequestRecorder stores the resolved Inertia page in
`http.responseBody` and resolved values in `propValues`. Defaults enable recording
in APP_ENV=local when `INERTIA_DEVTOOLS_ENABLED` is unset, as in this checkout.
No application `config/inertia.php` or cached config exists. The vendor local
Authorize gate returns true without an authenticated role/facility check; its
`web` middleware alone does not enforce authentication. Entries endpoints can
list/read the shared capture store. Thus a clinical response authorized at the
original endpoint can be retained outside case-scoped access. Nginx is configured
on host loopback, limiting remote access but not isolating local users/roles.
Endpoint reachability was not probed and live authorization bypass is not claimed
as tested. The current local controls are **insufficient for a shared demo's
clinical privacy boundary**.

Smallest proposed correction, pending owner review: explicitly set
`INERTIA_DEVTOOLS_ENABLED=false` in local runtime configuration, preserving APP_ENV,
APP_DEBUG, clinical application behavior and existing captures. Confirm effective
Laravel `config('inertia.devtools.enabled')` is false and that DevTools endpoints
are unavailable before a shared demo. Review configuration/route caches first;
if a cache rebuild or process restart proves necessary, obtain its own approval.
Do not edit vendor code, widen a gate, delete captures or change production defaults.
Setting only a gate is insufficient because vendor authorization always allows
local. No configuration/deployment change or private-evidence cleanup was applied.

## Remaining boundaries and commit grouping

Harness literal/failure/deletion blockers: **IMPLEMENTED + AUTOMATED TESTED** at
runner-control scope. The approved local DevTools correction is now RUNTIME/HTTP
VERIFIED above; SQL/history disposition is RESOLVED under the final owner policy.
Original wrapped-key/profile material may still be unlockable
with the formerly exposed enrollment value; retain it privately, do not transfer
it with secrets, and arrange a separate lifecycle review rather than deleting it.
No general browser compatibility, native lock or production acceptance is claimed.

The complete exact A/B/C/D/E file inventory is in the updated final review:
A81 integrated implementation/tests, B6 synthetic provisioning fixtures,
C7 handoff documents, D5 sanitized runners/helpers/safety test, E8 excluded
superseded scaffolding; **107 current changed/untracked paths** total.

For the focused cleanup itself, source/test files are exactly:

- `tests/Browser/p0_browser_acceptance_suite.mjs`
- `tests/Browser/natural_visibility_lock.headed.mjs`
- `tests/Browser/support/protectedInputs.mjs`
- `tests/Browser/support/protectedBrowserRun.mjs`
- `tests/Browser/p0_runner_safety.test.mjs`

Documentation changed: `P0-HANDOFF.md`, `docs/checkpoints/p0-final-handoff-review.md`
and this report. Existing application source, SQL dump, original evidence,
published assets and other cumulative changes remain byte-for-byte unchanged
against the cleanup's opening inventory. The full clinical acceptance suite,
Node/PHP regression, builds, real-browser/native and production checks were not run.

Suggested focused messages: `test(p0): sanitize browser inputs and fail closed`
for Group D; `docs(p0): record security cleanup and transfer boundaries` for Group C.
Owner handles all commits and transfer. Receiving team retains native locking,
P1/P2 and remaining C2/C3 acceptance; none was started here.

Reviewed source SHA-256 values (not clinical rerun evidence):

| File under tests/Browser | SHA-256 |
| --- | --- |
| p0_browser_acceptance_suite.mjs | `61696f1793a0c5f12e0004407278f30182d866a8be682ceed437b8586705d49b` |
| natural_visibility_lock.headed.mjs | `cd3ab1d140612b0df51a9532a883e41ccbb33b6672717cbd530a8fe538843573` |
| support/protectedInputs.mjs | `b1d23f6ab63ad9b329f95ce55d3b3cfeaebd639afe1e5b1403abe3e7b7bf907f` |
| support/protectedBrowserRun.mjs | `fc8d223a8601875d024d012925ebb20739088a6199ca7eba4a5d40233cf01a01` |
| p0_runner_safety.test.mjs | `408cb99af4a5843d798b7705e8f14e0b571886a11c63f8c4d1a96a1ba95ee4a9` |
