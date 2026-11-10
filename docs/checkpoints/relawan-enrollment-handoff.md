# Relawan enrollment handoff and demo switching — 10 November 2026

**Enrollment application defect: NOT REPRODUCED. Browser driver interaction failure
observed. Locked-gate logout: IMPLEMENTED / AUTOMATED TESTED / DOM-DRIVEN BROWSER
VERIFIED. Requested account-switching sequence: PASS with the interaction limitation
below. P0/C1/C2/C3 acceptance classifications remain unchanged.**

## Diagnosis

The preceding account report's 30-second timeout was reproduced against the actual
localhost build in new disposable Chrome profiles. The driver returned from its
confirmation click, but a document click observer and CDP function-entry breakpoints
observed neither a click nor entry into `finishEnrollment()` / `confirmClinicalRecovery()`.
The enabled button was connected, hit-testable, and had no inert ancestor. No generic
enrollment error was displayed; IndexedDB remained `ENROLLMENT_PENDING`. A keyboard
activation attempt also failed to deliver the observed click. Increasing the wait
would not establish that the handler had run.

Invoking the same visible, enabled button's native DOM `click()` delivered the click.
CDP then observed entry into the compiled `finishEnrollment()` and
`confirmClinicalRecovery()` functions; the real authorization request returned HTTP200.
IndexedDB transitioned to `ENCRYPTED` and the normal workspace appeared. The subsequent
ordinary mouse logout attempt also failed to deliver the intended action, while DOM
activation completed normal logout in the corrected harness.

The new reusable harness therefore activates visible, enabled UI buttons through
`HTMLElement.click()`. It never calls enrollment/unlock functions, installs keys,
writes IndexedDB, forces readiness, fabricates HTTP success, or navigates directly
into another user's clinical workspace. Form input and normal /login submission
still use the actual page. The low-level Chrome/Playwright reason for the dropped
trusted input remains undetermined. This is DOM-driven browser integration evidence;
it is **not trusted-pointer, physical-keyboard or manual usability acceptance**.

The completed flow was checked as follows:

| Step | Observed evidence |
| --- | --- |
| Button reaches `finishEnrollment()` | Click observer and CDP entry after native DOM activation |
| `confirmClinicalRecovery()` runs/completes | CDP entry; final persisted mode, installed-key readiness and rendered workspace |
| Server authorization | Actual HTTP200 at recovery confirmation for both new owners; six total policy requests, all HTTP200 |
| Pending → encrypted | Native read-only IndexedDB inspection before and after explicit confirmation |
| `installClinicalKey()` succeeds | Real built module's `clinicalKeyReady(owner)` becomes true; no harness setter |
| Readiness/reactivity | Active owner true, other owner false; Vue removes gate and renders workspace/logout |
| Reload/logout | Both owner readiness values false; returning owner must explicitly unlock |

Source inspection traced the existing owner, persisted-key, access-generation,
continuity and local server authorization checks. Enrollment/crypto/fencing source
required no correction and remains unchanged. Test mocks are not the evidence for
the live state transitions above.

## Narrow application change

`OfflineEncryptionGate.vue` now exposes an optional actions slot. The real Relawan
layout supplies a small Bahasa Indonesia **Keluar** button through that slot and
calls its existing `logout()` function. No clinical unlock is required.

That established flow locks all clinical keys first, persists `logout_pending`,
then requests normal server logout when online. Encrypted records and wrapped keys
remain stored. A local intent-persistence failure is shown at the gate. Server
validation, network and HTTP failures show safe feedback while access stays locked;
network/HTTP callbacks suppress the default exception presentation. The existing
pending screen permits an explicit server retry when connectivity returns. There
is no reset, bypass, passwordless switch or alternative account-navigation flow.

## Exact files changed

Modified:

- `resources/js/components/Relawan/OfflineEncryptionGate.vue` — optional actions slot.
- `resources/js/layouts/RelawanLayout.vue` — gate logout action/error and safe server failure callbacks.
- `tests/Node/clinicalDomLock.test.ts` — five mounted-layout logout regressions; existing gate double renders the actions slot.

Created:

- `tests/Browser/demoAccountSwitching.browser.mjs` — authentication-only sequence and locked/offline logout verification.
- `tests/Browser/helpers/demoAccountBrowserState.mjs` — read-only state/readiness checks and visible/enabled DOM activation.
- `docs/checkpoints/relawan-enrollment-handoff.md` — this report.

Complete task-only diff: `/tmp/rapid-mind-enrollment-handoff-task-only.diff`.
It compares these files to their actual starting contents, including additions;
it excludes the owner's pre-existing account/fixture/login/scripts-c2 work and
ignored generated build assets. No Git mutation was used.

## Verification

Each Node file was run directly with `node <file>` so the totals below are individual
tests, not the file totals from Node's aggregate runner:

| Command suffix under `tests/Node/` | Result |
| --- | --- |
| `clinicalDomLock.test.ts` | 19 PASS, including five new logout cases |
| `offlineRecoveryConfirmation.test.ts` | 5 PASS |
| `localEnrollmentActivation.test.ts` | 15 PASS |
| `clinicalKeyEnrollment.test.ts` | 9 PASS |
| `sessionRecovery.test.ts` | 1 PASS |
| `clinicalStorageSecurity.test.ts` | 12 PASS |
| `offlineNavigation.test.ts` | 11 PASS |
| **Total** | **72 PASS / 0 FAIL** |

