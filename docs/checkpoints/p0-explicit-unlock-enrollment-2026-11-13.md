# P0 checkpoint: explicit unlock, storage preservation, enrollment authorization

Date: 13 November 2026 (Asia/Jakarta).
Source baseline: `c1c62b03b15723508539546d98dfeaa5fdb8715d`.
Scope authorized by owner: implement audit steps 1–3 and regression tests only.

## Changes

- Ordinary OfflineEncryptionGate now displays the existing explicit passphrase/recovery interface. Mount/reopen only inspect storage; no deterministic passphrase attempts, automatic recovery confirmation, reset, key replacement or data deletion remain in the gate.
- Existing pending enrollment continues through the existing explicit same-DEK recovery workflow; new enrollment requires recovery display and the user's confirmation before key installation.
- `LEGACY_BLOCKED`, `INCONSISTENT`, `INACCESSIBLE` and `ACTIVATION_DISABLED` remain blocked with emergency guidance. Unknown/ownerless data is preserved.
- Frontend enrollment eligibility and the server endpoint again require the approved exact `http://localhost:8080` policy. `resolvedOrigin()` delegates to all existing server guards; client/forwarded origin headers cannot provide an alternative grant.
- Removed `approveOwnerLocally()` and permissive response-origin matching. Server denial is not converted into local permission.
- Authorization reads existing owner continuity without rewriting it. Missing/different/logged-out/malformed continuity is rejected. Access generation is checked again after the asynchronous continuity read before granting runtime permission.

## Files

Application:
- `app/Support/LocalOfflineEnrollment.php`
- `resources/js/components/Relawan/OfflineEncryptionGate.vue`
- `resources/js/offline/localEnrollmentAuthorization.ts`
- `resources/js/offline/offlineActivationEnvironment.ts`

