# B4.2 encrypted-first implementation

**Later status (B4.4):** B4.3 isolated acceptance and lifecycle hardening are complete. [B4.4](checkpoint-b44-controlled-development-activation.md) adds server-authorized localhost enrollment to ordinary assets, disabled by default. The B4.2 decisions and execution evidence below remain historical; No browser reset was performed during B4.2 or B4.3. During B4.4, the project owner manually reset the dummy browser IndexedDB and successfully completed local encryption enrollment. Production activation has not occurred.

Decision: **GO for B4.3**, limited to separately authorized isolated Chromium acceptance. B4 is not complete. Ordinary development/production enrollment remains disabled. No browser acceptance, reset, database access, dependency installation, staging, commit or push was performed.

## Architecture and activation

AES-256-GCM, random 96-bit IVs, owner/store/record/version AAD, PBKDF2 600,000 iterations, separate recovery wrapping and authenticated key proofs remain the cryptographic contract. Runtime DEKs remain non-extractable; raw wrapping/unwrapping buffers are cleared. No clinical DEK, passphrase or recovery code is stored in localStorage/sessionStorage/IndexedDB as plaintext.

The existing `encryptedStaging` table now serves new encrypted records directly; enrollment creates no plaintext source or shadow. Patient/snapshot/assessment/emergency/outbox payloads and optional owner profiles use ciphertext. Existing historical staging functions remain only for the established `staging-fixture` contract; no new historical migration engine was added.

Only a build with mode **`encrypted-acceptance`** can use the new enrollment/unlock workflow. `staging-fixture` retains synthetic legacy regression behavior. Neither mode is a real-user rollout authorization. Ordinary builds reject new plaintext clinical persistence and show an activation/recovery explanation. Consequently, the ordinary Relawan clinical workflow is intentionally blocked pending the reviewed reset/acceptance/cutover, rather than continuing the former plaintext behavior.

The initialization inspector reads all five plaintext stores, including ownerless records. It distinguishes fresh, enrollment pending, encrypted locked, legacy blocked, inconsistent metadata, inaccessible storage and disabled activation. Runtime key readiness distinguishes locked from usable encrypted storage. A wrapped key by itself never establishes enrollment. Unknown state is never converted or deleted.

Enrollment verifies authenticated server state, strict numeric owner ID, role and durable continuity. Wrapped key and pending mode are inserted atomically, after cryptography has completed. The recovery confirmation button durably records confirmation before clinical-key installation. A crash before persistence leaves fresh storage; a crash afterward leaves pending enrollment. The explicit continuation action verifies server identity and the passphrase, then replaces only the recovery wrapper around the same verified DEK. Key proof, creation identity and passphrase wrapper remain unchanged. A crash after final confirmation requires ordinary unlock, not another key.

Passphrase/recovery unlock works offline only for an eligible remembered owner. Corrupt/missing key or mode, wrong identity, wrong secret and stale access tickets reject access. Losing both secrets makes local ciphertext unrecoverable; server login cannot recover the DEK. There is no destructive recovery endpoint.

## Locking and compatibility

An origin-wide random localStorage token, in-memory generations, durable IndexedDB continuity and exact wrapped-key bindings fence access. The token contains no owner or clinical information. Storage events synchronously invalidate keys; repository operations also compare the durable token, so security does not depend solely on notification delivery or BroadcastChannel. Missing access storage prevents enrollment/unlock. Page hide/visibility changes conservatively lock; pageshow, controller updates and protocol notifications invalidate access. This can require repeated unlock after switching tabs.

Enrollment/unlock capture their ticket before asynchronous derivation. Record reads, prepared ciphertext, final write transactions and HTTP response handling reject stale tickets. Continuity and key/mode checks run within encrypted write transactions. The layout synchronously masks its clinical root and then unmounts sensitive children. Aggregate operational state retains counts instead of complete outbox payloads. Bootstrap stores only generic display text, owner, role, verification/schema and logout intent; actual profile/shelter fields are encrypted and loaded after unlock. Profile caching is best effort; missing profile uses generic display context without fabricating a shelter.

Dexie v8, current-client hooks rejecting plaintext creation/update/deletion, mode checks and service-worker update/protocol handling form the write barrier. The historical v1→v2 plaintext rewriting upgrade runs only in synthetic fixture mode. Current code does not convert legacy records. Root-worker retirement now targets only the known RAPID-MIND script, not arbitrary registrations.

