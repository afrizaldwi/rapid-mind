# Relawan History retention checkpoint

This earlier checkpoint is superseded by
[History removal](relawan-history-removal-2026-11-14.md). The retention safeguards
remain; the standalone Data/History page was subsequently removed.

## Behavior

History now displays unfinished and undelivered work. Copies acknowledged by
the server and routed to Healthcare are automatically removed from encrypted
device storage when no pending work needs them. Server clinical/audit records
remain in place. Healthcare acknowledgement is a separate business state.

Cleanup verifies the canonical receipt and its ciphertext digest. Failed,
unresolved, unacknowledged, edited, locked and concurrently changing records
are retained. A pending T0 retains its linked assessment and shared patient.
When all dependencies have been delivered, their eligible copies can be removed
together. Minimal non-payload receipts remain for replay protection.

An open local emergency panel returns to the previous page if its accepted
copy has been removed, avoiding an empty panel.

## Files

- resources/js/Pages/Relawan/Data.vue
- resources/js/components/Relawan/LocalEmergencyActive.vue
- resources/js/composables/useRelawanDataWorkspace.ts
- resources/js/offline/encryptedOutbox.ts
- resources/js/offline/outboxRepository.ts
- resources/js/offline/syncManager.ts
- resources/js/i18n/locales/id.ts
- resources/js/i18n/locales/en.ts
- tests/Node/deliveredClinicalCleanup.test.ts
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- docs/ui/relawan-history-retention-2026-11-14.md

## Verification and limits

Eight targeted regression tests cover removal, orphan identity cleanup,
retained receipts, unresolved routing, pending shared dependencies, changed
ciphertext, missing receipts, inactive owner scope, locking and concurrent writes.
All 308 frontend tests passed. TypeScript, production build and diff checks
passed. The active localhost asset is assets/app-IGtRlCAH.js.

Native Chrome used an isolated synthetic profile containing a previously
accepted T0. Opening/unlocking Data reduced encrypted emergency records from
one to zero. The synchronized-history section was absent. Evidence is in
C:/Users/daffa/AppData/Local/Temp/rapid-history-6QXa5k/results.json and
pending-only-history.png in that directory.
Reopening the profile kept the local report count at zero, and an authorized
server lookup confirmed the corresponding server record still exists.
That follow-up evidence is in
C:/Users/daffa/AppData/Local/Temp/rapid-history-D07MN5/.

Production/backend data and existing keys were not reset. No dependencies,
database schema changes or key migrations were introduced. PHP tests were not
needed for these frontend changes. Physical Android/iPhone was not tested.

Ambiguous old copies without a trustworthy receipt and legacy plaintext stores
are retained for separate verification. Receipt-less server-hydrated copies are
not treated as evidence of a successful local upload. Data still needed by a
pending operation is retained even if its own delivery has completed.

Stop here for owner review.
