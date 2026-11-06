# B4.2 development reset proposal — historical procedure

**B4.4 later status (2026-11-06):** the owner reports completion of the dummy browser IndexedDB reset and manual local enrollment. The procedure and original implementation evidence below are preserved; this is not authorization to repeat a reset. See the [B4.4 final acceptance correction](checkpoint-b44-controlled-development-activation.md) for the Gate B contract correction, safe rerun rules and remaining scope. No reset was executed by the correction task.

This is a proposal for separate owner approval, refreshed during B4.4. B4.3 isolated acceptance is complete within its agreed scope. No reset code is imported by the application. No browser data or PostgreSQL data was deleted during these implementation checkpoints. The owner's blanket dummy-data classification is not authorization to execute this procedure.

## Scope to approve

The Compose browser entry is port 8080. This proposal names **`http://localhost:8080` only**. `http://127.0.0.1:8080`, HTTPS origins, other ports, and remote hosts are different storage scopes and are excluded. If the owner's dummy profile uses a different origin, stop and amend this proposal before approval; this implementation did not inspect a browser profile.

Delete the complete **`RapidMindOfflineDB`** IndexedDB database at the approved origin. The known stores are:

- `patients`, `patientSnapshots`, `assessments`, `emergencies`, `outbox` (all dummy, legacy and ownerless rows included).
- `encryptedStaging` (dummy staged/active ciphertext, including encrypted owner profiles).
- `offlineKeys`, `ownerEncryptionModes` (wrapped keys, pending enrollment, recovery confirmation, and `LOCAL_DEVELOPMENT_V1` enrollment provenance).
- `encryptedOutboxIndex`, `outboxIdCounter`, `localSyncReceipts` (queue identity high-water and canonical acceptance evidence, including completed numeric `outbox_id` values).
- `relawanContinuity` (dummy verified-owner context and logout intent).

Unknown additional stores or databases require review, not automatic deletion. A fresh DB reopens at Dexie version 8; no owner key, mode, receipt or counter is carried across this deliberate complete dummy reset.

Delete only these CacheStorage names, if present:

- `workbox-precache-v2-http://localhost:8080/relawan/` (the installed Workbox scope-derived precache).
- `rapid-mind-onnx-runtime-v1` (RAPID-MIND runtime assets).

Unregister only the registration whose scope is `http://localhost:8080/relawan/` and script URL is `http://localhost:8080/build/serviceWorker.js`. Older root-scope workers or other Workbox cache names require an explicit inventory amendment. Do not use “Clear site data”, `localStorage.clear()`, `sessionStorage.clear()` or broad cache-prefix deletion.

Remove only the `rapid-mind:clinical-access-v2` localStorage token and Inertia's exact history-session keys `historyKey`, `historyIv`, and `inertiaLocationVisit` from the application tab's sessionStorage. Verify these names against the installed Inertia bundle before the separately approved operation. Close every old application tab to discard its own history/BFCache/sessionStorage and in-memory key. This procedure does not promise forensic erasure from browser backups, filesystem journals or crash recovery.

## Preconditions and manual procedure

1. Owner separately approves this exact origin, profile, stores, worker and cache allowlist. Confirm the selected profile contains only disposable development RAPID-MIND data. Confirm the server environment is `local`/an explicitly isolated acceptance environment, never a deployment containing future real records. No PostgreSQL operation is part of this procedure.
2. Close all RAPID-MIND tabs/PWA windows and stop old clients. Open one blank, same-origin, nonclinical page with DevTools. Do not leave an app tab available to reopen Dexie or refill caches. Record `location.origin`, `indexedDB.databases()`, cache names, service-worker scopes/script URLs and store **names/counts only**. Do not export clinical payloads or secrets.
3. Compare that inventory with the allowlist above. If any database/store/worker/cache has unexpected provenance, stop for review. Verify no browser connection is holding `RapidMindOfflineDB` open. Never automatically force-close or retry an unexplained blocked deletion.
4. Unregister the one approved worker and delete the two exact approved cache names through DevTools or a separately reviewed owner script. Delete `RapidMindOfflineDB` through DevTools. If deletion is blocked or fails, stop and report it; do not run a broader reset.
5. Remove only the named RAPID-MIND lock token and verified Inertia history keys. Close the tab and browser profile, then reopen. Keep `OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT` absent/false during inventory/reset. Ordinary assets remain fail-closed and must not write plaintext.
6. After separate approval of local activation, use the ordinary development assets (`npm run dev` or `npm run build`), **not** an acceptance/staging bundle. Confirm `APP_ENV=local` and `APP_URL=http://localhost:8080`. The owner may then explicitly set the server-only `.env` entry `OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT=true`. Codex has not changed this value. If Laravel configuration is cached, the owner must separately clear/update that cache using the established Docker workflow; do not assume the `.env` change alone is active. No service restart is included or authorized here.
7. Log in as an active synthetic Relawan through Laravel. The read-only authenticated `/relawan/offline-enrollment-status?owner_user_id=<current-owner-id>` must allow only the matching version-bound web session at the approved origin. Confirm the fresh → pending → recovery-saved → confirmed lifecycle and explicit unlock after reload. Confirm offline patient/assessment/manual-T0 persistence, priority-1 emergency outbox and canonical synchronization before calling live integration complete. Do not send a real emergency or SMS. New outbox IDs start afresh only because the entire dummy browser dataset was explicitly discarded; ordinary operation preserves the high-water mark.
8. Leave the server opt-in disabled in remote deployments. Disabling it later prevents new/completed pending enrollment but does not erase keys or revoke the already-enrolled owner's ability to unlock their local records offline.

Expected result: no old clinical rows, ciphertext, keys, receipts, continuity or PWA artifacts remain in the approved scope. Enrollment writes only wrapped key + pending metadata; recovery confirmation enables encrypted clinical storage. An unexpected legacy installation elsewhere remains intact and blocked.

## Recommended cutover alternative

A **fresh dedicated browser profile at `http://localhost:8080`** is preferred for the first real-development integration check. It starts with separate storage and leaves the old dummy profile intact, so no deletion is needed. Close old RAPID-MIND tabs and PWA windows in the selected profile before activation. Other profiles have separate browser storage. Do not change to `127.0.0.1:8080` as a shortcut: it is a different origin and is not authorized for local enrollment by this policy.

Raw native IndexedDB writes do not necessarily notify Dexie `liveQuery`. Schema v8, current-client hooks, worker update messages, and successful isolated tests cannot prove that every old same-origin bundle is stopped. Updated assets must be loaded after the approved cutover; the application never automatically clears unknown clinical data. Unknown legacy records remain blocked until a separately approved reset/recovery. Nginx now publishes port 8080 exclusively on the IPv4 loopback interface (127.0.0.1:8080:80), as verified during B4.4. Local enrollment remains restricted to the browser origin http://localhost:8080; the owner should keep this local opt-in application network-private. Host/origin checks are not a firewall and a deployment incorrectly configured as local remains a deployment risk.
