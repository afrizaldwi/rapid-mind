# Online assessment start checkpoint

The creation form no longer invokes local assessment creation unconditionally.
Online requests use the established assessment sync endpoint, canonical ID check,
existing authorization and idempotency. Successful creation navigates to Identity
without local hydration, enrollment or unlock. Offline creation retains the
existing encrypted workflow. Failed/uncertain online creation retains stable
patient/assessment IDs and an immutable creation snapshot for encrypted retry.
The layout exposes an explicit unsaved warning before the operation-specific gate.

Failed creation with a locked key requires unlock and another Start action.
Until that succeeds, the snapshot is only in memory and the page must stay open.
Enrollment-disabled environments cannot persist that encrypted fallback. No
plaintext alternative or automatic enrollment bypass was added. Existing later
online stage adapters were not changed; partial answers may remain page-memory
only on failure as documented in the earlier online persistence checkpoint.

Files changed in this checkpoint:

- resources/js/Pages/Relawan/Assessment/Index.vue
- resources/js/layouts/RelawanLayout.vue
- tests/Node/onlineAssessmentStart.test.ts
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- docs/ui/online-assessment-start-2026-11-14.md

Verification:

- 319 frontend tests pass, including creation without key/local writes,
  stable identifiers during uncertain acceptance, existing encrypted cleanup,
  failure retention, offline durability and T0 safety regressions.
- Docker OnlineAssessmentPersistenceTest: 2 tests, 16 assertions pass using
  DatabaseTransactions. No database reset or RefreshDatabase suite was run.
- TypeScript, production build and git diff --check pass. Existing large-bundle
  and inlineDynamicImports warnings remain. Dependencies were not changed.
- Native Chrome against actual Laravel/Nginx created synthetic assessment
  0b33d188-b7c2-4b20-a232-dcbd8721dde2 online without key entry, with identical
  local clinical snapshots before and after. Evidence:
  C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-DQxm9h/results.json.
- Chrome then blocked creation delivery. It verified the unsaved warning and
  no local change before unlock. After explicit unlock and Start, synthetic
  assessment de0d8d8a-5760-4fc3-a81f-3029ab2c77e1 and its retry queue were
  encrypted, with plaintext table counts unchanged. This synthetic unfinished
  pending work was retained. Evidence:
  C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-oNFNFU/results.json.

Published and browser-observed final entry asset: assets/app-0EN34KBu.js.
URL: http://localhost:8080/relawan/assessment.
No commit/push, dependency changes, storage reset, key migration or clinical-data
deletion was performed. Previously implemented receipt-verified local cleanup
was preserved and its automated tests pass; no new Healthcare acknowledgement or
physical-phone acceptance was performed. Stop for review. A separate checkpoint
is needed to extend encrypted recovery to every later online assessment stage.
