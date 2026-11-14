# Online assessment and operation-specific T0 unlock

## Requested outcome

Continuing an authorized online assessment and opening T0 verification do not
require the local clinical key. Unlock remains required for encrypted device
reads and writes. Existing data and ciphertext are preserved.

## Changes and decisions

Online assessment stages use their server-authorized Inertia data and existing
save endpoints. The new adapter does not hydrate IndexedDB. Writes are serialized
and carry base_version. SRQ, risk and function save responses now return the
canonical server_version inside their transaction. Existing ownership,
completed-record guards and optimistic conflict checks remain enforced.

The assessment index and unfinished-assessment list show server drafts while
locked. Offline lists continue through the protected repository path.

Partial risk/function responses stay in page memory until the full stage can
be sent to the existing endpoint. Failed requests retain current-page answers
and show an unsaved/unconfirmed state. No plaintext offline fallback is used.
Server page scopes clear their adapter on logout/owner/path invalidation.
Local key changes continue to clear decrypted device views, while authorized
server views remain independent of that local key.

T0 opens verification immediately. Reading the local patient list or final
encrypted persistence can request unlock. Unlock retains the verification and
requires another explicit Send action. It never automatically sends a report.
The emergency and priority-1 encrypted outbox remain an atomic operation.

Online assessment context is provided only within the mounted page. At the final
encrypted operation, the existing hydration/merge logic preserves older local
drafts. A server-linked emergency uses its online assessment mode and preserves
the patient/assessment association. Its server-known snapshot is not requeued
as an assessment update. Server authorization and mode checks remain active.
Offline-created assessment context retains its established priority-2 workflow.

## Exact files changed in this checkpoint

- app/Http/Controllers/Relawan/RelawanController.php
- resources/js/layouts/RelawanLayout.vue
- resources/js/components/Relawan/T0Verification.vue
- resources/js/composables/useAssessmentPersistence.ts
- resources/js/composables/useClinicalTaskScope.ts
- resources/js/composables/relawanAssessmentDrafts.ts
- resources/js/relawan/onlineAssessmentContext.ts
- resources/js/offline/assessmentWorkflow.ts
- resources/js/offline/emergencyWorkflow.ts
- resources/js/Pages/Relawan/Assessment/Index.vue
- resources/js/Pages/Relawan/Assessment/Drafts.vue
- resources/js/Pages/Relawan/Assessment/Identity.vue
- resources/js/Pages/Relawan/Assessment/Srq.vue
- resources/js/Pages/Relawan/Assessment/Risk.vue
- resources/js/Pages/Relawan/Assessment/Function.vue
- resources/js/Pages/Relawan/Assessment/Review.vue
- resources/js/Pages/Relawan/Assessment/Result.vue
- tests/Node/onlineAssessmentPersistence.test.ts
- tests/Node/relawanAssessmentUi.test.ts
- tests/Node/clinicalStorageSecurity.test.ts
- tests/Feature/OnlineAssessmentPersistenceTest.php
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- docs/ui/online-assessment-t0-unlock-2026-11-14.md

## Verification

- All 300 Node tests passed, including four-state SRQ/Q17 safety, encrypted
  persistence, stale continuation rejection and existing five-minute lock tests.
- Docker PHP unit suite passed 94 tests with 466 assertions.
- New PostgreSQL feature tests passed 2 tests with 16 assertions, using
  DatabaseTransactions on guarded rapid_mind_testing. No database reset ran.
- TypeScript, production frontend build and git diff --check passed.
- Native Chrome with a synthetic profile completed SRQ, risk, function, review
  and canonical server result without enrolling or unlocking a device key.
- Simulated connection loss retained answers and displayed an unsaved warning.
- Before local persistence, patients, assessments, emergencies, outbox and
  offlineKeys all had zero rows in that isolated profile.
- Desktop/mobile-viewport checks covered locked draft lists, continuation,
  contextual T0, offline T0 opening, explicit final-save unlock and no first-tap
  emergency POST.
- A separate synthetic profile enrolled its own device key during final T0 save.
  Notes and selected indicator survived unlock. No report was sent until Send
  was pressed again. Server acceptance and patient/assessment linkage were
  checked through authorized responses and a scoped read-only database query.
- After T0 acceptance, the plaintext clinical stores remained empty.
- An early candidate report failed because assessment_mode was missing.
  The implementation was corrected and its encrypted regression test added.
  That isolated report was requeued through the existing repository with the
  same emergency ID and then accepted. No ciphertext was manually rewritten.

## Evidence locations

Online assessment and failure/privacy checks:
C:/Users/daffa/AppData/Local/Temp/rapid-command-LMSABx/

Final mobile continuation and T0 checks:
C:/Users/daffa/AppData/Local/Temp/rapid-command-pAK5n5/

Accepted server T0 and plaintext-store checks:
C:/Users/daffa/AppData/Local/Temp/rapid-command-khuREI/results.json

Same-ID recovery of the early synthetic report:
C:/Users/daffa/AppData/Local/Temp/rapid-command-UCSnAJ/results.json

## Serving and limits

Localhost:8080 and the active ngrok tunnel serve assets/app-CrlnCjqG.js.
Source remains uncommitted on baseline b2e6d88.
Existing PWA profiles should complete the normal close-all-tabs/reopen update
lifecycle. Device storage must be preserved.

No dependencies were installed. No keys were migrated and no clinical data was
deleted. One synthetic assessment/patient and two synthetic T0-Suspect reports
remain for review. The reports are server-accepted suspects, without a claim of
Healthcare acknowledgement or clinical validation.

Physical Android/iPhone background behavior and a full Healthcare realtime
acceptance run were not repeated. Offline persistence/retry regressions ran in
Node, while the browser checks covered offline T0 entry and encrypted T0
persistence followed by online delivery. Fresh-assessment creation retains its
existing encrypted local workflow.

Online answers without confirmed server acceptance must remain on the current
page for retry/review. A plaintext persistent fallback is deliberately absent.
Existing bundle-size and inlineDynamicImports build warnings remain.

Stop at this checkpoint for owner review.
