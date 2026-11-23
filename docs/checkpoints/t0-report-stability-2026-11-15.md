# Standalone T0 report stability — 15 November 2026

A routed server receipt enables existing local clinical cleanup. The active T0
panel previously emitted close after its local row disappeared. Offline detail
routes also supplied a static record snapshot, leaving transmission status stale.

The active panel and local-detail composable now observe ciphertext and receipt
stores explicitly, retain only the current owner-bound rendered snapshot when a
matching canonical receipt proves acceptance, and show SYNCED without closing.
The offline resolver supplies the record ID so status is reactive. Existing
cleanup, authorization, logout and clinical-state semantics remain unchanged.
No plaintext payload is persisted to preserve the page. This snapshot lasts only
for the mounted view; an offline reload after cleanup cannot restore deleted data.

Files: resources/js/components/Relawan/LocalEmergencyActive.vue,
resources/js/composables/useLocalEmergencyDetail.ts,
resources/js/relawan/offlineRoutes.ts,
tests/Browser/deviceManagedRelawan.browser.mjs,
tests/Browser/helpers/localPwaServer.mjs, and this report.

Verification: TypeScript and isolated production build passed; three focused
Node regression files passed. Actual Chrome: 12 scenarios passed, including
standalone online and offline-shell T0 views after ROUTED receipt cleanup.
Evidence: /tmp/rapid-mind-device-browser-bn7wJx/results.json. Earlier failed
runs remain diagnostic evidence; they are not counted as passing.
Browser HTTP is synthetic, not a live Laravel clinical E2E test.

Published the tested build /tmp/rapid-mind-c1-pwa-HMctV9/build to localhost.
All 75 asset responses matched candidate SHA-256; live login uses its entrypoint.
Backup: storage/app/private/t0-report-stability-r2cop_9h/previous-build.
No database writes, browser-profile cleanup, dependencies or Git mutations.
Next: close all existing RAPID-MIND tabs, reopen localhost and manually retry a
standalone T0 report. Do not clear browser storage or discard pending work.
