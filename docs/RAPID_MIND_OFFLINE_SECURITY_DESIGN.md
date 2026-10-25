# RAPID-MIND — Offline Clinical Data Security

**Checkpoint:** DEMO-SEC-02C.4
**Implementation state:** Cryptographic foundation and additive shadow staging only. Encrypted clinical storage activation and plaintext cleanup are disabled pending migration verification and owner review.

## Current boundary

`RapidMindOfflineDB` currently persists plaintext clinical data in `patients`, `patientSnapshots`, `assessments`, `emergencies`, and `outbox.payload`. Patient names and NIK, assessment responses and triage, emergency notes and coordinates, and complete synchronization payloads are sensitive. `owner_user_id` indexes restrict application queries but do not encrypt data. The Service Worker caches the offline shell and assets; it does not intentionally cache clinical API responses. The existing `relawanContinuity` row holds a remembered identity and logout intent, not an unlocking secret.

The current active repositories continue to use plaintext. **This checkpoint does not yet provide local clinical confidentiality.** Server role authorization remains a separate boundary from client-side local encryption.

## Encrypted representation

- Web Crypto AES-256-GCM uses one random 256-bit Data Encryption Key (DEK) per Relawan and a fresh random 96-bit IV for every record encryption. Authenticated additional data binds version, owner ID, store type, and immutable record ID. Ciphertext or metadata moved to another owner, type, or ID fails authentication.
- A 600,000-iteration PBKDF2-HMAC-SHA-256 Key Encryption Key (KEK), with a distinct random 128-bit salt, wraps the DEK under the offline passphrase. Enrollment requires a 20–1024 character passphrase with at least four distinct characters. This is separate from the server password.
- An independently generated 256-bit recovery code wraps the same DEK with a separate salt and IV. Show it once at eventual enrollment and instruct the Relawan to store it outside the device. It is not a server credential. A lost passphrase **and** recovery code cannot be recovered by the application.
- Wrapped-key and ciphertext envelopes are versioned. The DEK is imported into a non-extractable runtime `CryptoKey`; raw generation/unlock bytes are cleared after import. A live key is held only in application memory and must be dropped on lock, logout, or owner switch. A remembered owner ID never unlocks it.
- An eventual offline reopening flow must request the passphrase or recovery code before clinical repositories load. That unlock can work without server access because the wrapped DEK is persisted in IndexedDB. Online first enrollment must be gated by a verified Relawan session; no enrollment UI is active yet.
- IndexedDB indexes contain only store, owner, stable record ID, and migration metadata. Identity, demographics, assessment, emergency, and outbox payload fields belong inside authenticated ciphertext. The current additive `encryptedStaging` store is an encrypted shadow, not an active replacement.

## Migration and activation gate

Dexie version 5 adds `offlineKeys` and `encryptedStaging` without modifying earlier stores. `prepareOwnerKey` refuses to overwrite an existing owner key. A stored key proof binds a staging session to that owner's wrapped DEK. The session also binds the exact persisted wrapped-key metadata; a change in another tab requires a new unlock. `stageOwnerPlaintext` reads only records already attributed to the unlocked owner, encrypts and verifies a copy outside an IndexedDB transaction, then atomically compares both the source row and persisted key before storing the encrypted copy. A changed source is skipped for a later pass. Bounded staging scans 64-row pages, skips verified copies, and stages up to the requested batch size. Repeated calls, including after reopening, advance through missing copies and restage changed or damaged copies. Each pass starts at the beginning so newly inserted or changed records remain eligible. Plaintext source rows, UUIDs, outbox IDs, priorities, revisions, retries, and relationships remain intact. `inspectStagedOwner` reports missing, stale, orphaned, owner-mismatched, unsupported-version, unreadable, and concurrently changed records without deleting data. Its count and consistency result is a snapshot diagnostic, **not** an activation authorization: a source may change immediately after inspection.

Legacy ownerless rows remain untouched and excluded from owner-scoped operations. They are logically quarantined; they must never be automatically assigned to the currently signed-in Relawan. Browser stores of unknown provenance must not be automatically deleted.

The **activation gate is disabled**. Current repositories still write plaintext in the patient, snapshot, assessment, emergency, and outbox tables, including direct writes during sync reconciliation. An inspection result cannot fence those writers. Before an active per-owner transition, every writer and reader must use one coherent storage mode, and the transition must compare a verified source/ciphertext/key snapshot and change mode in the same transaction that fences later legacy writes. In particular, the emergency and priority outbox write must remain one transaction after encryption is prepared outside it. Until that is implemented and tested, no state is marked active and there is no automatic migration of an owner's browser data. Activation needs an explicit owner review of real-browser migration evidence and a safe recovery path; a successful TypeScript build alone is insufficient.

## Sync and retention

When active encrypted storage is introduced, sync must decrypt only for the matching unlocked owner, keep T0 before assessments, preserve outbox revisions and stable UUIDs, and wait while locked. Server authentication remains necessary to transmit. An HTTP success alone is insufficient for deletion: require a valid canonical acknowledgement, matching entity identity, successful local reconciliation, no outstanding or uncertain outbox revision, and no remaining operational need. Pending, failed, and uncertain work stays available. The existing active path already removes a completed outbox entry only after canonical reconciliation; this checkpoint adds no clinical-row cleanup.

Automatic minimization of synchronized clinical records is deferred until those conditions are implemented and verified using isolated synthetic fixtures. Cleanup of existing real browser records is irreversible and requires separate explicit owner approval. In the meantime encrypted shadow copies and plaintext originals coexist, so local confidentiality cannot be claimed.

## Workflow interpretations and limits

This document interprets the `docs/workflow.md` goal of local AES-256 encryption and post-upload cleanup without changing that file:

1. Synchronized clinical data may be minimized only after verified server acceptance and reconciliation, with no remaining local operational dependency.
2. Background synchronization may wait for an offline unlock when the DEK is unavailable.
3. Dedicated phone-restart verification is deferred to DEMO-SEC-02C.5; long-term recovery must use persisted wrapped keys, not an in-memory-only key. The isolated browser close/reopen test in DEMO-SEC-02C.4 does not establish phone-restart behavior.

AES-GCM does not protect data from malicious same-origin JavaScript while unlocked, an attacker controlling an unlocked device, or browser storage eviction. Passphrase quality and recovery-code custody matter. No hardware-backed key protection is claimed. Until activation and separately approved plaintext cleanup, the existing local data remains readable in browser storage.

## Reproducing the isolated browser staging test

`node tests/Browser/offlineStaging.browser.mjs` requires local Node, Vite from the existing project installation, a resolvable `playwright` package, and Chrome. Set `RAPID_MIND_CHROME_BIN` to a different Chrome path if needed. The harness starts Vite on an ephemeral localhost port and creates a new profile under the operating system temporary directory. It uses only synthetic Dexie fixtures and never opens the owner's profile. On this checkout, `playwright@1.63.0` is present in `node_modules` as an **extraneous** package: it is absent from `package.json` and `package-lock.json`, so the browser test is not reproducible from a clean dependency installation yet. No package or lockfile was changed in this checkpoint.
