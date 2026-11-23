# Operation-specific clinical unlock, 13 November 2026

## Decision and root cause

Owner correction explicitly supersedes global blocking unlock UX. Previous redesign changed gate presentation but retained layout-level DEK gating; candidate assets were isolated and therefore were not visible on localhost until publication. No CSS bypass is used here.

RelawanLayout previously made clinicalViewAvailable the condition for mounting the entire shell, including Home/navigation. OfflineRelawanShell likewise rendered the gate immediately for LOCKED. These mixed application navigation with permission to decrypt clinical repositories.

Online Home local reads already use useOwnedLocalRecords: it clears values and refuses repository subscriptions while clinicalKeyReady is false. Server-authorized props do not require the local DEK. PFA is general guidance. Assessment entry reads/hydrates local drafts and persists creation; these operations require DEK, but simply opening its form does not.

## Architecture and access matrix

| Context | Behavior while DEK locked |
| --- | --- |
| Online login / Home | Render authenticated shell, authorized server props and navigation; no key prompt or auto-enrollment |
| Online PFA | General guidance/navigation available |
| Online new assessment form | Form and authorized server options available. Do not load/hydrate local drafts. Start/save explicitly requests unlock before encrypted creation; user must submit again after unlocking |
| Existing local assessment / Data workspace | Gate inside the application workspace; navigation remains present. These features use local repositories/drafts |
| Online persisted emergency with authorized emergency prop | Read server report without DEK; localEmergencyId-only shell still requires local unlock |
| Manual T0 action while locked | Requests unlock before existing encrypted emergency/outbox workflow; no T0 silently sent and no new unencrypted server-only pathway |
| Offline and locked | Limited shell with Beranda, explicit local-data action, local sign-out and independent assistance; no decrypted page/owner profile installed |
| Offline and unlocked | Existing authorized resolver and encrypted repositories continue unchanged |

The entry form passes a clinicalAccessRequested flag to its layout when creation needs encrypted storage. Opening dashboard never invokes that flag. Generation checks reject stale draft-loading results, and key invalidation clears entry draft/patient copies and form values. Home's existing guarded subscription continues clearing its local records. Repo crypto/fences, server auth/version checks, local continuity, encrypted atomic emergency + priority outbox and server idempotency are unchanged.

Clinical data access still fails closed for FRESH/pending/legacy/inconsistent/inaccessible storage. The safe shell can remain available independently. No raw DEK, passphrase or session secret is persisted. Recovery remains secondary. Missing verified contacts remains explicit; no fake telephone details are added.

## Files in this correction

- resources/js/layouts/RelawanLayout.vue: independent shell; workspace gate; operation request prop; server emergency projection exception; conditional readiness and clinical-ready events; action bar flex preserved.
- resources/js/relawan/OfflineRelawanShell.vue: limited locked shell, user-requested gate and local logout using existing continuity lock; no resolver change that permits decrypted reads while locked.
- resources/js/Pages/Relawan/Assessment/Index.vue: gate on creation, refuse local hydration without key, reject stale generation results, clear clinical values on invalidation.
- tests/Browser/p0LaravelIntegration.browser.mjs: real login/dashboard/PFA, assistance and draft-save boundary; actual published-byte verification; new screenshot.
- tests/Browser/p0ExplicitUnlock.browser.mjs: adapt explicit operation requests and asynchronous limited-shell mounting; retain privacy/storage/recovery scenarios.
- tests/Node/offlineNavigation.test.ts: invalidation now proves limited shell rather than automatic gate; decrypted-page rejection remains tested.
- tests/Node/helpers/offlineNavigationFixture.ts: expose real existing continuity logout function to mounted shell.
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md, docs/CURRENT_IMPLEMENTATION.md and this checkpoint report: later-approved architecture and fresh evidence.

Previous uncommitted unlock-copy/assistance component changes are included in the published build. Existing design-system.html/public/design-system.html changes were not edited by this task. No PHP/schema/dependencies/lockfiles changed; no Git mutations.

## Verification

47 focused Node tests PASS across offlineNavigation, offlineAssessmentRegression, offlineGatePreservation, lockedEmergencyAssistance, offlineRecoveryConfirmation, emergencyDelivery, relawanAssessmentUi. Includes same-document one-unlock navigation, hidden/pagehide/storage/protocol invalidation, logout and owner switch, stale results, real encrypted repository/sync-manager logic with memory transports, T0 context and delivery wording. Mounted limited shell is asserted not to render the old unlock gate automatically.

