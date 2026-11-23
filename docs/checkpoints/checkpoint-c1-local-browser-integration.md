# C1 local browser integration

Reviewed 2026-11-07 (Asia/Jakarta), baseline `e1a8a2d02967107320806645234b705ed7eeb94c`, branch `demo`.

**C1 IMPLEMENTED — ACCEPTANCE PENDING**

The remaining acceptance item is a natural background/foreground transition. Both headless and headed Chromium kept `document.visibilityState` visible during automated minimization/tab switching in this environment, even with Playwright's forced-focus override disabled. The actual application visibility handler passed with an explicitly synthetic hidden-state stimulus; that does not establish natural background acceptance. No production deployment or live backend integration is claimed.

## Implementation and evidence by phase

| Phase | Change and corrected defect | Executed evidence | Limitation |
| --- | --- | --- | --- |
| C1.3 | Prepend one privacy middleware to web/API groups, covering early session rejection and authentication paths. Preserve clinical Inertia history encryption. Remove consumed Inertia bootstrap JSON so it cannot retain another clinical payload in the DOM after locking. | Database-free PHP middleware tests, real session-validator early 401/403/302 returns, API missing-bearer rejection, bootstrap ordering inspection; Chromium encrypted history and locked DOM checks. | Tests returning 419/429 exercise response wrapping; they do not execute live CSRF/throttle middleware or actual login sessions. |
| C1.4 | Preserve accepted encryption workflows. Extend session-probe deadline through response-body consumption; recheck owner/continuity before restoring online runtime. | Existing B4 Node regressions; new stalled-body and identity-race tests; Chromium unlock, wrong passphrase, reload/restart, owner switch, cross-tab invalidation, expired/inactive identity, logout, ciphertext retention. | Natural background acceptance pending. Browser server/authentication responses are synthetic. |
| C1.5 | Bound navigation fetch/body to seven seconds; retain authentication statuses. Reject redirected/wrong-MIME asset responses. Precache versioned logo. Remove unconditional update activation. Add worker inventory handshake and Indonesian readiness/update/error notice. | Ordinary production build; real Chromium worker installation, activation/control, offline dependency inventory, offline reload/cold start, manual SRQ without model, unsupported route, hanging navigation, waiting update and activation after all tabs close. | Update stimulus appends a comment to the built worker; this verifies browser update lifecycle, not migration between two different application asset graphs. STT model download/inference is outside this acceptance. |
| C1.6 | Add isolated build/server/assertion/lifecycle harness; preserve owner's existing assets/hot file and profile. Review changed files and clinical contracts. | Node suite, selected PHP unit suite, Vue/TypeScript, PHP lint, isolated production build, Chromium evidence, Git whitespace/inventory inspection. | Live Laravel/PostgreSQL, full backend Feature suite, and C2 are not executed. |

## Requirement matrix

PASS is limited to the evidence column. Automated fixtures and actual browser observations are distinct.

