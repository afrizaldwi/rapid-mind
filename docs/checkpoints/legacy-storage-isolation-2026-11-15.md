# Legacy storage isolation without deletion — 15 November 2026

## Outcome and cause

The owner confirmed the exact legacy/pending-storage T0 rejection. Refreshing
assets could not change that storage state. Prior fresh-profile acceptance did
not exercise the owner's legacy condition.

New work can now use the same browser/profile, with no deletion or new profile.
Authenticated online continuity detects legacy plaintext counts, an owner V1
key, or unfinished enrollment and opens RapidMindDeviceOfflineDB. Original
RapidMindOfflineDB rows and keys remain untouched. No old payload is imported,
decrypted, re-encrypted, assigned to another owner, replayed or manually purged.

This is a profile/origin-wide separate database for new operations. Other
accounts' old rows remain in the original database too; no historical queue is
claimed as delivered. The compact disclosure on Relawan pages makes that limit
explicit. Healthy profiles keep their existing V2 key/database. An established
separate database is selected before continuity reads on offline restart.

## Security and rollback decisions

- Existing server enrollment authorization and exact-origin checks still apply.
- New AES-256-GCM device keys are non-extractable, owner scoped and proof checked.
- Selecting a database is not a login or an authorization grant.
- Local logout blocks reopening; failed selection does not rewrite continuity.
- Clinical access invalidates when switching, rejecting old asynchronous work.
- Old writers address the original database and cannot alter the new queue.
- T0 verification/final Send and atomic encrypted incident/outbox are preserved.
- Old ciphertext still requires its original key/secret to recover.
- No automatic second isolation is attempted for corrupt active storage.

Code rollback must keep both databases and account for new pending operations;
switching an old build back to its original database does not merge the queues.
Do not clear either database as a rollback step. Recovery/reconciliation of old
fieldwork is a separate scope, not completed by this checkpoint.

## Files for this checkpoint

- resources/js/offline/db.ts
- resources/js/offline/relawanContinuity.ts
- resources/js/layouts/RelawanLayout.vue
- resources/js/offline/deviceKeyWorkflow.ts (updated actionable fallback)
- resources/js/i18n/localizeMessage.ts
- tests/Node/helpers/offlineRepositoryFixture.ts
- tests/Node/deviceClinicalAccess.test.ts
- tests/Node/clinicalDomLock.test.ts
- tests/Browser/helpers/nativeChromeSession.mjs
- tests/Browser/ngrokT0.browser.mjs
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
- this checkpoint

Earlier uncommitted origin-policy/T0 changes remain. No dependency, lockfile,
database schema, .env, Git commit or push was changed in this checkpoint.
Synthetic browser accounts/reports were appended and retained.

## Verification and retained evidence

108 focused Node tests passed across device access/enrollment, mounted T0/SRQ,
clinical DOM locking, emergency delivery, assessment handoff/persistence and
offline navigation. TypeScript, frontend build and git diff --check passed.
PHP tests were not rerun: this checkpoint changes frontend storage only.
Actual browser tests nevertheless use real Laravel authentication, acceptance,
PostgreSQL persistence and authorized Healthcare pages.

Native Chrome mobile viewport, same profile throughout each legacy scenario:

- Legacy plaintext preserved, localhost: rapid-ngrok-t0-1ioiAK.
- Pending enrollment preserved, final build localhost: rapid-ngrok-t0-MhMRE9.
- V1 wrapped key and ciphertext preserved, final build localhost:
  rapid-ngrok-t0-Mu9vED.
- V1 wrapped key and ciphertext preserved, final build HTTPS ngrok:
  rapid-ngrok-t0-3rTi9m.
- Healthy V2 key remains the same after online reload: rapid-ngrok-t0-VxVcin.

Artifacts are under C:/Users/daffa/AppData/Local/Temp/<run>/report.json and PNGs.
Final legacy runs cover new non-extractable keys, original clinical-store/key
snapshots unchanged, no send from opening verification, online server receipt,
offline encrypted emergency/outbox without plaintext rows, offline refresh,
single delivery on reconnect, visibility in authorized Nakes browser and logout
blocking offline reopening. Nakes acknowledgement/clinical action is untouched.

Earlier runs 6qXoJF, xCO6uE and wTWAz7 timed out after offline navigation with a
blank view. Diagnostic profiles are retained. A fixture snapshot also initially
raced pending owner-profile caching; the runner now waits for that write before
inserting legacy fixtures. The final sequential localhost and ngrok refresh
scenarios pass; the earlier blank-view timeouts have no confirmed root cause
and are not reported as a separately fixed defect.
Four additional cold Chrome starts with networking disabled, using the retained
xCO6uE synthetic profile, rendered successfully with no captured exceptions.
Probe: C:/Users/daffa/AppData/Local/Temp/rapid-isolation-cold-probe.mjs.

## Active candidate and limits

Baseline HEAD 1389030 plus the uncommitted candidate. Published entry:
assets/app-y_cYBITR.js, verified in HTML from both:

- http://localhost:8080
- https://snack-reproduce-sublet.ngrok-free.dev

The user's physical phone/profile was not inspected. Physical Android/iPhone,
native background behavior and realtime notification delivery are not accepted
by this checkpoint. Old fieldwork recovery is not performed. Suggested next
checkpoint: verify the owner's same-profile phone flow and investigate any
reproducible offline-refresh blank view before broader acceptance.

To use the new build without clearing storage, save current work, close all
RAPID-MIND tabs/PWA windows, reopen the same origin online, and let Home prepare
the separate encrypted storage. New fieldwork then uses the normal workflow.
