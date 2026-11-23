# Explicit ngrok enrollment and T0 acceptance — 15 November 2026

## Cause and implementation

The screenshot contained the newly published origin-denial message. Refresh
was working; the remaining restriction was the localhost-only device key policy.
The active local ngrok API identified the HTTPS tunnel targeting localhost:8080.

Added an exact HTTPS demo-origin allowlist with no wildcard and default empty.
All previous local environment, explicit enrollment opt-in, role, session-version
and owner checks remain. Direct Host and optional Origin must agree with the
configured origin. Server responses and authenticated Inertia bootstrap props
return the resolved permitted origin. The frontend accepts only the current
origin and binds new device activation metadata to it for offline restoration.
This does not grant production enrollment or migrate existing device keys.

Local ignored `.env` was updated only to include
`OFFLINE_ENCRYPTION_DEMO_ORIGINS=https://snack-reproduce-sublet.ngrok-free.dev`.
Existing entries and other environment values were preserved; no config-cache
clear or service replacement was needed. A changed tunnel URL needs a separate
explicit configuration update. `.env.example` documents an empty default.

## Verification

- 56 focused Node tests passed: device access, authorized/denied HTTPS grants,
  exact origin binding, logout, T0 final-action preservation and emergency delivery.
- 42 Docker PHP tests passed, 105 assertions, using guarded PostgreSQL testing
  transactions/unit tests. Cover localhost compatibility, configured HTTPS demo,
  denied other hosts, no wildcard, HTTP rejection, foreign Origin, spoofed Host,
  production denial, opt-out and wrong owner.
- TypeScript, frontend build, browser-runner syntax and `git diff --check` passed.
- Real Chrome through the actual HTTPS ngrok tunnel: all six browser scenarios
  passed. Uses new synthetic Relawan/Nakes profiles, real session auth, Nginx,
  Laravel and PostgreSQL. No auth, receipt or clinical-response mocks.

Browser scenarios:

1. Exact ngrok authorization and automatic non-extractable device key, no phrase.
2. Opening T0 verification and selecting a red flag did not create a report.
3. Explicit online Send persisted and routed T0 to the assigned facility.
4. With CDP network disconnected and `navigator.onLine=false`, a second explicit
   T0 Send retained an encrypted outbox operation without reaching the server.
5. Reconnection delivered that report once; exactly two distinct case IDs existed.
6. Both reports were opened on the authorized Nakes browser and their synthetic
   notes were visibly checked. No acknowledgement, clinical validation or dispatch
   action was performed.

The normal free-ngrok Visit Site step was exercised. Bypassing that page solely
with an extra page HTTP header does not authorize worker fetches: an early
diagnostic run got an HTML MIME error for the Service Worker. The successful
runner visits normally, waits for first installation to activate, then reopens
Home if necessary to establish its controller before disconnecting the network.
Earlier failed profiles/reports remain diagnostic artifacts, not PASS evidence.

## Active candidate and retained artifacts

- URL: `https://snack-reproduce-sublet.ngrok-free.dev`.
- HEAD baseline: `1389030`, plus this uncommitted candidate.
- Built app entry: `assets/app-qv3n5V7a.js`.
- PASS report/screenshots:
  `C:/Users/daffa/AppData/Local/Temp/rapid-ngrok-t0-62ORWU/`.
- Marker: `SINTETIS-NGROK-T0-4f6ce29d-e32`.
- Synthetic Relawan/Nakes IDs 64/65, facility 26, Posko 21, region 16.
- Online case: `4092b7eb-56ec-4471-8f02-4fac27811664`.
- Offline/reconnected case: `ec5c1e92-cd1c-4170-9195-88f7d2f14486`.

All synthetic fixtures/profiles are retained. Existing user data was not read,
reset, manually purged or migrated. Ordinary delivery retention behavior remains.
No dependencies, lockfiles, commit or push were changed by this task.
Desktop Chrome used a mobile viewport; physical Android/iPhone and real clinical
response were not tested. The Nakes screen still reports unavailable realtime;
this checkpoint proves server routing and browser visibility, not realtime
notification delivery. Existing installed PWA tabs may retain the previous worker;
save ongoing work before closing all RAPID-MIND tabs and reopening the same URL.

## Files for this origin-support change

- `.env` (ignored local exact-origin setting) and `.env.example`
- `config/offline.php`
- `app/Support/LocalOfflineEnrollment.php`
- `app/Http/Controllers/Relawan/OfflineEnrollmentController.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `resources/js/offline/offlineActivationEnvironment.ts`
- `resources/js/offline/localEnrollmentAuthorization.ts`
- `resources/js/offline/deviceKeyWorkflow.ts`
- `resources/js/offline/db.ts`
- `tests/Feature/OfflineEnrollmentAuthorizationTest.php`
- `tests/Node/localEnrollmentActivation.test.ts`
- `tests/Node/deviceClinicalAccess.test.ts`
- `tests/Browser/helpers/nativeChromeSession.mjs`
- `tests/Browser/ngrokT0.browser.mjs`
- `docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md`
- `docs/checkpoints/ngrok-t0-enrollment-2026-11-15.md`

The existing T0 key-restoration/form-preservation changes are retained. The next
separate acceptance scope is physical-phone usage and realtime delivery.