| Requirement | Isolated automated/source evidence | Actual Chromium evidence |
| --- | --- | --- |
| Clinical/authentication no-store headers and early session failures | PASS: privacy test, real session middleware with in-memory DB response and session | NOT TESTED against live Laravel; synthetic HTTP headers are not backend proof |
| Preserve status, redirect location, session rejection and role boundaries | PASS: middleware/identity regressions; authorization source unchanged | PASS for synthetic wrong-owner/inactive rejection; live backend authorization NOT TESTED |
| Inertia history encryption and locked clinical DOM | PASS: clinical DOM regressions | PASS: encrypted `history.state.page`, no patient in locked DOM/bootstrap JSON |
| Correct owner/passphrase and incorrect passphrase denial | PASS: encryption/enrollment tests | PASS |
| Reload/restart locks in-memory key; patient/assessment persists encrypted | PASS | PASS: actual offline reload and new browser process with same isolated profile |
| Manual T0 and priority-1 emergency outbox encrypted/atomic | PASS: existing security and emergency regressions | NOT TESTED: no browser emergency submitted |
| Previously enrolled offline access; unlock independent of authorization endpoint | PASS: local enrollment activation tests | PASS with proxy and browser networking both offline |
| Logout invalidates access; retained ciphertext survives errors/logout | PASS | PASS, including offline restart after logout |
| Owner switch prevents cross-owner access | PASS: enrollment/access fence and recovery tests | PASS: second synthetic owner locks first tab; prior ciphertext remains |
| Cross-tab invalidation | PASS | PASS: real storage-event delivery, application pagehide stimulus |
| Natural background/foreground lock | PASS: lock handler regression | NOT TESTED: automation/display visibility limitation in both headless and headed runs; synthetic visibility event PASSED |
| Interrupted initialization, inconsistent metadata, no plaintext fallback | PASS: existing B4 enrollment, storage, DOM and recovery tests | NOT TESTED as browser corruption/failure injection |
| Expired session cannot authorize new enrollment | PASS: enrollment authorization tests | PASS: new synthetic owner receives rejected enrollment authorization |
| First installation, activation and control | PASS: production worker/build inspection | PASS: actual generated worker, no mocked worker |
| Complete core offline asset graph and logo | PASS: production manifest graph inspection (27 graph files) | PASS: cache inventory compared independently with manifest imports/dynamic imports/assets, manifest, icons and logo |
| Real readiness and registration/install failure handling | PASS: registration regression covers READY, INCOMPLETE, ERROR, unsupported and development | PASS for ready inventory; install-failure browser injection NOT TESTED |
| Offline reload, cold browser restart, patient and assessment access | PASS: route/encryption source and regressions | PASS |
| Unsupported offline route | PASS: route source | PASS: explicit unavailable screen, records retained |
| Manual SRQ without downloaded STT | PASS: SRQ/assessment regressions | PASS: manual answer saved offline and restored after browser restart |
| Update waits for active drafts; activation after tabs close | PASS: no skipWaiting path | PASS: waiting notice, unchanged controller, retained ciphertext, activation on next cold start |
| Clinical/authentication payloads excluded from persistent SW caches | PASS: route allowlist and response-type/redirect policy tests | PASS for tested clinical JSON/auth HTML; cache inventory has static assets only |
| Web Storage contains no patient/passphrase | PASS: storage design/source | PASS for synthetic patient/passphrase sentinel inspection |
| Hanging navigation and session response body | PASS: stalled header/body deadline tests | PASS for hanging navigation; session-body stall covered by Node |
| SRQ four states, Q17 confirmation, nonverbal independence, T0 priority | PASS: unchanged contracts and full Node/selected triage regressions | Manual SRQ persistence PASS; full clinical E2E NOT TESTED |
| Healthcare/Relawan separation | PASS: relevant Node regressions and unchanged role rules | Live role/backend integration NOT TESTED |
| Public deployment and C2 synchronization | DEFERRED: outside C1 | DEFERRED |

## Verification executed

- `node --experimental-strip-types --test tests/Node/*.test.ts`: PASS, **29 files / 0 failures**. The runner reports file-level results, not a count of every inner test.
- `./node_modules/.bin/vue-tsc --noEmit`: PASS.
- `docker compose exec -T app php vendor/bin/phpunit --no-configuration --do-not-cache-result --bootstrap vendor/autoload.php tests/Unit/ClinicalBrowserPrivacyTest.php tests/Unit/LocalOfflineEnrollmentTest.php tests/Unit/SrqResponseMapTest.php tests/Unit/Triage tests/Unit/ReferralDispatchLifecycleTest.php`: PASS, **82 tests / 302 assertions**. No application boot, real session storage, or PDO connection in the added privacy fixtures.
- Docker `php -l` on `ClinicalBrowserPrivacy.php`, `bootstrap/app.php`, and `ClinicalBrowserPrivacyTest.php`: PASS.
- `node tests/Browser/helpers/localPwaBuild.mjs`: PASS. Ordinary `production` mode output at `/tmp/rapid-mind-c1-pwa-rCnSy6/build`; build log retained beside it. Owner's `public/build` and `public/hot` content digests unchanged.
- Production Chromium acceptance: **18 PASS, 1 NOT TESTED**, zero unexpected application errors; latest headed evidence at `/tmp/rapid-mind-c1-pwa-rCnSy6/acceptance-ZJl45y/results.json`; headless evidence at `/tmp/rapid-mind-c1-pwa-rCnSy6/acceptance-F8rOhl/results.json`. No mutation requests reached even the synthetic server in those runs. Browser reports are observations of the actual generated worker and ordinary app code; authentication/server responses are synthetic. The optional manual-background mode described below has not been executed.
- `git diff --check`: PASS. Git inspection only; no commit or index operation.

## Exact change inventory

C1.3:

