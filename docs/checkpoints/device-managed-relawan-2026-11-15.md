# Device-managed Relawan encryption — 15 November 2026

## Implementation

Owner-approved removal of additional offline authentication, including T0.
Device-managed non-extractable AES-256-GCM CryptoKeys use IndexedDB schema v9;
worker protocol v3 prevents treating old keys as new keys. No automatic deletion
or migration of legacy browser storage. Existing demo profiles need a separately
scoped clean start before using this implementation.

Encrypted repositories now handle online/offline assessment writes first, then
queue delivery. Relawan stage links use local navigation; ordinary server links
can fall back on transport failure. Backgrounding retains access. Logout writes
a synchronous non-sensitive barrier before IndexedDB completes, preventing
in-flight automatic restoration. Explicit online login clears that barrier.

Session status supplies an authenticated no-store CSRF token. Recovery verifies
owner/role/access generation, updates the token in memory and resumes delivery
without Home redirects. T0 retains final verification and atomic priority outbox,
with no additional input. Lost-response retries retain the same report identity.

## Verification

- Node regression: 60 test files passed (59 in combined run, remaining DOM file
  corrected and passed separately; final three shell/DOM regression files passed).
- Docker PostgreSQL identity checked: configured and actual rapid_mind_testing.
- Focused Docker backend suite: 37 passed, 86 assertions. No development DB reset.
- TypeScript and git diff --check passed.
- Isolated production build passed; public/build and public/hot unchanged.
- Final Chrome run: 7 scenarios PASS, using isolated production assets and a
  fresh profile. Evidence: /tmp/rapid-mind-device-browser-MUS9jC/results.json.
  Covers automatic setup, network loss during assessment, T0 verification through
  reconnect/offline send, offline reload, cold offline browser restart, CSRF and
  lost-response retry with one accepted T0, and offline logout preservation.
  Earlier diagnostic failures are retained and are not counted as passing.
- Final isolated build: /tmp/rapid-mind-c1-pwa-aKeh3V/build.

