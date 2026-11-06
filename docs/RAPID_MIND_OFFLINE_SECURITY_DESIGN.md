# RAPID-MIND — Offline Clinical Data Security

**Current baseline reviewed:** 2026-11-07 (Asia/Jakarta), `demo` at `e85b981`.
**D1 evidence:** source, test-source, specification and checkpoint-report inspection
only. No tests, browser runs, database operations or activation were performed.

## Current scope and authority

P0 privacy and T0 integrity take priority over P1 non-verbal observations and P2
four-state SRQ safety. Current owner instructions and later-approved safety
requirements supersede older workflow assumptions about deferred encryption,
silent SMS or automatic deletion. Authentication is not encryption; TLS is not
application-level E2EE, and Base64 is not encryption.

### Encrypted-first storage and controlled local enrollment

- Patient/snapshot, assessment, emergency, outbox payloads and the optional owner
  profile use authenticated ciphertext in `encryptedStaging` for enrolled owners.
  AES-256-GCM uses fresh random 96-bit IVs and version/owner/store/record-bound AAD.
  PBKDF2-HMAC-SHA-256 (600,000 iterations) wraps the DEK using the offline
  passphrase; a separate recovery code wraps the same DEK. Runtime DEKs are
  non-extractable and access is invalidated on lock/logout/owner change.
- Ordinary development and production-built assets support enrollment only at
  `http://localhost:8080` after server authorization. The server requires local
  environment, that exact configured URL/direct Host, HTTP, matching supplied
  Origin, `OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT=true` (default false), and an active
  matching Relawan with a version-bound web session. Bearer identity alone is
  insufficient. `127.0.0.1:8080` is a different, unauthorized enrollment origin.
- Browser navigation uses a version-bound Laravel session; API routes require a
  bearer JWT checked against user/token version and refresh-family state. Neither
  authenticates an offline DEK. Previously enrolled owners can unlock retained
  ciphertext with passphrase/recovery and valid local continuity without calling
  the enrollment endpoint. New/pending enrollment still requires server approval.
- Initialization distinguishes `FRESH`, `ENROLLMENT_PENDING`, `ENCRYPTED_LOCKED`,
  `LEGACY_BLOCKED`, `INCONSISTENT`, `INACCESSIBLE`, and `ACTIVATION_DISABLED`.
  Missing mode/key metadata never authorizes ordinary plaintext persistence.
  Existing plaintext, including ownerless rows, blocks ordinary initialization;
  unknown records are neither reassigned nor automatically deleted.

### Migration, cutover and retention boundaries

The ordinary workflow creates fresh encrypted records; it does not migrate
historical plaintext in place. Older shadow-staging/activation functions remain
isolated synthetic-fixture mechanisms. Current-client write fences and cross-tab
invalidation do not control every unsupported old same-origin writer. Raw native
IndexedDB writes without Dexie notifications remain an observation limitation.

[B4.4](checkpoints/checkpoint-b44-controlled-development-activation.md) records
owner-executed dummy-profile reset/enrollment and scoped local browser acceptance.
This demonstrates controlled local enrollment for that reviewed development
profile, not general activation/migration of real clinical users, other profiles,
or production. The [cutover procedure](checkpoints/checkpoint-b42-development-reset.md)
requires exact profile/origin inventory and retirement of old clients/workers;
unknown storage requires review. No reset, cleanup or rollout is authorized by D1.

`retentionEligibility.ts` computes eligibility only. Assessment eligibility needs
completion, `SYNCED`, a valid canonical receipt with a positive revision and
matching ciphertext digest, no related pending outbox and no active T0
dependency. Patient and emergency
records remain ineligible under their current checks. No retention check deletes
rows, and synchronization does not imply automatic purge. Fresh encrypted records
have no plaintext shadow; retained historical fixture copies do not prove cleanup
of a real user's historical storage.

### T0, browser privacy and assessment contracts

Explicit human verification/final submission creates T0-Suspect; a first shortcut
tap, STT inference or unconfirmed Q17 interpretation does not. The emergency and
priority-1 idempotent outbox commit atomically before network delivery. Manual T0
remains available with unresolved SRQ, missing GPS or incomplete identity. Local
save, server receipt, Healthcare action, referral and dispatch remain separate.
Browser SMS is a user-mediated composer handoff, not proof of sending/delivery.

Clinical privacy middleware precedes web/API handling, enables clinical Inertia
history encryption and adds private/no-store headers to covered responses. The
app removes consumed bootstrap JSON and masks/unmounts locked clinical content.
The Relawan worker caches approved static assets, not clinical/authentication
payloads; updates wait rather than unconditionally activating over active tabs.
Source behavior is not proof of deployed headers or universal browser privacy.