Regression tests:
- `tests/Node/offlineGatePreservation.test.ts` (new)
- `tests/Node/localEnrollmentActivation.test.ts`
- `tests/Node/helpers/mountedVueFixture.ts` (select options for Vue's input directives)
- `tests/Unit/LocalOfflineEnrollmentTest.php`
- `tests/Feature/OfflineEnrollmentAuthorizationTest.php` (new; transaction rollback, no schema reset)

Checkpoint record:
- `docs/checkpoints/p0-explicit-unlock-enrollment-2026-11-13.md`

## Verification performed

- 133 distinct Node tests PASS in one final focused run across 14 files: gate preservation, enrollment authorization/key lifecycle, recovery confirmation, DOM lock, storage security, crypto, offline navigation/links, emergency delivery, assessment regression, session recovery/probe and sync retry.
- Gate tests compile the real Vue component without the recovery bypass and use real enrollment/crypto/repository modules. IndexedDB transport and renderer are in-memory doubles; this is not browser evidence. Tests compare all fixture stores across mount/reopen, wrong passphrase and server denial, including unsynced emergency/outbox and ownerless/cross-owner legacy records. Explicit passphrase unlock and recovery confirmation are also exercised.
- `vue-tsc --noEmit` PASS.
- `npm run build` PASS in an isolated temporary copy, including client and PWA service worker. Existing localhost `public/build` assets were not overwritten. Build warnings concern large chunks and deprecated inlineDynamicImports; no dependency changes were made.
- `git diff --check` PASS.

## PHP verification follow-up — 13 November 2026

Docker became available on the owner's requested recheck; all six expected services were running. A read-only Laravel bootstrap with explicit test environment verified driver `pgsql`, configured and actual database `rapid_mind_testing`, and the existing users schema before tests ran. No migration or reset was required.

Focused command, run through Docker Compose:

```bash
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=pgsql -e DB_DATABASE=rapid_mind_testing -e DB_URL= -e CACHE_STORE=array -e SESSION_DRIVER=array -e BROADCAST_CONNECTION=null app php artisan test --filter='LocalOfflineEnrollmentTest|OfflineEnrollmentAuthorizationTest'
```

Result: **33 tests PASS, 78 assertions**, 1.27 seconds reported by the test runner. This covers 21 policy unit cases and 12 endpoint cases, including approved local session/origin, opt-out, production, configured remote URL, foreign Origin, IP/HTTPS mismatch, custom/forwarded-header bypass attempts and wrong owner. The endpoint tests use `DatabaseTransactions` with synthetic users and rollback; they do not use RefreshDatabase, migrate:fresh, seeders or table deletion. PostgreSQL sequence values may advance despite transaction rollback.

Docker `php -l` PASS for `app/Support/LocalOfflineEnrollment.php`, `tests/Unit/LocalOfflineEnrollmentTest.php` and `tests/Feature/OfflineEnrollmentAuthorizationTest.php`. No application/test source changes were needed for this follow-up. The initial Docker-unavailable attempt above is superseded by these measured PHP results; the Node/build results remain from their earlier scoped run.

## Browser verification follow-up — 13 November 2026

Owner authorized browser testing with synthetic profiles/data only; no deletion, storage reset, old-key migration or dependency changes.

New harness: `tests/Browser/p0ExplicitUnlock.browser.mjs`. Antigravity was unavailable in the session. The existing Playwright package was not resolvable, so the harness uses native Chrome DevTools Protocol through Node's built-in WebSocket and an already-installed Chrome; no package/browser installation was performed.

Environment: Chrome/157.0.8103.52, Windows headless, 1280×900, ordinary production-built assets with an actual activated service worker, native IndexedDB and real rendered Vue components. The existing `buildLocalPwa()` helper generated an isolated build at `/tmp/rapid-mind-c1-pwa-T4e61x/build`. The existing closed `localPwaServer()` HTTP proxy served this build at browser-visible `http://localhost:8080` with synthetic identity/policy responses; it never forwards to the owner's backend. Every profile was created fresh under a dedicated test directory and retained afterwards. No profile/cache/storage deletion was used.

Final result: **11 scenarios PASS**, zero uncaught browser exceptions, owner `public/build` and `public/hot` digest unchanged, no upstream forwarding and no backend mutation requests.

| Scenario | Result |
| --- | --- |
| Fresh page mount does not generate keys or activate encryption automatically | PASS |
| Server denial at recovery confirmation preserves pending key and closes clinical access | PASS |
| Explicit recovery display/confirmation; interrupted pending enrollment keeps DEK identity | PASS |
| Wrong offline passphrase preserves ciphertext/key/indices and excludes patient from locked DOM | PASS |
| UI SRQ edit durably saves an encrypted assessment/outbox without clinical plaintext stores | PASS |
| Offline reload retains the saved answer and waits for explicit passphrase unlock | PASS |
| Explicit recovery-code unlock works offline with the same key | PASS |
| Wrong online passphrase preserves existing encrypted draft/outbox/key without replacement | PASS |
| Repeated server enrollment denial remains blocked without frontend grant fallback | PASS |
| Added synthetic ownerless patient and other-owner emergency outbox survive quarantine/reload unchanged | PASS |
| Added synthetic missing-key metadata remains blocked and unchanged after reload | PASS |

Evidence retained locally:

- Final structured result: `C:\Users\daffa\AppData\Local\Temp\rapid-mind-p0-browser-d9ogjT\results.json`
- Six screenshots in the same directory, including `02-wrong-passphrase-preserved.png` and `03-offline-synthetic-assessment.png`; no recovery-code screenshots were captured.
- Four final browser profiles: `explicit-owner`, `denied-owner`, `legacy-ownerless`, `inconsistent-owner`.

Harness preparation also produced retained diagnostic runs. They are not counted as successful acceptance runs: the initial selector referenced old homepage wording, and later assertions ran before asynchronous draft hydration. The harness now waits for the observed workspace structure, enabled response control, durable decrypted synthetic answer/revision, and restored UI selection. Product code was not changed to resolve harness timing/selectors. A prior narrower 10-scenario run passed before the online-wrong-passphrase scenario was added; the final 11-scenario run supersedes it.

Reproduction requires an existing isolated production build and Chrome executable. Example PowerShell (substitute the newly generated build path):

```powershell
$env:RAPID_MIND_P0_BUILD = '\\wsl.localhost\Ubuntu\tmp\rapid-mind-c1-pwa-T4e61x\build'
$env:RAPID_MIND_CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/Browser/p0ExplicitUnlock.browser.mjs
```

`node --check tests/Browser/p0ExplicitUnlock.browser.mjs` and `git diff --check` PASS. Only the new harness and this checkpoint report were added/updated during this browser follow-up.

## Live browser–Laravel integration follow-up — 13 November 2026

Owner authorized synthetic-profile/data integration testing, preserving all existing data/storage/keys and dependencies. **Final outcome: FAIL — 9 scenarios PASS, 2 scenarios FAIL. No product code was patched during verification.**

### Environment and isolation

- Existing six Docker services were running. Read-only preflight confirmed `APP_ENV=local`, PostgreSQL `rapid_mind`, `APP_URL=http://localhost:8080`, local enrollment opt-in true, and Inertia DevTools false.
- Historical C2 accounts were absent. Each diagnostic run appended one uniquely named synthetic Relawan without Posko/facility; this is fixture provisioning through Docker/Eloquent, not a test of Admin provisioning. Passwords and offline passphrases were random, held in runner memory and sent over stdin/browser input, never in command arguments or result files.
- Real Chrome/157.0.8103.52 headless with a new persistent profile. `tests/Browser/helpers/liveLaravelProxy.mjs` overlays only isolated candidate static assets and forwards allowed dynamic routes to existing Nginx/Laravel. It does not synthesize login, session, enrollment, sync receipts or database state. Network loss is applied to both the page and its worker in this profile's proxy; reconnect restores actual upstream forwarding. Other origins/routes are blocked.
- Candidate build: `/tmp/rapid-mind-c1-pwa-gNFjys/build`; manifest SHA-256: `22d15363dc3bf7ea5fc5dcd3d637247c11b8517766f3c0f5ed734d67b9350d13`. Original `public/build`/`public/hot` digest remained unchanged. No container restart, .env change or frontend publication occurred.

### Final scenario results

| Scenario | Result |
| --- | --- |
| Safe local DB/config preflight and scoped synthetic fixture | PASS |
| Real CSRF-protected login; own policy HTTP 200/no-store, wrong-owner policy HTTP 403, no automatic key | PASS |
| Explicit enrollment and recovery confirmation reverified by real Laravel | PASS |
| Offline UI-created patient/assessment and encrypted SRQ draft; no corresponding server case yet | PASS |
| T0 final send from the active offline assessment | **FAIL** |
| Independent unidentified manual T0 from offline home: explicit final send, encrypted event and priority-1 outbox, no server event yet | PASS |
| Offline reload, wrong-secret preservation and recovery of same pending fieldwork | PASS |
| Online reload at the still-local emergency URL before server acceptance | **FAIL** |
| Known home route reconnect: actual emergency-first sync and PostgreSQL persistence | PASS |
| Canonical SYNCED receipts, online wrong-secret preservation and stable case counts | PASS |
| Separate anonymous profile: real enrollment HTTP 401 | PASS |

The independent home T0 is a separately exercised path, not a pass for the failed assessment-linked path. The home navigation used to continue after HTTP 404 is not an automatic-recovery success.

### Blocking findings

1. **Assessment-linked offline T0 rejects its own patient context.** Opening T0 from an active synthetic assessment, selecting MEDICAL_CRISIS and explicitly sending produced `T0 BELUM TERSIMPAN. Penyintas tidak sesuai dengan asesmen.` No emergency was created. The independent home/unidentified path succeeded. Source candidates: `RelawanLayout.vue:170` passes `show` before patient/assessment props; `T0Verification.vue:421` initializes `chosenPatientId` in a `props.show` watcher with `flush: sync` (`:460`), then sends that value with the assessment ID (`:482`). Prop-update ordering is a strong source-based hypothesis, not a completed race diagnosis or fix.
2. **Online reload of a local-only emergency returns 404 before sync.** The real GET `/relawan/emergencies/{localUuid}` returned HTTP 404 and no sync POST had occurred; ciphertext remained intact. Explicit navigation to `/relawan/home` and unlock allowed delivery. Source: `RelawanController.php:472`/`:489` requires a persisted owned server event, while `pwa/offlineNavigation.ts:23` only falls back on transport/5xx failures and passes 404 documents through. Any later fix must preserve owner/case authorization, including genuine unauthorized 404s.

### Real persistence evidence

Final run directory: `C:\Users\daffa\AppData\Local\Temp\rapid-mind-p0-live-l2tvfw`.
Structured evidence: `results.json`; screenshot: `01-locked-live-profile.png`; retained profiles: `relawan-live` and `anonymous-live`. No browser exception was observed in the final run.

Final account ID **12**:
- Patient count 1.
- Assessment `998f3137-9ec9-4252-82aa-f4e5efd636fe`: `IN_PROGRESS`, Q1 YES, Q2 NO, Q3 UNCLEAR, Q4 explicitly cleared to UNANSWERED; no triage result. Other untouched questions remain absent; this is not complete P2 acceptance.
- Independent emergency `c45ddd23-fd12-42ad-b39e-efdf77d5881d`: `PENDING`, `MEDICAL_CRISIS`, no associated assessment/patient, no GPS, `UNRESOLVED` routing. One emergency audit entry. This is not Healthcare acknowledgement or dispatch.
- Proxy network ledger records real successful emergency/assessment sync POSTs in that priority order; PostgreSQL reads confirmed exactly one case each. Browser decryption verified local `SYNCED` only after canonical acceptance. Stable counts after later unlock do not prove a deliberate replay/concurrency suite.

Diagnostic attempts were retained, not cleaned up. Early harness issues included initial login-document worker control, uppercase display text, and the fact that CDP page-offline emulation alone did not disconnect worker transport. A later proxy fix stopped injecting application scripts into real non-Inertia 404 documents. These harness changes did not modify application behavior. Actual T0 mismatch and local-only 404 findings remained reproducible in the final run.

Total retained backend fixtures across attempts: **8 synthetic accounts (IDs 5–12), 2 patients, 2 assessments and 2 independent emergency events**. Other unsynced work remains only in the corresponding retained isolated profiles. No manual profile/data/storage/key deletion or reset, old-key migration or dependency change was performed. Successful synchronization used the existing application acknowledgement/outbox-consumption behavior; persisted cases and receipts remain. No isolated test Chrome processes remain running. Credentials/recovery values are not exported; retained synthetic accounts may need separately authorized account management later.

### Files and remaining scope

Added only `tests/Browser/p0LaravelIntegration.browser.mjs` and `tests/Browser/helpers/liveLaravelProxy.mjs`; updated this report. Both new scripts pass `node --check`; `git diff --check` PASS. Prior 33 PHP/133 Node results were not rerun because application source did not change.

No Healthcare browser scope, case sharing, actual Reverb event receipt, clinical classification, referral, dispatch, external contact, native visibility/mobile locking or old-key migration acceptance was performed. Stop for owner review of the two blockers before authorizing fixes or another phase.

## Acceptance boundary

The earlier 11-scenario isolated/synthetic-response browser run passed. The later real Laravel/PostgreSQL run has 9 PASS and 2 blocking FAIL results as recorded above. Natural background/foreground lock, cross-tab invalidation, native mobile/installed-standalone behavior, Reverb/Echo receipt and cross-role live acceptance were not performed in these follow-ups. This checkpoint does not close C1/C2/C3 or establish full P0 acceptance.

## Preservation and limitations

No pre-existing user clinical storage was opened, reset, purged or migrated; no old keys were changed. Browser follow-ups used newly created isolated synthetic profiles only. No migrations, seeders, dependency/lockfile changes, container startup/restart, Git mutation or frontend publication were performed.

Existing ciphertext protected by the former known/deterministic passphrase is not cryptographically remediated by this source patch. It remains intact and may require separately authorized recovery/rotation. The application does not automatically substitute that passphrase. Unknown credentials may leave that data locked; login alone does not recover the DEK.

Tunnel/LAN enrollment is intentionally outside the approved localhost policy. Already-installed workers and built assets may still serve the prior client until a separately reviewed publication/activation. Old-writer retirement and real-user cutover remain separate work.

## Next checkpoint

Owner review of the live integration results first. The suggested next checkpoint is a narrowly scoped fix for assessment-linked T0 context initialization and local-only emergency reconnect routing, with regressions preserving owner authorization and pending fieldwork. No product fix or next phase is started by this verification task. Any data inventory, legacy-key recovery, rotation, cleanup or migration needs a separately scoped authorization.


## Subsequent repair checkpoint — 13 November 2026

The two real integration failures recorded above were fixed and regression-tested in the separately authorized [offline T0/local emergency repair checkpoint](p0-offline-t0-context-local-emergency-repair-2026-11-13.md). Its final run has 12 browser–Laravel scenarios PASS, 153 Node tests PASS and 36 PHP tests / 110 assertions PASS. Historical failures above are preserved for their original scope. Published assets, old keys and existing fixtures were not replaced/purged; full P0/C1/C2/C3 acceptance is not implied. The repair stops for owner review.
