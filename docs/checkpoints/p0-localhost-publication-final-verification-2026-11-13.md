# Localhost publication and final scoped P0 browser verification

Date: 13 November 2026 (Asia/Jakarta).
Owner authorization: publish the reviewed candidate to localhost, verify offline T0 using synthetic profiles, resolve issues in this scope and stop for review. Database/storage reset, manual data deletion, old-key migration and dependency changes remain prohibited.

## Final result

**PUBLICATION VERIFIED; 13 published-asset browser scenarios PASS.** The prior two offline T0/local-route blockers remain fixed when using the actual Nginx-served release, not the candidate overlay. No browser application exception occurred. This closes this publication/verification task; it does not certify production security or all C1/C2/C3 conditions.

## Publication performed

- Source: reviewed build `/tmp/rapid-mind-c1-pwa-yWwYVQ/build`, previously tested in the 153-Node/36-PHP/12-browser repair checkpoint.
- Target: `/home/daffa77/rapid-mind/public/build`.
- Confirmed `public/hot` absent; Laravel is using compiled assets.
- Backed up the existing full build before replacement to `storage/app/private/p0-publication-igym20ff/previous-build` (private directory 0700). Backup bytes were verified against the pre-publication inventory.
- Copied 68 candidate files additively, retaining all 68 pre-existing asset paths. Referenced chunks were copied before manifest/worker replacement. Old hashed chunks were not purged; earlier contents of replaced paths remain in the private backup. Manifest and worker files were replaced atomically. No database, clinical storage, keys or browser profiles were copied into the asset backup.
- Exact before/published file inventories and hashes: private `storage/app/private/p0-publication-igym20ff/publication.json` (0600).
- A preflight-only attempt found the staged public asset permissions were 0600, causing Nginx 403. Corrected all 68 published candidate files to 0644, preserving their hashes. The final HTTP and browser run passed after correction; that failed preflight created no synthetic account/profile or clinical data. No application source change was needed for this correction.
- No npm install, lockfile edit, migration, seeder, reset, manual data purge, key migration, Git mutation, container restart or forced service-worker activation.

## HTTP byte verification

Direct HTTP reads from actual localhost Nginx matched the published disk bytes:

| File | SHA-256 |
| --- | --- |
| `manifest.json` | `08145afcdf43e0893ea8a0a430d33cd08dafbe2cd6db4ae0c5a60cccbf50468e` |
| `serviceWorker.js` | `d98408b359204adcf159d1a1b6a62c55962cf56596cd0b05cd87ec1fcecb2460` |
| `assets/app-sjvZdb61.js` | `411c301796b1508a339ce8975a8f3cb9e2115f7cdcfc1464bf8c51b5660911e1` |

All returned HTTP 200. Worker headers include `Service-Worker-Allowed: /` and `Cache-Control: no-cache`. Actual Laravel login HTML references the published application chunk and no Vite development server/client.

## Browser verification

Harness: `tests/Browser/p0LaravelIntegration.browser.mjs` with `RAPID_MIND_P0_PUBLISHED=1`; helper `tests/Browser/helpers/liveLaravelProxy.mjs` now supports a published pass-through mode. In this mode it forwards allowed asset and dynamic requests unchanged to real Nginx/Laravel: no static candidate overlay, auth mock, fake receipt or HTML rewriting. The proxy is isolated to new test profiles and can cut connectivity for both the page and its worker; no system proxy is changed.

Chrome/157.0.8103.52 headless, native IndexedDB and actual registered/activated published worker; new `relawan-live` and `anonymous-live` persistent profiles. Real Laravel sessions, CSRF, policy, outbox sync and PostgreSQL `rapid_mind` persistence.

Final run: `C:\Users\daffa\AppData\Local\Temp\rapid-mind-p0-live-zEIS1y`.
Evidence: `results.json` and `01-locked-live-profile.png`. No credentials/recovery code were exported into the report or screenshots. All isolated test Chrome processes are closed; profiles and fixtures are retained.

13 PASS scenarios:
1. Published manifest/worker/app HTTP bytes and Laravel asset references.
2. Local environment/DB/enrollment/DevTools preflight and scoped synthetic fixture.
3. Real CSRF login, own enrollment policy 200/no-store, foreign-owner policy 403, no automatic key generation.
4. Explicit server-authorized registration/recovery confirmation.
5. Offline encrypted patient/assessment/SRQ creation while the server still has no case for the new account.
6. Explicit T0 send from the active offline assessment retains the correct patient/assessment context.
7. First tap creates no event; final send commits encrypted emergency plus priority-1 outbox offline.
8. Offline reload and wrong-passphrase preservation, then explicit unlock of the same pending fieldwork.
9. Reconnect/reload at the original local-only emergency URL opens its authenticated local lookup shell without 404 or a home-route workaround.
10. Actual emergency-first delivery and real PostgreSQL persistence with stable IDs/four SRQ states and no definitive score for incomplete evidence.
11. Canonical local SYNCED receipts, unchanged DEK proof and online wrong-secret preservation.
12. A persisted foreign synthetic case remains HTTP 404; an unknown UUID shows local-unavailable state without creating a case.
13. Separate anonymous profile receives real enrollment HTTP 401.

Network ledger: 92 requests forwarded to live Nginx/Laravel, 7 blocked by the deliberate profile disconnection and 4 blocked unsupported/background requests; **zero candidate-overlay responses**. Browser exceptions: 0. Published asset digest unchanged throughout the browser run (the digest was captured after publication).

New retained synthetic fixture: account **14**, patient `329213e7-351d-4b23-a9bf-0a43d7b32fc4`, assessment `4c77ecc7-0dc7-42e5-97a5-dbb67bc5adec`, emergency `6924ced4-23ab-40b9-8982-7a83b853a6f4`. Exactly one patient/assessment/emergency belongs to this run. Emergency links to that exact patient/assessment, remains PENDING with null GPS and UNRESOLVED facility routing; assessment is IN_PROGRESS with Q1 YES, Q2 NO, Q3 UNCLEAR, Q4 explicitly UNANSWERED and no triage result. One emergency audit entry was observed. No Healthcare action is inferred.

## Files/artifacts changed in this publication checkpoint

- Published candidate files under `public/build` (68-file hash inventory retained privately as above; old chunks retained).
- `tests/Browser/helpers/liveLaravelProxy.mjs`: optional actual-published pass-through with no rewriting/overlay.
- `tests/Browser/p0LaravelIntegration.browser.mjs`: published-mode HTTP/hash checks and assertions proving no candidate overlay.
- `docs/checkpoints/p0-localhost-publication-final-verification-2026-11-13.md` (this report).
- `docs/checkpoints/p0-offline-t0-context-local-emergency-repair-2026-11-13.md` (publication follow-up link; historical results preserved).

`node --check` for both updated harness files and `git diff --check` PASS. Application source/dependencies were not changed in this publication step, so the previous 153 Node and 36 PHP / 110 assertions remain their dated scoped evidence, not newly rerun results. Existing unrelated design-system files were left untouched.

## Limits and stop point

No existing user's profile/storage was opened or reset. Normal accepted sync consumes acknowledged outbox operations through existing application logic; cases/receipts remain. Existing older tabs/workers were not forced to activate and old keys were not migrated. This verifies a fresh synthetic profile against the published release, not a universal old-client cutover.

Healthcare/Reverb receipt, clinical/referral/dispatch progression, natural background/mobile lock and general real-user/old-key security acceptance remain outside the evidence. No production deployment was attempted. All work authorized for this localhost publication and offline T0 verification is complete. Stop for owner review; no further phase is started automatically.
