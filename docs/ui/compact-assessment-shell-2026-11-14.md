# Compact assessment shell

The menu placement in this earlier checkpoint is superseded by
[direct assessment controls](direct-assessment-controls-2026-11-14.md).

Assessment routes now use a single-row header with logo, shelter, status and
native disclosure menu. Full shelter name, language selection, data details and
existing logout action remain accessible in the menu. Other Relawan pages retain
their existing header. Patient identity, assessment mode and answer progress remain.

Routine PWA readiness messages are suppressed only in the compact assessment
shell. Update/error notices use a disclosure with the original instructions and
offline-readiness check. No forced update, reload, cache clear or worker takeover
was added. The permanent online-assessment explanation moved into Status Data.
Actual stage save errors remain in their existing alerts. A lost device connection
adds a concise warning to keep unsaved work open. The Online indicator reflects
connectivity, not proof of a successful save. Local status and server assessment
persistence remain explicitly separate in the details.

Files changed:

- resources/js/layouts/RelawanLayout.vue
- resources/js/components/Relawan/Assessment/AssessmentAppHeader.vue
- resources/js/components/Relawan/OfflineReadinessNotice.vue
- resources/js/components/Relawan/RelawanStatusDataSheet.vue
- tests/Node/compactAssessmentHeader.test.ts
- docs/ui/compact-assessment-shell-2026-11-14.md

Verification: TypeScript, production build and git diff --check pass. All 321
frontend tests pass, including compact-header and PWA-notice regressions.
Native Chrome tested the actual Docker
Laravel/Nginx application at widths 320, 421 and 1440px. Header height was 61px,
question scroll area began at 115.5px and no horizontal overflow occurred. Footer
stayed at the viewport bottom while questions scrolled. Language menu, data details
and T0 guidance worked. Logout availability was checked without signing out.

A synthetic Q1 save was deliberately blocked. Its actual error remained visible
at the footer without moving the footer off screen. The test did not submit a T0
and the clinical IndexedDB snapshot was identical before and after. No uncaught
browser errors occurred. Evidence/screenshots:
C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-d9DvO7/results.json.

Published/browser/HTTP-verified entry asset: assets/app-BG-yfW9m.js.
URL: http://localhost:8080/relawan/assessment.

Dependencies installed: none. No clinical data deletion, database/storage reset,
key migration, commit or push. Existing build warnings remain. PHP tests, actual
logout, physical devices and new Healthcare/realtime acceptance were not run for
this UI-only checkpoint. Previously uncommitted work was preserved. Stop for
owner review; next check is manual acceptance of the compact header on a phone
after the normal PWA update.