P1 observations are multiple reasons with an optional OTHER explanation, retained
through drafts/sync and shown to Healthcare without diagnosis or score/T0 effects.
P2 preserves YES/NO/UNCLEAR/UNANSWERED; definitive booleans remain compatible.
Unresolved required answers cannot yield a definitive score. Apparent Q17 YES
requires human confirmation before persistence, separately from final T0 sending.
See [the implementation inventory](CURRENT_IMPLEMENTATION.md) for schema and UI details.

## November Safety acceptance — planning and recorded evidence

October **STT C1/C2** are historical speech checkpoints. November **Safety C1/C2**
refer to browser/privacy/PWA and integration; their results are not interchangeable.

| Checkpoint | Status and evidence boundary |
|---|---|
| B4.4 controlled local enrollment | Recorded local acceptance passed within its reviewed scope; not production activation or general historical migration. |
| November Safety C1 | **IMPLEMENTED — ACCEPTANCE PENDING.** The [C1 report](checkpoints/checkpoint-c1-local-browser-integration.md) records 29 Node files / 0 failures, 82 PHP tests / 302 assertions, typecheck/build/lint, and Chromium **18 PASS / 1 NOT TESTED**. These are previously recorded results, not D1 reruns. |
| November Safety C2 | **PENDING:** live Relawan → outbox/sync → Laravel/PostgreSQL → Healthcare integration, authorization, realtime, replay/failure semantics and privacy. |
| November Safety C3 | **PENDING:** final local P0–P2 regression/signoff including unresolved C1 conditions. Production readiness is not established. |

C1 exercised ordinary production-built assets and the actual generated service
worker with synthetic authentication/server responses. Natural background/foreground
locking remains **NOT TESTED**: the display stayed visible during automated tab
switching/minimization. A synthetic hidden-state handler pass is not native
background acceptance; physical mobile background lock remains unverified.
C1 did not submit a browser emergency or establish live backend authorization,
PostgreSQL, C2 sync, real-release asset migration, or complete offline Whisper.

AES-GCM does not protect an unlocked application from malicious same-origin
JavaScript, an attacker controlling the unlocked device, or browser eviction.
No hardware-backed keys, universal old-client detection, production security
certification, or application-level E2EE is claimed.

## Current source anchors

Repository-relative paths inspected for D1:

- `resources/js/offline/offlineCrypto.ts`, `resources/js/offline/clinicalKeyEnrollment.ts`
- `resources/js/offline/clinicalStorageInitialization.ts`, `resources/js/offline/encryptedClinicalStorage.ts`
- `resources/js/offline/localEnrollmentAuthorization.ts`, `resources/js/offline/offlineActivationEnvironment.ts`
- `app/Support/LocalOfflineEnrollment.php`, `config/offline.php`
- `app/Http/Middleware/AuthenticateJwt.php`, `app/Http/Middleware/ValidateWebSessionVersion.php`
- `resources/js/offline/retentionEligibility.ts`, `resources/js/offline/emergencyWorkflow.ts`
- `app/Http/Middleware/ClinicalBrowserPrivacy.php`, `resources/js/pwa/serviceWorker.ts`

## Historical DEMO-SEC-02C.5 design and fixture record

Everything below preserves the original staging design, limitations and reproduction
notes. Present-tense claims such as "real owner enrollment remains disabled",
"absent mode means legacy plaintext", or "plaintext originals coexist" describe
that historical fixture baseline, not the ordinary November implementation above.
Dependency availability and reproduction notes are historical, not reverified by D1.

### Previous checkpoint annotation (before November C1)

**Checkpoint:** DEMO-SEC-02C.5
**Implementation state:** B4.2 encrypted-first storage and B4.3 isolated Chromium acceptance are complete. B4.4 controlled local development activation and browser acceptance have passed, including the unmodified Laravel/Inertia SRQ response contract and targeted emergency interception verification (61/61 matcher assertions). Production activation remains restricted. Production PWA, full live synchronization, realtime integration, and final security signoff remain pending Checkpoint C.

### Original plaintext boundary

`RapidMindOfflineDB` currently persists plaintext clinical data in `patients`, `patientSnapshots`, `assessments`, `emergencies`, and `outbox.payload`. Patient names and NIK, assessment responses and triage, emergency notes and coordinates, and complete synchronization payloads are sensitive. `owner_user_id` indexes restrict application queries but do not encrypt data. The Service Worker caches the offline shell and assets; it does not intentionally cache clinical API responses. The existing `relawanContinuity` row holds a remembered identity and logout intent, not an unlocking secret.

The current real-user repositories continue to use plaintext because no real owner has been activated. **This checkpoint does not yet provide local clinical confidentiality.** Server role authorization remains a separate boundary from client-side local encryption.

### Encrypted representation

