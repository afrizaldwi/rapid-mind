# T0 emergency guidance panel checkpoint

## Change and decisions

Removed the standalone help card from Relawan pages and the clinical encryption
gate. The normal T0 verification panel now starts with a collapsed “Panduan
bantuan darurat” disclosure. Opening it does not request the offline key.

The locked offline shell retains a T0 button even when its unlock screen is
visible. This button opens a guidance-only dialog without a clinical form or
send control. It preserves keyboard focus handling and Escape/Close behavior.
The normal, unlocked offline workflow continues to use existing T0 verification.

The existing guidance text, unavailable-contact notice and distinction between
help, a report and a phone call remain. No contact number was invented. No
encryption, key lifecycle, scoring, server, database or delivery logic changed.
The explicit final report action still requests unlock for encrypted persistence,
retains verification and requires another explicit Send after unlocking.

Existing uncommitted History-removal work was preserved.

## Files changed in this task

- resources/js/layouts/RelawanLayout.vue
- resources/js/components/Relawan/LockedEmergencyGuidance.vue
- resources/js/components/Relawan/OfflineEncryptionGate.vue
- resources/js/components/Relawan/T0Verification.vue
- resources/js/relawan/OfflineRelawanShell.vue
- tests/Node/lockedEmergencyAssistance.test.ts
- tests/Node/offlineEmergencyGuide.test.ts
- tests/Node/offlineGatePreservation.test.ts
- tests/Node/relawanAssessmentUi.test.ts
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- docs/RAPID_MIND_T0_EMERGENCY_INTERACTION.md
- docs/ui/t0-emergency-guidance-panel-2026-11-14.md

## Verification

- 317 frontend tests pass. Targeted mounted Vue checks cover locked online and
  offline guidance, zero clinical reads/report creation on opening, closed/reopened
  disclosure state, limited-shell guidance and Escape. Existing final-action
  unlock, form preservation and explicit-send regression tests also pass.
- TypeScript, production frontend build and git diff --check pass.
- Docker services app, nginx, postgres, queue, scheduler and reverb were running.
- Native Chrome used an isolated synthetic profile, actual published Nginx/Laravel
  pages and a profile-scoped network proxy. Real offline reload reached the locked
  shell. No clinical endpoint responses or delivery receipts were mocked.
- Online PFA shows no help card. T0 guidance opens with DEK locked and no password
  input. Explicit final Send with a selected reason requests unlock without
  creating or sending a report. Guidance remains accessible in that state.
- Offline locked shell and its unlock view both expose guidance through T0 with
  no code. Escape closes the guidance dialogs. Mobile 390×844 and desktop
  1440×1000 layouts were inspected, with no desktop horizontal overflow.
- The five plaintext clinical tables, encrypted staging, encrypted outbox index
  and sync receipts have identical counts and SHA-256 snapshots before and after
  browser testing. Staging stayed at 3, encrypted outbox at 0 and receipts at 2.
  There were zero emergency POST requests and zero uncaught browser errors.

Evidence: C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-AzG8cM/results.json
and the mobile/desktop/offline screenshots in the same directory.

The first browser run used the previous offline PWA build. The new worker was
allowed to finish installing, then all controlled pages in the isolated profile
were closed and reopened normally. No unregister, cache clearing, storage reset,
forced worker takeover or data deletion was used. The complete rerun passed.
Normal users may similarly need to finish the PWA update and close old tabs.

## Active build and limits

URL: http://localhost:8080/relawan/pfa

Published, HTTP-verified and browser-observed entry asset: assets/app-FJQE9pDr.js.
Working tree changes are uncommitted; no Git mutation was performed.

Dependencies installed: none. No database or IndexedDB reset, clinical data
deletion or key migration was performed. PHP tests were not rerun for this
frontend-only change. Physical Android/iPhone, realtime delivery and new T0
submission were not tested in this checkpoint; browser testing intentionally sent
no emergency. Existing automated submission regressions passed.

Stop for owner review. Suggested next check is manual acceptance on the owner's
phone after the normal PWA update, without entering a code to open the guide.