- `app/Http/Middleware/ClinicalBrowserPrivacy.php`
- `bootstrap/app.php`
- `resources/js/app.ts`
- `tests/Unit/ClinicalBrowserPrivacyTest.php` (new)

C1.4:

- `resources/js/offline/sessionRecovery.ts`
- `resources/js/offline/sessionProbe.ts` (new)
- `tests/Node/sessionProbe.test.ts` (new)
- `tests/Node/sessionRecovery.test.ts` (new)

C1.5:

- `resources/js/pwa/register.ts`
- `resources/js/pwa/serviceWorker.ts`
- `resources/js/pwa/assetCachePolicy.ts` (new)
- `resources/js/pwa/offlineNavigation.ts` (new)
- `resources/js/components/Relawan/OfflineReadinessNotice.vue` (new)
- `resources/js/layouts/RelawanLayout.vue`
- `tests/Node/clinicalDomLock.test.ts` (existing harness adds notice stub)
- `tests/Node/pwaTransport.test.ts` (new)
- `tests/Node/pwaRegistration.test.ts` (new)

C1.6:

- `tests/Browser/localProductionPwa.browser.mjs` (new)
- `tests/Browser/helpers/localPwaBuild.mjs` (new)
- `tests/Browser/helpers/localPwaServer.mjs` (new)
- `tests/Browser/helpers/localPwaAssertions.mjs` (new)
- `tests/Browser/helpers/localPwaLifecycle.mjs` (new)
- `docs/checkpoints/checkpoint-c1-local-browser-integration.md` (this report)

The pre-existing owner change in `vite.config.js` remains intact: loopback binding and localhost-origin CORS. This task did not edit that file. Nginx's loopback mapping remains intact. The manifest-only development CORS wildcard remains limited to that public manifest handler; it does not change the loopback listener.

## Safe completion procedure

Run from the repository in a graphical environment with the existing Chromium and Playwright dependencies:

```sh
RAPID_MIND_C1_HEADED=1 RAPID_MIND_C1_MANUAL_BACKGROUND=1 node tests/Browser/localProductionPwa.browser.mjs
```

The default command creates a fresh isolated production build and retained browser profile under `/tmp/rapid-mind-c1-pwa-*`. It does not reuse the owner's profile. Do not point the harness at an owner profile or replace the proxy with the owner application. Do not clear browser data to make a test pass.

The closed synthetic proxy binds an ephemeral loopback port and never forwards any request. Chromium, including service-worker requests, uses that proxy while seeing the exact `http://localhost:8080` origin required by enrollment. Foreign origins, CONNECT, and non-GET/HEAD requests are refused. It serves ordinary built assets plus explicitly synthetic server identity/page responses. No actual authentication, emergency receipt, dispatch, SMS or synchronization success is fabricated.

At the `MANUAL CHECK` console prompt, the harness allows 60 seconds to minimize or background only its isolated C1 Chromium window using the desktop controls. Restore that window after the clinical view locks. Do not interact with the owner's normal browser. The test must observe `visibilityState === "hidden"`, remove clinical content, require passphrase after return, and finish with no FAIL or NOT TESTED entries. Exit code 2 means acceptance remains pending; exit code 1 means a failed assertion or execution error. Retain the generated `results.json`, browser profile and failure artifacts for review. If this display still cannot produce a native transition, repeat in a graphical environment that can; do not mark that item passed from the synthetic event.

Development acceptance stays separate: the owner's `public/hot` and Vite process continue serving development assets. The production harness neither serves Vite URLs nor uses that profile. Development-mode usability does not prove PWA installation or offline restart. No service restart, hot-file removal, production-asset replacement, `.env` edit, or DB change is needed for this procedure.

Live Laravel session/authentication integration and different-release asset migration require separately scoped acceptance if desired; neither is represented as tested here. No commit recommendation is issued while natural background acceptance remains pending.

## Safety confirmation

No owner's browser profile/data was accessed or modified by browser tooling. No real clinical database/session was modified. No emergency, dispatch, SMS, notification or owner outbox request was sent. No Git mutation, dependency installation, environment configuration change, service restart, cache clearing or profile deletion was performed. All synthetic profiles and build artifacts remain outside the repository. No secrets or generated build artifacts are included in the change inventory. `docs/workflow.md` is unchanged. C2 was not begun; existing isolated Node synchronization regressions are regression tests only.