- Web Crypto AES-256-GCM uses one random 256-bit Data Encryption Key (DEK) per Relawan and a fresh random 96-bit IV for every record encryption. Authenticated additional data binds version, owner ID, store type, and immutable record ID. Ciphertext or metadata moved to another owner, type, or ID fails authentication.
- A 600,000-iteration PBKDF2-HMAC-SHA-256 Key Encryption Key (KEK), with a distinct random 128-bit salt, wraps the DEK under the offline passphrase. Enrollment requires a 20–1024 character passphrase with at least four distinct characters. This is separate from the server password.
- An independently generated 256-bit recovery code wraps the same DEK with a separate salt and IV. Show it once at eventual enrollment and instruct the Relawan to store it outside the device. It is not a server credential. A lost passphrase **and** recovery code cannot be recovered by the application.
- Wrapped-key and ciphertext envelopes are versioned. The DEK is imported into a non-extractable runtime `CryptoKey`; raw generation/unlock bytes are cleared after import. A live key is held only in application memory and must be dropped on lock, logout, or owner switch. A remembered owner ID never unlocks it.
- The fixture-only Relawan gate verifies the online `/relawan/session-status` response, including role and owner ID, before enrollment. It requires passphrase confirmation, presents the recovery code once, and accepts passphrase or recovery-code unlock after reopening without server access. The static offline bootstrap waits for this unlock before resolving assessment or emergency props. A remembered owner ID cannot unlock the DEK. This interface is absent from ordinary development and production behavior; real owner enrollment remains disabled.
- `installClinicalKey` independently reads the persisted wrapped key and verifies its authenticated key proof before registering a runtime DEK. Binding metadata also verifies the proof. Metadata changes after installation fail closed on repository access. Logout and owner switching clear runtime access.
- A reactive key generation changes on installation, explicit lock, lock-all, session replacement, and BroadcastChannel invalidation. The Relawan layout synchronously masks its mounted clinical root on a generation change, rechecks owner storage mode, then Vue unmounts that view and shows the encrypted-owner unlock gate. It clears in-memory T0 context and rejects late UI read results from an older generation. The mode recheck also blocks a tab that was rendering a legacy view when another tab activates that synthetic owner. The static offline bootstrap checks the generation and mode again after route resolution and continuity checks; a result obtained before locking cannot mount later. Legacy owners continue through the existing route without a blocking encrypted-owner gate.
- IndexedDB indexes contain only store, owner, stable record ID, and migration metadata. Identity, demographics, assessment, emergency, and outbox payload fields belong inside authenticated ciphertext. `encryptedStaging` is a shadow before activation and the active encrypted record store only for a synthetic owner activated in the isolated fixture.

### Migration and activation gate

Dexie version 5 adds `offlineKeys` and `encryptedStaging` without modifying earlier stores. `prepareOwnerKey` refuses to overwrite an existing owner key. A stored key proof binds a staging session to that owner's wrapped DEK. The session also binds the exact persisted wrapped-key metadata; a change in another tab requires a new unlock. `stageOwnerPlaintext` reads only records already attributed to the unlocked owner, encrypts and verifies a copy outside an IndexedDB transaction, then atomically compares both the source row and persisted key before storing the encrypted copy. A changed source is skipped for a later pass. Bounded staging scans 64-row pages, skips verified copies, and stages up to the requested batch size. Repeated calls, including after reopening, advance through missing copies and restage changed or damaged copies. Each pass starts at the beginning so newly inserted or changed records remain eligible. Plaintext source rows, UUIDs, outbox IDs, priorities, revisions, retries, and relationships remain intact. `inspectStagedOwner` reports missing, stale, orphaned, owner-mismatched, unsupported-version, unreadable, and concurrently changed records without deleting data. Its count and consistency result is a snapshot diagnostic, **not** an activation authorization: a source may change immediately after inspection.

Legacy ownerless rows remain untouched and excluded from owner-scoped operations. They are logically quarantined; they must never be automatically assigned to the currently signed-in Relawan. Browser stores of unknown provenance must not be automatically deleted.

Dexie version 6 adds an owner mode table and a numeric outbox-ID index. An absent mode row means legacy plaintext; an explicit `ENCRYPTED` row makes patient, snapshot, assessment, emergency, and outbox repositories read and write ciphertext in `encryptedStaging`. The outbox index maps its numeric ID contract to a stable random UUID used as the AES-GCM record identity for new items. Dexie version 7 adds a durable global outbox-ID counter and minimal canonical sync receipts. Legacy and encrypted outbox creation serialize against both ID tables and the counter in one transaction, preventing active cross-owner collisions and later reuse by this build after reconciliation. Existing staged outbox items retain their numeric IDs and revisions. New encrypted records keep clinical fields and payloads inside ciphertext; the outbox index exposes only ID, owner, and encrypted-record reference.