vue-tsc --noEmit and isolated production Vite/PWA build PASS. Final candidate /tmp/rapid-mind-c1-pwa-8EmYUe/build.

Isolated native Chrome/IndexedDB/worker browser test: 11 PASS at C:/Users/daffa/AppData/Local/Temp/rapid-mind-p0-browser-gA6NhZ/results.json (preceding candidate with the same core shell separation; later small UI/entry changes are additionally covered by final live run). This uses closed synthetic HTTP, not Laravel evidence.

Final published browser–Laravel/PostgreSQL run: 15 PASS at C:/Users/daffa/AppData/Local/Temp/rapid-mind-p0-live-nO1j4W/results.json. Actual Nginx assets (no overlay), real CSRF login, dashboard locked with no password prompt, assistance and PFA/back navigation, entry form without DEK and unlock only at save, explicit enrollment/recovery confirmation, encrypted assessment+linked T0+priority outbox offline, wrong-secret preservation, reload, reconnect, actual Laravel sync/DB canonical receipts, foreign-case boundary and anonymous enrollment denial. No uncaught browser exceptions. Screenshot 00-dashboard-locked.png captures dashboard without key prompt. Previous published run pwq2u6 (15 PASS) screenshot inspected; final screenshot retained. Not a Healthcare action/realtime reacceptance run.

No PHP tests rerun because PHP unchanged; browser requests exercised real Laravel. Native mobile background lock, field/manual acceptance and all device/BFCache races remain NOT TESTED. No claim that simulation is native background acceptance. No verified contacts or telephone delivery proof.

Earlier failed diagnostic runs are preserved, including runner assumptions about global gates and fixture import errors; not counted as acceptance. The product enrollment race exposed by opening an operation before storage inspection completed was fixed by waiting only within the operation gate. None of these failures triggered deletion or reset.

## Publication and active build

URL http://localhost:8080/relawan/home (login at /login).
Source baseline HEAD eaf4ab9bdd4ddc8aaced7a1849b839eb41b8558c plus uncommitted checkpoint changes; this is not a new committed release.
Active manifest SHA-256 f2ee7d9b6d0eaf4523a8016d10c2f14cd602db6d1197cd663e98e48681d7c9f4.
Active app assets/app-C76lqTlK.js.
Final backup /home/daffa77/rapid-mind/storage/app/private/relawan-operation-gate-final-izvwdtel/previous-build.
Earlier backup /home/daffa77/rapid-mind/storage/app/private/relawan-operation-gate-0mdq_kct/previous-build preserves the pre-task published build.
68 candidate files published additively; old chunks retained. Chunks precede manifest/worker, files chmod0644, atomic file replacements; no public/hot. Publication inventory in each private backup folder, no credentials. Final published test compares actual Nginx manifest, worker and app bytes to disk before testing flow. No existing user profile was cleared or forced to activate a worker.

Retained live fixtures: unique newly appended synthetic accounts36–45. Failed early runs36–39 did not complete the workflow; successful synthetic cases under40–45 retained. Final owner45, assessment204d431b-613b-447c-818e-d03434c490e0, emergency2d88b6ec-eaa4-478a-8757-0871862242e6. No Posko/facility, so delivery is server acceptance with unresolved Healthcare routing, not Healthcare handling. All browser profiles/evidence retained; no clinical ciphertext or database/storage reset/deletion/migration.

## Review steps and limits

1. Open http://localhost:8080/login and sign in to an authorized Relawan account. Home and PFA should appear without a DEK prompt.
2. Open Bantuan Darurat while locked; no contact is fabricated and no T0 is sent.
3. Open new assessment while locked. Enter synthetic data; press Mulai Asesmen. Unlock/enroll is requested before encrypted persistence; complete unlock and submit explicitly again.
4. Offline after installation, reload: limited shell remains available; local clinical pages require the explicit local-data action and valid unlock.
5. Do not reset legacy/inconsistent storage to get past an error. Existing registered keys require their actual passphrase/recovery.

Existing tabs may still control old workers until their normal lifecycle allows update. Native/background verification and any production/real-user key cutover remain separate. No change makes online-only T0 bypass the encrypted outbox. Local status while locked is unavailable, never a fabricated synchronized count. Stop for owner review.