Commands: ./node_modules/.bin/vue-tsc --noEmit; per-file node tests/Node/*.test.ts
through /tmp/rapid-mind-device-checks.py; Docker php artisan test with filter
RelawanSessionRecoveryTest|OfflineEnrollmentAuthorizationTest|LocalOfflineEnrollmentTest;
node tests/Browser/helpers/localPwaBuild.mjs; RAPID_MIND_DEVICE_BUILD pointing to
the isolated build with node tests/Browser/deviceManagedRelawan.browser.mjs.

## Limits and rollout

Browser automation uses actual Chrome, IndexedDB, service worker and built Vue
application behind a closed synthetic HTTP server. This is not live Laravel
browser E2E, Healthcare realtime acceptance, native mobile testing or production
security certification. The existing installed playwright package was reused;
no dependencies or lockfiles were changed. Cached/offline data includes locally
created or already-authorized downloaded records, not all server records.

No build publication, existing-profile cleanup, PostgreSQL reseeding, dependency
installation or Git mutation was performed. scripts/c2/ is pre-existing and
untouched. Next: owner review, scoped fresh-profile demo activation, then live
Relawan-to-Laravel workflow acceptance. Retained browser data is trusted at the
browser-profile boundary; no hardware-backed key or lost-storage recovery claim.

## Files changed

- `app/Http/Controllers/Relawan/RelawanSessionController.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `docs/RAPID_MIND_AUTH_PROVISIONING.md`
- `docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md`
- `docs/RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md`
- `docs/RAPID_MIND_T0_EMERGENCY_INTERACTION.md`
- `resources/js/Pages/Relawan/Assessment/Drafts.vue`
- `resources/js/Pages/Relawan/Assessment/Index.vue`
- `resources/js/Pages/Relawan/Assessment/Srq.vue`
- `resources/js/app.ts`
- `resources/js/components/Relawan/OfflineEncryptionGate.vue`
- `resources/js/components/Relawan/T0Verification.vue`
- `resources/js/composables/useAssessmentPersistence.ts`
- `resources/js/layouts/RelawanLayout.vue`
- `resources/js/offline/cacheRelawanPage.ts`
- `resources/js/offline/clinicalAccessFence.ts`
- `resources/js/offline/clinicalKeyEnrollment.ts`
- `resources/js/offline/clinicalStorageInitialization.ts`
- `resources/js/offline/csrfToken.ts`
- `resources/js/offline/db.ts`
- `resources/js/offline/deviceKeyWorkflow.ts`
- `resources/js/offline/deviceOfflineKey.ts`
- `resources/js/offline/encryptedClinicalStorage.ts`
- `resources/js/offline/jsonRequest.ts`
- `resources/js/offline/localEnrollmentAuthorization.ts`
- `resources/js/offline/localLogoutIntent.ts`
- `resources/js/offline/offlineCrypto.ts`
- `resources/js/offline/offlineEncryptionStaging.ts`
- `resources/js/offline/offlineKeyMetadata.ts`
- `resources/js/offline/relawanContinuity.ts`
- `resources/js/offline/sessionProbe.ts`
- `resources/js/offline/sessionRecovery.ts`
- `resources/js/offline/syncManager.ts`
- `resources/js/pwa/serviceWorker.ts`
- `resources/js/relawan/OfflineRelawanShell.vue`
- `resources/js/relawan/RelawanLink.vue`
- `resources/js/relawan/navigateRelawan.ts`
- `resources/js/relawan/runtime.ts`
- `tests/Browser/deviceManagedRelawan.browser.mjs`
- `tests/Browser/helpers/localPwaServer.mjs`
- `tests/Feature/RelawanSessionRecoveryTest.php`
- `tests/Node/clinicalBackgroundLock.test.ts`
- `tests/Node/clinicalDomLock.test.ts`
- `tests/Node/deviceClinicalAccess.test.ts`
- `tests/Node/helpers/offlineNavigationFixture.ts`
- `tests/Node/helpers/offlineRepositoryFixture.ts`
- `tests/Node/localEnrollmentActivation.test.ts`
- `tests/Node/offlineEmergencyGuide.test.ts`
- `tests/Node/offlineGatePreservation.test.ts`
- `tests/Node/offlineNavigation.test.ts`
- `tests/Node/offlineRecoveryConfirmation.test.ts`
- `tests/Node/offlineRelawanLink.test.ts`
- `tests/Node/onlineAssessmentPersistence.test.ts`
- `tests/Node/onlineAssessmentStart.test.ts`
- `tests/Node/relawanAssessmentUi.test.ts`
- `tests/Node/sessionRecovery.test.ts`


## Continuation — expanded assessment acceptance, 15 November 2026

The expanded isolated Chrome run passed **10 scenarios**. It additionally covers
all 20 SRQ answers, offline risk/function stage navigation, review, offline
completion with encrypted recommendation, and synchronization of the completed
assessment without leaving its result page. The earlier seven-scenario report
remains historical evidence; it is not overwritten.

Command: RAPID_MIND_DEVICE_BUILD=/tmp/rapid-mind-c1-pwa-aKeh3V/build node
tests/Browser/deviceManagedRelawan.browser.mjs.
Evidence: /tmp/rapid-mind-device-browser-tZUCQ1/results.json.
Only the browser runner and this report changed in this continuation.
The runner asserts that owner public/build and public/hot hashes remain unchanged.
No new packages, browser data cleanup, database writes, seeding or Git mutation.

Read-only Docker runtime preflight confirmed local environment, exact
http://localhost:8080 URL, rapid_mind database, local enrollment enabled and
Inertia DevTools disabled. This confirms target configuration, not live workflow
acceptance. The previous live Laravel runner still expects passphrases and must
be adapted before execution. No such obsolete runner was executed.

Next concrete checkpoint: back up and publish the isolated candidate to the
local public/build directory, use a fresh browser profile, and append a dedicated
synthetic Relawan plus synthetic assessment/T0 records for real Laravel browser
acceptance. Existing users, records and browser profiles remain untouched;
existing-profile cleanup and database reseeding remain separate. The owner must
explicitly authorize the live state-changing workflow under AGENTS.md before
that checkpoint executes.


## Owner-authorized localhost publication — 15 November 2026

The owner explicitly authorized publishing the prepared frontend so manual
localhost testing can begin. This supersedes the earlier unpublished status;
it does not authorize creating live synthetic accounts, browser cleanup or seeding.

Published candidate: `/tmp/rapid-mind-c1-pwa-aKeh3V/build`.
Backup of the preceding public/build: `/home/saga/coding/rapid-mind/storage/app/private/device-managed-frontend-7zzel0ch/previous-build`.
Private publication inventory: `/home/saga/coding/rapid-mind/storage/app/private/device-managed-frontend-7zzel0ch/publication.json`.
All 75 candidate files were installed with atomic file replacements, assets
before manifest and worker. Old chunks were retained. No public/hot was present.
Nginx GET verification matched SHA-256 for every candidate file; live /login
references `assets/app-BDp-o95K.js` with no Vite entrypoint.
Manifest SHA-256: `26c1e449683333b02b2874a013818465204f6a1a030ed327d8f80877985997e9`.

Open http://localhost:8080/login in a fresh browser profile, sign in online, and
allow offline setup to complete before disconnecting. Existing profiles may
retain old workers or incompatible passphrase stores; they were not cleared.
No existing browser profile, PostgreSQL data, seeder, dependency, Git history or
unrelated scripts/c2 content was changed. No live clinical E2E run was performed
in this publication checkpoint. Manual Relawan assessment/T0 acceptance is next.
