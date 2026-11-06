# B4.3 targeted clinical-key invalidation hardening

Date: 2026-11-06. This report covers the targeted correction only. Earlier B4.3 acceptance is owner-reported context, not a new claim that the full acceptance suite was rerun here.

## Correction

The layout previously masked/unmounted clinical content on an untrusted initialization result while leaving its installed runtime key available. Restoring metadata could therefore make the same key usable for rendering again.

`RelawanLayout.vue` now applies the actual initialization result and invokes the existing `lockAllClinicalKeys()` path whenever the current owner has an installed clinical key and the result is untrusted. This revokes the in-memory key and advances the existing access generation/cross-tab lock token. `INCONSISTENT`, `INACCESSIBLE`, `LEGACY_BLOCKED`, and `ACTIVATION_DISABLED` are untrusted. Unexpected `FRESH`/`ENROLLMENT_PENDING` with an already-installed clinical key also revoke it. An ordinary encrypted owner is trusted only in `ENCRYPTED_LOCKED` with a separately unlocked key; synthetic fixture `ENCRYPTED`/`LEGACY` states retain their existing behavior.

The existing synchronous watcher masks the clinical root before Vue unmounts it. Revocation can trigger another inspection through the key-generation watcher, but the `clinicalKeyReady(owner)` guard prevents repeated invalidation once the key is gone. No lock is generated for legitimate fresh/pending enrollment without an installed clinical key. Existing stale-owner/inspection-generation guards remain in place.

The encryption gate is keyed by owner and blocked-versus-recoverable storage state. It reloads its explanation/form when invalid storage recovers. Fresh → pending → confirmed enrollment remains in the same recoverable group, preserving the displayed recovery code and pending session. Restored metadata alone never installs a key. A passphrase/recovery unlock is still required before the workspace can mount again.

No clinical records, wrapped keys, receipts, or metadata are deleted, repaired, replaced, or migrated by this correction.

## Exact files changed in this correction

- `resources/js/layouts/RelawanLayout.vue`: revoke installed keys on untrusted initialization results; refresh the gate on blocked-state recovery.
- `tests/Node/clinicalDomLock.test.ts`: invalid → restored → explicit-unlock lifecycle, cached-key revocation, activation restriction, loop prevention, fresh/pending recovery and existing synthetic compatibility.
- `tests/Browser/clinicalKeyInvalidationFixture.ts`: mount the real Relawan layout with synthetic offline runtime for isolated acceptance.
- `tests/Browser/clinicalKeyInvalidation.browser.mjs`: temporary localhost origin/profile, real enrollment/unlock gate, metadata invalidation/restoration, and native-write observability probe.
- `docs/checkpoints/checkpoint-b43-key-invalidation-hardening.md`: this report and the explicit native-write limitation.

Existing B4.2 worktree/index changes were preserved. No Git mutations or dependency installation were performed.

## Verification

| Executed command | Result |
| --- | --- |
| `node --experimental-strip-types tests/Node/clinicalDomLock.test.ts` | PASS: 14 focused tests. Covers inconsistent/legacy-blocked/inaccessible/activation-disabled transitions, metadata restoration remaining locked, explicit installation restoring access, cached-key rejection and fresh/pending enrollment without invalidation loops. |
| `node --experimental-strip-types --test tests/Node/*.test.ts` | PASS: 23 test files, 0 failing files. Includes T0 durability/priority, atomic encrypted outbox rollback, timeout/retry/canonical synchronization, enrollment/recovery, owner switching/cross-tab fencing and B3 regressions. Node's aggregate invocation reports file-level totals. |
| `./node_modules/.bin/vue-tsc --noEmit` | PASS, exit 0. |
| `npm run build` | PASS, exit 0. Existing large-chunk/deprecation advisories remain. |
| `git diff --check` | PASS. |
| `node tests/Browser/clinicalKeyInvalidation.browser.mjs` | PASS in isolated Chromium. Real fresh/pending enrollment through the UI succeeds; inconsistent metadata removes the clinical DOM and invalidates the key; restoring metadata exposes the unlock form with the key still unavailable; explicit passphrase unlock restores the clinical content. |

The successful browser run used `http://127.0.0.1:42163` and a newly created profile under `/tmp/rapid-mind-b43-key-invalidation-R2eHTW`. Aggregate evidence is retained at `/tmp/rapid-mind-b43-key-invalidation-R2eHTW/result.json`. The first sandboxed attempt could not open its local listener; the permitted isolated run succeeded. The runner closes only its own server/browser and preserves its artifacts. It does not reset an existing profile/database/cache. Authentication transport was mocked with a synthetic owner; this is not live Laravel authentication, deployed HTTP, Service Worker cold-start or Reverb acceptance.

No normal database access, migrations, reset, real-user activation, PHP change, service startup or B4.4/Checkpoint C work occurred. `docs/workflow.md` is unchanged.

## Native IndexedDB observation limitation

The installed Dexie implementation emits mutation notifications from its instrumented transactions (`mutatedParts`) and propagates them to live queries/other clients. A raw native `IDBDatabase.transaction(...).objectStore(...).put(...)` does not supply that instrumentation. Without a companion Dexie mutation or another explicit inspection trigger, `liveQuery` does **not** observe every old-client/native write.

The browser probe wrote invalid owner-mode metadata through `db.backendDB().transaction(...)` after the successful explicit unlock. It verified that the invalid value persisted. During the 250 ms observation window, no `x-storagemutated-1` event arrived, and the cached key and synthetic clinical content remained available. This is recorded as a limitation, not a required insecure behavior or a security pass.

Once an inspection detects an untrusted state, the corrected lifecycle revokes the key and metadata repair cannot reopen it. Access guards independently recheck wrapped-key/mode/continuity metadata, and unlock performs a full initialization inspection. Those checks do not make already-rendered DOM universally reactive to arbitrary native writes. In particular, ordinary encrypted repository access does not rescan all legacy plaintext stores on every operation.

Unsupported same-origin clients/raw IndexedDB writers therefore remain a cutover risk: current-client hooks, schema versions and Dexie notifications cannot prove that every old writer has been stopped. Keep real-user activation closed pending the separately reviewed client/worker cutover. This targeted correction adds no polling, historical migration or browser-wide transaction interception, and makes no universal old-client detection claim.

Result: the reported key-retention/remount lifecycle defect is corrected and verified. Native-write notification coverage remains the explicit limitation above; no production-security completion claim is made. Stop here for owner review.