The new mounted cases cover locked-gate online logout, offline pending state,
local storage failure, network failure and HTTP failure. Existing tests exercise
real WebCrypto with fixture storage, recovery confirmation, retained encrypted
clinical records/outbox and owner/access invalidation. These automated cases do
not establish real-device or general migration acceptance.

Targeted Docker backend command:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql \
  -e DB_DATABASE=rapid_mind_testing -e DB_URL= -e BROADCAST_CONNECTION=null \
  -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SESSION_DRIVER=array \
  -e CACHE_STORE=array app php vendor/bin/phpunit --do-not-cache-result \
  tests/Unit/LocalOfflineEnrollmentTest.php
```

**19 tests / 19 assertions PASS**, PHP8.4.26 / PHPUnit12.5.36. This policy unit test
performs no database operations. No backend source changed; no broad Feature suite,
RefreshDatabase, test reset or migration was needed.

Other checks:

- `./node_modules/.bin/vue-tsc --noEmit`: PASS.
- `npm run build`: PASS, existing >500kB chunk and inlineDynamicImports warnings.
- `node --check` for both new browser files: PASS.
- `git diff --check`: PASS.
- Dependencies installed/removed/updated: **none**; no lockfile changes.

The actual page referenced the newly built app script; `public/hot` was absent.
HTTP-fetched app, shared clinical runtime, Relawan layout, gate/session chunk and
service-worker bytes matched the local build by SHA256. Hashes are retained in
the sanitized browser result. No personal-profile cache/worker was cleared or
forced to activate. Browser evidence used a fresh protected profile.

## Browser results

Command: `node tests/Browser/demoAccountSwitching.browser.mjs`.
Final result: `/tmp/rapid-mind-demo-switching/p0-run-7fSlvv/results.json` — **PASS**.
Each ordinary login was checked against the real Inertia authenticated identity;
after logout the protected web route `/relawan/home` returned HTTP401 with JSON
Accept headers. The JWT-only `/api/auth/me` is not used to prove web-session identity.

| Scenario | Result |
| --- | --- |
| Admin35 → `/admin/summary` → logout | PASS |
| Relawan1 / owner36 → enrollment → `/relawan/home` → logout | PASS |
| HealthcareA39 → `/healthcare/emergencies` → logout | PASS |
| Relawan3 / owner38 → independent enrollment → `/relawan/home` → logout | PASS |
| HealthcareB40 → `/healthcare/emergencies` → logout | PASS |
| Returning Relawan1 → explicit unlock → reload → locked-gate offline logout → failed and successful server retries | PASS |
| Admin35 → `/admin/summary` again | PASS |

Only the active Relawan key was ready after enrollment; both keys were locked at
every logout and in Healthcare/Admin contexts. Returning owner36 required its
passphrase; reload restored the locked gate. The gate's Keluar action worked
without that key. Offline logout durably set `logout_pending`; an intentionally
aborted /logout request showed safe error feedback with all keys still locked.
Restored normal /logout completed revocation. Wrapped-key fingerprints and local
row counts were preserved through logout and retries.

Normal online unlock also persists the established encrypted owner-profile record.
The harness waits for that legitimate write rather than treating all local rows as
an error. This profile contained no patients, assessments, emergencies, outbox
items or encrypted outbox indexes. Nonempty unsynchronized clinical-row retention
is covered by automated tests, not this authentication-only browser run.

The request guard allowed ordinary login/logout and the existing read-only broadcast
authorization request; other non-read requests were blocked. The final run attempted
**zero clinical mutations**, sent no emergency notifications and accessed no personal
browser profile. Reverb delivery is not claimed by successful channel authorization.

Earlier diagnostic runs and new harness iterations ended incomplete/failed; they are
not counted as passes. Harness assertions were corrected for web vs JWT identity,
JSON401 semantics, normal encrypted owner-profile storage, broadcast authorization,
and the actual owner-name heading before the final complete passing run. Application
enrollment behavior was not altered to satisfy these assertions.

## Preservation and limits

A final read-only PostgreSQL inventory matched the previous competition report's
final inventory for the schema and **30 tables**, including all clinical,
organization, audit, referral and dispatch data. Only sessions, cache and users
changed through normal authentication. Patients12, assessments12, emergencies5,
referrals2 and audit logs45 remain unchanged. This comparison uses the prior
checkpoint inventory; it is not a newly captured pre-run baseline.

Account IDs, roles, assignments and preserved-field hashes match that inventory;
protected credentials still match the database. Existing Healthcare logout
increments `token_version` and updated_at; repeated diagnostic logouts therefore
changed those users normally. No fixture updater, reset, seeder, migration,
dependency operation, service restart or Git mutation was performed.

Trusted-input delivery remains unresolved at the browser-driver level. Natural
background/foreground locking, native mobile behavior, real-user migration,
nonempty clinical browser workflows, realtime and P1/P2/C2/C3 acceptance were not
performed here. Keep existing P0 local-demo CONDITIONAL PASS, natural-lock NOT
TESTED, C2 NOT ACCEPTED and C3 not-started classifications unchanged.

Suggested next checkpoint: owner/Antigravity trusted-pointer confirmation of
recovery and locked-gate logout against these served assets. That narrow check
must not automatically start C3 or expand clinical mutations.

Suggested owner commit message (logout source change only):
`fix(relawan): allow safe logout from the locked encryption gate`
