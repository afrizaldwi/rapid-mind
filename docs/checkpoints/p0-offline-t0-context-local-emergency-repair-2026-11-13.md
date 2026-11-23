# P0 repair: offline T0 patient context and local emergency navigation

Date: 13 November 2026 (Asia/Jakarta).
Owner scope: fix the two observed integration blockers, add regressions, verify and stop. Existing uncommitted work was preserved. No dependency changes, database/storage reset, manual purge or old-key migration was performed.

## Result

Both previously failing paths now pass the scoped live browser–Laravel run: **12 scenarios PASS**, zero browser exceptions. Focused automation: **153 Node tests PASS**, **36 PHP tests / 110 assertions PASS**, type-check/build/PHP lint/diff-check PASS. This is scoped regression proof, not C1/C2/C3 or general P0 acceptance.

## Cause and changes

### Assessment-linked T0

The synchronous `show` watcher could run before Vue's optimized dynamic-prop patch finished assigning patient/assessment props. It copied an empty/previous patient into `chosenPatientId`, while the final send subsequently used the updated assessment ID. This explains the observed patient/assessment mismatch.

The regression initially passed with an unoptimized `h()` parent, then failed against the old code once it used the production-equivalent block/dynamic-prop update path. The same test passes after the fix, including closing/reopening for another assessment.

`T0Verification.vue` now derives the effective patient directly from active assessment props. The separate picker state remains only for standalone/manual selection. No first-tap auto-send, confirmation requirement, repository association check, encryption or atomic emergency/outbox transaction was weakened.

### Local-only emergency URL

The Relawan detail route previously required an already-persisted server event and returned 404 before the ordinary Relawan runtime could unlock/sync the retained local event.

The route now validates UUIDs and returns only `localEmergencyId` for a UUID absent from the server. It creates no event and returns no fabricated patient/status/clinical data. A UUID already persisted for another Relawan still returns 404; malformed IDs and role/authentication restrictions remain enforced. The service worker's treatment of genuine 401/403/404 is unchanged.

The client reads that ID through the existing owner-bound encrypted repository only after clinical unlock. `useLocalEmergencyDetail.ts` subscribes to the record so actual canonical reconciliation updates delivery state. Lock/owner/route/unmount invalidation drops the subscription and decrypted view; stale callbacks cannot reinstall it. Missing/inaccessible local data shows an explicit unavailable state instead of a T0 or server-acceptance claim. Existing authorized server details retain their filtered projection.

## Files touched in this repair checkpoint

Application:
- `resources/js/components/Relawan/T0Verification.vue`
- `app/Http/Controllers/Relawan/RelawanController.php`
- `resources/js/composables/useLocalEmergencyDetail.ts` (new)
- `resources/js/Pages/Relawan/Emergency.vue`

Regression/verification:
- `tests/Node/relawanAssessmentUi.test.ts`
- `tests/Node/localEmergencyDetail.test.ts` (new)
- `tests/Feature/RelawanEmergencyLocalShellTest.php` (new)
- `tests/Browser/p0LaravelIntegration.browser.mjs`

Documentation:
- `docs/checkpoints/p0-offline-t0-context-local-emergency-repair-2026-11-13.md` (this report)
- `docs/checkpoints/p0-explicit-unlock-enrollment-2026-11-13.md` (link to this follow-up; historical failures retained)

## Verification

Before implementation:
- Optimized-prop T0 regression failed to display/send the active synthetic patient.
- PHP local-shell regression returned 404 instead of the expected minimal shell; existing ownership/role assertions already passed.

After implementation:
- 153 distinct Node tests across 17 files PASS in one final focused run: local emergency page state, optimized T0 context, assessment UI, lock/storage/encryption, offline navigation/links, emergency delivery, sync retries, session recovery/probe, enrollment/recovery and PWA transport.
- New page regressions cover missing data, pending versus real SYNCED receipt, updates through the repository subscription, lock/owner/route/unmount races, changed UUID, foreign-owner rows, storage failure and existing server projection.
- Docker PHP run: `RelawanEmergencyLocalShellTest|LocalOfflineEnrollmentTest|OfflineEnrollmentAuthorizationTest`: 36 tests / 110 assertions PASS. Endpoint tests use DatabaseTransactions, never RefreshDatabase/migrations/resets. The PostgreSQL test-target guard requires `rapid_mind_testing`.
- Docker `php -l` PASS for the controller and new PHP test.
- `vue-tsc --noEmit` PASS.
- Isolated ordinary production client/service-worker build PASS via `buildLocalPwa()`. Build output `/tmp/rapid-mind-c1-pwa-yWwYVQ/build`; manifest SHA-256 `08145afcdf43e0893ea8a0a430d33cd08dafbe2cd6db4ae0c5a60cccbf50468e`. Existing owner `public/build` and `public/hot` digest unchanged.
- `node --check tests/Browser/p0LaravelIntegration.browser.mjs` and `git diff --check` PASS.