**Residual old-client risk:** schema version changes and current-client hooks cannot stop arbitrary old/raw IndexedDB JavaScript that ignores upgrades or opens the current schema. Browser security cannot impose per-bundle database permissions on the same origin. Close old tabs/PWAs, inventory and retire old workers/assets, and use an isolated new profile/origin for acceptance. Production cutover still requires owner review and browser evidence. Never count a broadcast or schema increment as proof that all old writers are gone.

## Clinical and synchronization contracts

No scoring, Red Flag, manual-T0, Q17-confirmation, non-verbal scoring or HTTP sync contract was changed. A manual emergency remains independent of assessment completion. Setup and recovery never dispatch an emergency.

Emergency ciphertext and its priority-1 outbox/index commit atomically. Assessments remain priority 2, preserving four SRQ states, observations, local revisions and canonical reconciliation. Lock before commit rejects/rolls back a stale write; lock after successful durable commit leaves records intact. Browser atomicity still needs B4.3 evidence.

Numeric queue IDs are reserved before Web Crypto and authenticated inside outbox ciphertext. A failed operation may leave an unused ID gap. The high-water counter is never decremented or recycled. Missing, invalid or regressed counters in initialized encrypted queues fail closed. Index aliases, missing ciphertext, authenticated ID mismatches and missing entity references reject access. CAS checks retain revision integrity. Matching canonical acceptance updates ciphertext, removes outbox/index and stores the digest receipt in one transaction. Timeout/retry and duplicate-acknowledgement behavior retain the existing idempotency contract. Persisted unexpected synchronization errors use a fixed Indonesian message instead of arbitrary exception text.

## Browser privacy

`ClinicalBrowserPrivacy` enables Inertia history encryption and private/no-store headers for clinical routes; API responses also receive no-store. The application blocks clinical Inertia initialization without SubtleCrypto because the installed Inertia implementation otherwise has a plaintext history fallback. Clinical invalidation calls `router.clearHistory()` to remove that tab's history encryption keys. This is a separate key mechanism from the clinical DEK; it does not erase JavaScript heaps or browser backups. Already persisted legacy history is handled only by the separately approved browser reset/old-tab closure.

The inspected service worker fetches clinical navigations without caching their responses and only falls back to a static offline shell. API/auth routes are network-only. Registration bypasses the HTTP update cache and requests updates; activation notifies current windows. Older workers, BFCache, history restoration, suspension and storage/privacy-mode behavior remain browser acceptance obligations. No complete heap zeroization or forensic erasure is claimed.

## Files and purpose

| File | Purpose |
| --- | --- |
| `resources/js/offline/clinicalStorageInitialization.ts` | Explicit state inspection and isolated activation boundary. |
| `resources/js/offline/clinicalKeyEnrollment.ts` | Verified enrollment, durable recovery confirmation, interrupted continuation and unlock. |
| `resources/js/offline/clinicalAccessFence.ts` | Durable cross-tab token and lifecycle/access generations. |
| `resources/js/offline/offlineOwnerProfile.ts` | Encrypted owner name/shelter cache. |
| `resources/js/offline/outboxIdentity.ts` | Validate monotonic queue identity allocation. |
| `resources/js/offline/db.ts` | Mode metadata, schema/write hooks and durable ID allocation. |
| `resources/js/offline/offlineCrypto.ts` | Same-DEK replacement recovery wrapper and buffer clearing. |
| `resources/js/offline/offlineKeyWorkflow.ts` | Route production-capable workflows while retaining isolated fixture APIs. |
| `resources/js/offline/encryptedClinicalStorage.ts` | Key installation, owner/metadata checks and stale record-operation rejection. |
| `resources/js/offline/encryptedOutbox.ts` | Authenticated numeric IDs, index integrity and atomic encrypted commits. |
| `resources/js/offline/patientRepository.ts` | Fence atomic encrypted patient/snapshot reconciliation. |
| `resources/js/offline/outboxRepository.ts` | Include receipt evidence in ID allocation transaction scope. |
| `resources/js/offline/emergencyWorkflow.ts` | Fence pre-persistence operations and include ID-allocation evidence scope. |
| `resources/js/offline/relawanContinuity.ts` | Minimize pre-unlock profile persistence; retain logout/identity semantics. |
| `resources/js/offline/syncManager.ts` | Reject stale HTTP attempts/results and sanitize persisted errors. |
| `resources/js/offline/bootstrap.ts` | Require unlock before offline route/profile loading. |
| `resources/js/components/Relawan/OfflineEncryptionGate.vue` | Enrollment/recovery/blocked-state UI and secret clearing. |
| `resources/js/layouts/RelawanLayout.vue` | Gate clinical mounting/status queries and cache profile only after unlock. |
| `resources/js/composables/useRelawanOperationalStatus.ts` | Keep aggregate counts instead of complete decrypted outbox objects. |
| `resources/js/app.ts` | Clear encrypted history on lock; guard unsupported crypto and scope worker retirement. |
| `resources/js/pwa/register.ts` | Fetch worker updates without stale HTTP update cache. |
| `resources/js/pwa/serviceWorker.ts` | Notify windows of protocol activation. |
| `app/Http/Middleware/ClinicalBrowserPrivacy.php` | Clinical history encryption and HTTP no-store policy. |
| `bootstrap/app.php` | Register privacy middleware for web/API pipelines. |
| `tests/Node/clinicalKeyEnrollment.test.ts` | Fresh/interrupted/failing enrollment, unlock, identity, metadata and activation checks. |
| `tests/Node/clinicalStorageSecurity.test.ts` | Encrypted clinical persistence, fencing, rollback, queue integrity and encrypted profile checks. |
| `tests/Node/clinicalDomLock.test.ts` | Mount the real Vue layout and check immediate masking plus child unmount. |
| `tests/Node/helpers/offlineRepositoryFixture.ts` | Extend existing synthetic transport fixture to run actual new modules. |
| `tests/Node/helpers/mountedVueFixture.ts` | Supply DOM attribute/style methods used by the real layout. |
| `docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md` | Mark the previous fixture-only description as historical and link this checkpoint. |
| `docs/checkpoints/checkpoint-b42-development-reset.md` | Exact separately approved dummy-reset proposal. |
| `docs/checkpoints/checkpoint-b42-encrypted-first.md` | This implementation and verification report. |

