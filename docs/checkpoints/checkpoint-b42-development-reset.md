# B4.2 development reset proposal — NOT EXECUTED

This is a proposal for separate owner approval. No reset code is imported by the application. No browser data or PostgreSQL data was deleted during B4.2.

## Scope to approve

The Compose browser entry is port 8080. This proposal names **`http://localhost:8080` only**. `http://127.0.0.1:8080`, HTTPS origins, other ports, and remote hosts are different storage scopes and are excluded. If the owner's dummy profile uses a different origin, stop and amend this proposal before approval; this implementation did not inspect a browser profile.

Delete the complete **`RapidMindOfflineDB`** IndexedDB database at the approved origin. The known stores are:

- `patients`, `patientSnapshots`, `assessments`, `emergencies`, `outbox` (all dummy, legacy and ownerless rows included).
- `encryptedStaging` (dummy staged/active ciphertext, including encrypted owner profiles).
- `offlineKeys`, `ownerEncryptionModes` (wrapped keys, pending enrollment, recovery confirmation).
- `encryptedOutboxIndex`, `outboxIdCounter`, `localSyncReceipts` (queue identity high-water, initialization and acceptance evidence).
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
5. Remove only the named RAPID-MIND lock token and verified Inertia history keys. Close the tab and browser profile, then reopen. Ordinary builds should display the controlled activation explanation. They must neither enroll an owner nor write plaintext.
6. After separate B4.3 authorization, serve an **isolated** acceptance build/profile and use authenticated synthetic Relawan identity. `encrypted-acceptance` is the only new enrollment build mode. Do not deploy that mode to real users. A different acceptance origin starts with its own empty storage; resetting localhost does not reset that origin.
7. Verify the fresh → pending → confirmed lifecycle, unlock after reload, and absence of plaintext writes. New outbox IDs start afresh only because the entire dummy dataset was explicitly discarded; ordinary operation preserves the high-water mark.

Expected result: no old clinical rows, ciphertext, keys, receipts, continuity or PWA artifacts remain in the approved scope. Enrollment writes only wrapped key + pending metadata; recovery confirmation enables encrypted clinical storage. An unexpected legacy installation elsewhere remains intact and blocked.
