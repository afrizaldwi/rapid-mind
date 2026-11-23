# Relawan History removal checkpoint

## Result

Relawan navigation now has Beranda, PFA and Asesmen. The standalone Data/History
page is deleted. Its existing URL redirects to Beranda online and resolves to
Beranda in the offline router, preserving old bookmarks and recovery paths.
Home no longer queries or receives recent assessment history. Session recovery
and CSRF recovery return to Home.

Status Data retains access to encrypted pending deliveries, failed delivery
review, retry and preparation of completed work that has not entered the outbox.
Unfinished work remains accessible through Asesmen. Opening ordinary navigation
does not request an offline key. Explicit pending-payload inspection requests
unlock when needed. Successful unlock keeps the status dialog open. Key
revocation, replacement and owner/session changes still invalidate clinical views.

The earlier delivered-copy cleanup is preserved. Removal requires SYNCED,
ROUTED, a matching canonical receipt and the exact acknowledged ciphertext
digest. Pending dependencies, changed records and unknown delivery state remain
protected. Eligible orphan patient copies are removed with delivered work.
Minimal receipts and ID counters remain for replay protection. Server clinical
and audit records remain intact. ROUTED proves an authorized Healthcare
destination, not a human acknowledgement, validation or dispatch.

Unconfirmed routing counts as pending even when the outbox is empty. It is not
displayed as successful synchronization. No plaintext fallback was introduced.

## Files in the combined retention/removal checkpoint

- Deleted resources/js/Pages/Relawan/Data.vue
- app/Http/Controllers/Relawan/RelawanController.php
- resources/js/Pages/Relawan/Home.vue
- resources/js/layouts/RelawanLayout.vue
- resources/js/components/Relawan/RelawanStatusDataSheet.vue
- resources/js/components/Relawan/PendingClinicalQueue.vue
- resources/js/components/Relawan/LocalEmergencyActive.vue
- resources/js/composables/useRelawanDataWorkspace.ts
- resources/js/composables/useRelawanOperationalStatus.ts
- resources/js/offline/encryptedOutbox.ts
- resources/js/offline/outboxRepository.ts
- resources/js/offline/pendingDelivery.ts
- resources/js/offline/sessionRecovery.ts
- resources/js/offline/syncManager.ts
- resources/js/relawan/offlineRoutes.ts
- resources/js/i18n/locales/id.ts
- resources/js/i18n/locales/en.ts
- tests/Node/deliveredClinicalCleanup.test.ts
- tests/Node/pendingDelivery.test.ts
- tests/Node/relawanHistoryRemoval.test.ts
- tests/Node/sessionRecovery.test.ts
- tests/Feature/RelawanHistoryRemovalTest.php
- tests/Feature/AssessmentResumeTest.php
- tests/Feature/AssessmentLocalShellTest.php
- tests/Feature/RelawanT0SubmissionTest.php
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- docs/ui/relawan-history-retention-2026-11-14.md
- docs/ui/relawan-history-removal-2026-11-14.md

## Verification

- 313 frontend tests pass, including failed delivery, successful retry, routed
  receipt cleanup, pending dependencies, concurrency, missing receipts,
  lock/owner invalidation and pending delivery counts.
- Docker PHP Unit suite passes, 94 tests and 466 assertions.
- Transaction-only RelawanHistoryRemovalTest passes, 2 tests and 18 assertions.
- Transaction-only OnlineAssessmentPersistenceTest passes, 2 tests and 16 assertions.
- TypeScript, production frontend build and git diff --check pass.
- Existing build warnings remain for a bundle larger than 500 kB and deprecated
  inlineDynamicImports. Dependencies and lockfiles were not changed.

Native Chrome used an isolated synthetic profile and the published Nginx/Laravel
application. A test proxy disconnected only that profile for a genuine offline
reload. Clinical payloads and server receipts were not mocked.

Browser evidence under C:/Users/daffa/AppData/Local/Temp:

- rapid-history-removal-KmcSxJ: an explicitly submitted synthetic T0 persisted
  offline with its encrypted outbox. The runner used the wrong raw-index field
  and stopped; the report was retained.
- rapid-history-removal-Jqa0fI: pending T0 survived offline full-document reload
  and valid unlock. Blocked delivery retained the report and exposed retry.
  Online session recovery then reloaded the document and correctly locked it;
  the runner stopped waiting for a retry control in the replaced document.
- rapid-history-removal-8btKn6/results.json: after normal session restoration
  and unlock, retry succeeded against Laravel. The matching local encrypted
  emergency disappeared, its receipt remained and the server record was ROUTED.
- rapid-history-removal-zff7VR/results.json: final build passed mobile and
  desktop UI inspection, unlock/queue continuity, all three navigation links,
  retained ambiguous-routing status and no horizontal overflow. The delivered
  T0 remained absent after restarting Chrome. All five plaintext clinical
  IndexedDB tables were empty. No uncaught browser errors occurred.
- rapid-history-removal-QupqXH/results.json: the authorized Healthcare account
  opened the same synthetic T0 in its actual case UI after local cleanup.
  No acknowledgement, clinical validation or dispatch action was submitted.

The synthetic server report is e75e90f7-e2ef-4612-a83a-de0e9259599c and remains
available for review. Other unrelated data was not reset or deleted.

## Active localhost and limits

URL: http://localhost:8080/relawan/home

Published and browser-observed entry asset: assets/app-9reZZfpT.js.
Git base: 71b6ec7 plus this uncommitted working tree. No commit or push performed.

Old records without trustworthy delivery receipts, unresolved routing or pending
dependencies are retained. A previously server-hydrated assessment with unknown
routing remains visible as pending inspection in the synthetic profile. The
application does not guess that this is safe to delete.

Physical Android/iPhone acceptance and a full PHP Feature suite were not run.
The existing broader feature suites use RefreshDatabase; this checkpoint ran
only transaction-based feature tests to avoid database resets. Their affected
History expectations were updated but those broader suites were not executed.
New realtime delivery and Healthcare human acknowledgement were not tested.

No database/storage reset, destructive migration, old-key migration or dependency
change was performed. Stop here for owner review. A later checkpoint can verify
the provenance of old ambiguous copies before any selective cleanup.