## Verification

Final commands and results are recorded below after execution. Tests use synthetic records and the existing Node/Vue fixture infrastructure; the IndexedDB transport is a transactional in-memory double. They do not prove native IndexedDB behavior, HTTP middleware execution, Chromium privacy or actual offline/realtime operation.

Dependencies installed/changed: **none**. `docs/workflow.md` and dependency manifests/lockfiles are unchanged. No PostgreSQL connection, migration, seeder, browser profile or data reset was used. PHP syntax checking through Docker could not run because service `app` is stopped; no service was started. Laravel Feature tests and deployed middleware/cache behavior remain unverified.

Next task: owner review, then separately authorized **B4.3 isolated Chromium acceptance**. Use the new encrypted-acceptance lifecycle, not the historical staging fixture as evidence of encrypted-first initialization. Keep actual dummy reset and production rollout as separate approvals.

### Final executed checks

| Command | Result |
| --- | --- |
| `node --experimental-strip-types --test tests/Node/*.test.ts` | PASS: 22 test files, 0 failing files. Includes existing B3.1/B3.2 suites and the three new suites. This Node invocation reports file-level totals. |
| `./node_modules/.bin/vue-tsc --noEmit` | PASS, exit 0. |
| `npm run build` | PASS, exit 0; ordinary production activation remains disabled. Existing large-chunk and `inlineDynamicImports` deprecation advisories remain. |
| `git diff --check` | PASS, exit 0. |
| `git diff --name-only`, `git ls-files --others --exclude-standard`, `git status --short` | Read-only inventory reviewed; 32 changed/new files, all listed above. Initial working tree was clean. |
| `docker compose exec -T app php -l app/Http/Middleware/ClinicalBrowserPrivacy.php` | NOT EXECUTED successfully: sandbox Docker socket denial, followed by permitted syntax-only attempt reporting `service "app" is not running`. No services were started; no database was accessed. |

Early failing checks were corrected before the final passing run: the safe timeout message retains the existing “Penerimaan server belum terkonfirmasi” contract; first-access token baselining no longer invalidates its own key installation; rejecting an unauthorized pre-confirmation clinical write does not cancel pending enrollment; the Node DOM double now supplies the actual layout's attribute/style methods. No scoring or API test expectations were relaxed.

Node coverage includes enrollment persistence failures, pending continuation with the same DEK, passphrase/recovery unlock, wrong owner/secret, missing/corrupt metadata, legacy quarantine without deletion, lock during derivation/encryption/decryption, durable token invalidation without broadcast delivery, continuity/logout/owner switching, encrypted records/profile, priority ordering, emergency/outbox rollback, missing/aliased indexes, monotonic ID corruption, canonical receipts, timeout/retry, cold-start key workflow and mounted Vue clinical masking. Existing Chromium fixture sources were inspected but **not run** or replaced. Native IndexedDB transaction timing, full browser cold-start, BFCache/history restoration, old service-worker cutover, cross-tab scheduling and deployed HTTP privacy behavior require B4.3 evidence.
