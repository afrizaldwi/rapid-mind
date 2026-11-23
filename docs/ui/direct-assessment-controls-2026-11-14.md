# Direct assessment header controls

The owner requested restoring visible language, status and sign-out controls
instead of the assessment hamburger. The header now displays full shelter identity
on the first row and direct controls on the second row on phones, with one row
on desktop. It uses existing operational typography, teal states and a light
logout stroke, preserving established controls and comfortable touch targets.
The high-end-visual-design skill informed spacing and proportion; its large hero
spacing, menu overlays and font replacements do not fit the owner's explicit
request to restore the existing compact operational layout.

The routine yellow PWA-update banner is no longer rendered above assessment
pages. Update instructions remain in Status Data. Genuine offline-readiness
errors still display a warning with the check action. No forced update, reload,
worker takeover or cache clearing was introduced. Other pages retain their prior
PWA-notice behavior. Save errors and lost-connection warnings remain visible.

Changed files:

- resources/js/components/Relawan/Assessment/AssessmentAppHeader.vue
- resources/js/components/Relawan/OfflineReadinessNotice.vue
- resources/js/components/Relawan/RelawanStatusDataSheet.vue
- tests/Node/compactAssessmentHeader.test.ts
- docs/ui/compact-assessment-shell-2026-11-14.md
- docs/ui/direct-assessment-controls-2026-11-14.md

Verification: all 321 frontend tests pass, including directly visible controls,
save-failure labels, connection warnings and suppression of update-only banners.
TypeScript, frontend build and git diff --check pass. Existing bundle-size and
inlineDynamicImports build warnings remain; dependencies were unchanged.

Native Chrome against actual Docker Nginx/Laravel verified 320, 421 and 1440px
layouts. Header heights were 94px on phones and 66px on desktop, with no
horizontal overflow. ID/EN and Status Data worked directly. Logout availability
was checked without signing out. T0 guidance opened without sending a report.
The footer remained docked while questions scrolled. Blocking a synthetic answer
save produced a visible footer failure warning. The clinical IndexedDB snapshot
before and after testing was identical; no data was deleted or reset.

Evidence and screenshots:
C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-cX3puz/results.json.

Published, HTTP-verified and browser-observed entry asset: assets/app-BVUKtK7J.js.
URL: http://localhost:8080/relawan/assessment.

No dependency changes, key migration, database/storage reset, commit or push.
PHP tests, actual logout, physical-device and new Healthcare/realtime acceptance
were not performed for this UI-only correction. Previous uncommitted work was
preserved. Stop for review; next check is owner acceptance on the phone after
the normal PWA update.