## Live integration evidence

Final evidence: `C:\Users\daffa\AppData\Local\Temp\rapid-mind-p0-live-tYl35G\results.json`.
Retained profiles: `relawan-live`, `anonymous-live`. Chrome/157.0.8103.52, headless, native IndexedDB and actual production service worker. The isolated candidate-asset proxy forwards dynamic requests to the real Docker Nginx/Laravel and PostgreSQL development database `rapid_mind`; it does not mock auth, policy, sync or database state. No system proxy or owner's existing browser profile was changed. Isolated test Chrome processes were verified closed.

All 12 scenarios passed:
1. Local environment/database/enrollment/DevTools preflight and one new scoped synthetic Relawan fixture.
2. Real CSRF login; own enrollment policy 200/no-store, wrong-owner 403; no automatic key.
3. Real server-authorized enrollment with explicit recovery confirmation.
4. Offline UI-created encrypted patient/assessment/SRQ draft while server case count stayed zero.
5. Explicit T0 final send from the active offline assessment retained its patient and assessment IDs.
6. Emergency plus priority-1 outbox saved offline; first tap alone created nothing.
7. Offline reload, wrong-secret preservation, explicit recovery of the same pending fieldwork.
8. Online reload at the **original local emergency URL** bootstrapped the authenticated lookup shell and unlock gate: no 404, home navigation or fallback bypass.
9. Actual emergency-first sync to Laravel/PostgreSQL with one case each and no definitive score for unresolved SRQ.
10. Canonical local SYNCED receipts, original DEK proof unchanged, online wrong-secret preservation and stable case counts.
11. Foreign persisted synthetic case still HTTP 404; unknown UUID displayed unavailable local state without creating a case.
12. Separate anonymous profile received real Laravel enrollment HTTP 401.

New retained development fixture: account **13**, one synthetic patient (`7391894a-30bb-42f9-b5ce-3e25a2be8f31`), assessment `c16edd42-2f03-42e2-b360-b346905e584b` and emergency `f15de093-a969-4014-8e08-9390a1f9efe0`. The emergency links to that exact patient/assessment, remains PENDING, has no GPS, and has UNRESOLVED facility routing. Assessment remains IN_PROGRESS with Q1 YES/Q2 NO/Q3 UNCLEAR/Q4 explicitly UNANSWERED and no triage result. One emergency audit entry was observed. Existing earlier test fixtures/profiles were not purged. Credentials/recovery values were not exported into evidence.

## Decisions, limits and next task

- No new dependencies or lockfile changes. No migration, seeder, reset, manual data purge, old-key change, Git mutation, container restart or frontend publication.
- Normal accepted sync consumes acknowledged outbox operations through existing application code; persisted cases/receipts remain. This is not manual cleanup or a retention migration.
- Existing published/installed frontend assets were deliberately not replaced. Candidate-browser proof does not establish compatibility of older clients with the new local lookup prop or a completed deployment/cutover; review and controlled asset publication remain separate.
- No full PHP suite was run because unrelated suites use schema-reset traits. No Healthcare action/notification, actual Reverb receipt, referral/dispatch, external contact, natural background/mobile locking, general replay/concurrency suite or old-key migration was tested here.
- Stop for owner review. Suggested next task: review this diff/evidence and choose a separately scoped candidate-publication/remaining acceptance checkpoint; no next phase is started automatically.


## Localhost publication completed — 13 November 2026

The owner subsequently authorized publication and final verification. The exact reviewed build is now published to localhost with a verified private backup and old asset paths retained. The [publication report](p0-localhost-publication-final-verification-2026-11-13.md) records 13 browser scenarios PASS against actual Nginx-served assets, with no candidate overlay or application exceptions. Historical isolated-candidate limits above remain attached to their original run. No reset, manual data purge, dependency change or old-key migration occurred. Work stops for owner review.