`activateSyntheticOwner` is available only when Vite runs in `staging-fixture` mode. It verifies all source rows against authenticated ciphertext, then repeats source, ciphertext, and wrapped-key comparisons inside the transaction that inserts the mode row and old outbox-ID mappings. Legacy repository write transactions read the same mode table before writing; a concurrent legacy writer either commits first and invalidates the activation snapshot or observes the new mode and fails. Encrypted writes also compare the current ciphertext and persisted wrapped key inside their write transaction. Web Crypto completes before those transactions. The encrypted emergency and priority outbox item commit together, including numeric ID allocation.

After activation, shadow staging and its inspection API reject the owner so a stale plaintext source cannot overwrite newer active ciphertext.

The synthetic transition retains all original plaintext rows; it does not provide confidentiality for the fixture's migrated history. Normal development and production builds reject activation, and the fixture enrollment interface has no activation button. Current bundles use a mode fence for repository writes; a `BroadcastChannel` notification locks runtime keys in other current tabs after synthetic activation. An older already-open application bundle that lacks these safeguards could still write plaintext. A real rollout must first establish a client-version cutover that excludes older tabs and Service Workers, verify no old writer remains, and then re-inspect and activate each owner under a reviewed migration procedure. A broadcast is advisory and cannot control unsupported old clients. No real owner is migrated or activated automatically. A successful TypeScript build or isolated synthetic test alone is insufficient approval for real-browser activation.

### Sync and retention

Encrypted outbox listing requires the matching unlocked owner key, decrypts payloads before the existing priority sort, and uses the existing server request path. A locked key fails closed. Server authentication remains necessary to transmit; the isolated test uses synthetic responses and does not establish live server authentication or transmission. A canonical response with matching entity identity and the same outbox revision reconciles encrypted clinical rows, removes the encrypted outbox item, and records a minimal receipt atomically. An older revision or repeated acknowledgement does not complete a newer or absent item. A synthetic SyncManager test covers failure, retry, payload identity, priority, and revision handling. Unlock refreshes local status and resumes eligible online synchronization. The encrypted patient snapshot update and superseded-copy deletion also share one compare-and-swap transaction.

Retention eligibility is a read-only decision. A completed encrypted assessment requires `SYNCED`, a matching canonical receipt and ciphertext digest, no related outbox item, and no active T0 dependency. Any subsequent record rewrite invalidates that receipt match. Incomplete assessments and active T0 cases remain available offline. Patient and emergency rows remain ineligible because a standalone patient receipt or a verified end to offline emergency need is not yet established. Legacy rows without a digest remain ineligible. No eligibility check deletes rows. Cleanup of existing real browser records is irreversible and requires separate explicit owner approval. In the meantime encrypted shadow copies and plaintext originals coexist, so local confidentiality cannot be claimed.

### Workflow interpretations and limits

This document interprets the `docs/workflow.md` goal of local AES-256 encryption and post-upload cleanup without changing that file:

1. Synchronized clinical data may be minimized only after verified server acceptance and reconciliation, with no remaining local operational dependency.
2. Background synchronization may wait for an offline unlock when the DEK is unavailable.
3. Long-term recovery must use persisted wrapped keys, not an in-memory-only key. The isolated Chrome profile cold-reopen test exercises the cached Service Worker shell with the network offline; it does not establish physical phone-restart behavior.

AES-GCM does not protect data from malicious same-origin JavaScript while unlocked, an attacker controlling an unlocked device, or browser storage eviction. Passphrase quality and recovery-code custody matter. No hardware-backed key protection is claimed. Until activation and separately approved plaintext cleanup, the existing local data remains readable in browser storage.

### Reproducing the isolated browser staging test

`node tests/Browser/offlineStaging.browser.mjs` and `node tests/Browser/offlineEncryptedRepositories.browser.mjs` require local Node, Vite from the existing project installation, a resolvable `playwright` package, and Chrome. Run the DOM and cold-offline regression directly with `node tests/Browser/offlineClinicalDomLock.browser.mjs`; no separate staging build is needed. It creates a unique temporary Vite configuration, fixture PWA build, and Chrome profile outside the repository, redirects Laravel's hot file and PWA manifest lookup there, and removes only that temporary directory afterward. It never writes `public/build` or `public/hot`. Set `RAPID_MIND_CHROME_BIN` to a different Chrome path if needed. The DOM harness switches its ephemeral localhost server from Vite to static temporary fixture assets before Service Worker registration, closes Chrome, reopens the same isolated profile with networking disabled, and unlocks through the cached offline shell. These checks use synthetic Dexie fixtures and never open the owner's profile. On this checkout, `playwright@1.63.0` is present in `node_modules` as an **extraneous** package: it is absent from `package.json` and `package-lock.json`, so the browser tests are not reproducible from a clean dependency installation yet. No package or lockfile was changed in this checkpoint.
