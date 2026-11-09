# C2 Google Antigravity browser acceptance handoff

Prepared 7 November; updated 9 November 2026 after provisioning.
Browser status updated 10 November: **P0 CORE BROWSER VERIFIED; local demo CONDITIONAL PASS**.
Natural background/foreground lock NOT TESTED; remaining P1/P2 and full C2/C3 evidence
belongs to the receiving team. Production security acceptance NOT ESTABLISHED.
The scenario plan below remains historical/remaining coverage, not all completed.
Application: existing `http://localhost:8080`, baseline `demo` / `8d3ac3c`
plus the reviewed uncommitted C2 source changes. Do not start C3 or mark C2 ACCEPTED
from this handoff or from Node/PHP/build results.

## Current authorization and provisioned environment — 9 November

The owner confirms all rapid_mind development data is dummy/test data and authorizes
necessary local C2 provisioning/test writes. Earlier historical-case preservation,
organization-provenance and per-scenario dummy-write approval gates are superseded.
Do not repeat those investigations, migrations, backups, builds/publication or
retirement confirmations. No production/infrastructure reset, volume deletion,
private-profile access, dependency installation, SMS/call/WhatsApp/external contact
or real responder dispatch is authorized. C3 remains excluded.

Provisioning is COMPLETE through real CSRF-protected Admin HTTP workflows:
facilities 6/7 active; Posko 6/7 active and primary mappings 6→6 / 7→7.
All four accounts are active with token_version=1 at verification:

| Identity | ID | Login email | Scope |
| --- | ---: | --- | --- |
| C2 Relawan A | 32 | c2-relawan-a@example.invalid | Posko 6 |
| C2 Relawan B | 33 | c2-relawan-b@example.invalid | Posko 7 |
| C2 Healthcare A | 30 | c2-healthcare-a@example.invalid | facility 6 |
| C2 Healthcare B | 31 | c2-healthcare-b@example.invalid | facility 7 |

Owner-accessible credentials are in the **Git-ignored** local file
`storage/app/private/c2-acceptance/credentials.json` (directory 0700, file 0600).
Do not copy credentials/hashes/cookies into committed documents or shared evidence.
Read that file privately for login; it is not a server endpoint and must never be
published. Backend verification is in the same directory's verification.json.

Relawan contact identifiers are C2-TEST-NONROUTABLE-A/B, not telephone destinations.
A narrowly tested backend exception accepts them only on creation of the two exact
C2 names/emails in local/rapid_mind or testing/rapid_mind_testing at the exact
http://localhost:8080 app URL. Production, other identities/contexts and existing
account updates retain strict validation. Do not edit their contact fields or
invoke a contact/composer action. The existing UI accepts tel-field text; no new
frontend build/publication was needed.

Already verified: all four real HTTP logins; each Healthcare's own private-channel
auth 200 and foreign/role-wide auth 403; reciprocal own patient GET 200 / foreign
GET 404; two real Relawan assessment syncs 201, correct routing snapshots and all
four SRQ states in PostgreSQL. Auth used a synthetic socket_id, not a live WS
subscription: actual event reception and browser encryption remain NOT TESTED.
Focused tests: 13 phone/Admin tests (234 assertions), 9 case/realtime tests
(186 assertions). Historical full 405-test/33-Node-file evidence remains historical;
no new full regression or browser PASS is implied by these focused checks.

HTTP-preflight fixtures exist and must not be mistaken for browser-created work:

| Scope | Patient UUID | Unfinished assessment UUID |
| --- | --- | --- |
| A | e2ce2fdb-1c04-4d9f-aab1-6cc3a951f76b | 7551c1b4-92ba-40e8-9cf9-8afc9ad24e5a |
| B | 614d7f39-7000-4d44-b0e7-65eea6024ee5 | 461a15e1-130c-48de-828a-1e791f71afcc |

Use new UUIDs and a C2-BROWSER- prefix for the real-browser first wave so fresh
IndexedDB enrollment, creation and actual WebSocket receipts have distinct evidence.
Local dummy writes necessary for these scenarios are approved; no further routine
handoff is required. Keep stable IDs for retries; do not reset the database for
convenience. Existing provisioning audit gap is accepted for this local demo:
only mapping changes were audited (111/112), not account creation/activation.

Published frontend remains the verified November 9 candidate with unchanged
manifest/worker hashes; do not rebuild. The phone fix changes backend provisioning
source only, so the old complete source-input snapshot is no longer a claim about
this later backend revision. Frozen frontend artifacts themselves still match.

Use a **new disposable browser profile** with normal browser security and the
exact localhost origin. Use distinct profile directories for different owners/
roles, except the deliberate same-profile owner-switch test. Never use the owner's
existing profile, change a system proxy, reuse `scripts/c2/`, purge existing
storage or change the development Docker services. Record the disposable profile
paths without credentials. Do not substitute a mock UI/backend for this run.

## Smallest first browser wave — NOT TESTED

This orders the first evidence; it does not replace the full acceptance matrix.
Ready scopes: active organization pairs 6/6 and 7/7 and the four C2 users above.
Necessary local dummy-data writes are owner-approved. Use four distinct disposable
profiles at exactly http://localhost:8080. Credentials are supplied privately.
Use the dedicated C2 Relawan accounts above. Freeze the source/candidate
hashes and record the actually served JS and active worker before scenarios.

1. **Real connections and encryption enrollment.** Log in the dedicated A/B
   actors. Enroll each Relawan using the supported server-gated flow in its fresh
   profile, privately retain recovery material, and verify encrypted-first storage.
   Healthcare A/B open their respective versioned private channels. Record actual
   successful subscriptions, and denied attempts to subscribe to the other actor's
   channel and the old `emergencies` channel. Public handshake alone is insufficient.
2. **A encrypted offline round trip.** Create one new synthetic patient and one
   assessment for A through the real UI. Preserve YES/NO/UNCLEAR/UNANSWERED and P1
   metadata in an unfinished draft, then go offline, edit, lock/unlock/reload and
   inspect ciphertext/outbox (redact plaintext/keys). Reconnect and observe the real
   sync request, canonical receipt and PostgreSQL values supplied by the approved
   verifier. Healthcare A receives the actual AssessmentUpdated frame containing
   only its ID and reloads canonical authorized data. B receives no A ID. Resolve
   unfinished answers only by explicit user input; demonstrate Q17 confirmation
   cancel before any positive answer persistence. Complete only with approved
   scoring inputs; do not invent answers to force a worklist recommendation.
3. **Reciprocal case authorization.** Create B's one new synthetic patient and
   assessment and sync normally; confirm inverse visibility and event recipients.
   A/B inspect authorized lists/details/counts and hand-enter the other's new
   case/patient URLs. Verify nested histories omit the other scope. Attempt one
   validly shaped forbidden clinical mutation against a new foreign case, with
   correct CSRF/session, so rejection proves authorization rather than malformed
   input. Confirm 403/404 and no changed records/audits. Admin/Relawan roles must
   not gain Healthcare access. Only newly allowlisted IDs are probe targets.
4. **A offline T0 and real delivery.** On A's new patient, queue an assessment
   edit, disconnect, then explicitly verify/final-send one linked T0. Record
   atomic encrypted LocalEmergency + priority-1 outbox before any transport.
   Reconnect: emergency sends first with stable UUID, server acceptance follows
   canonical receipt, Healthcare A receives EmergencyCreated and reconciles the
   queue/count. B receives no A event or case. Delay/drop the first T0 response
   only after a verified real server commit; bounded retry/replay must reconcile
   the same UUID with one emergency and one creation audit. Distinguish technical
   receipt from human acknowledgement; do not acknowledge or progress this case.

Start with two new C2-BROWSER patients, two assessments and one T0 plus normal
sync/audit effects. Additional local dummy rows needed for the approved scenarios
are authorized; record their IDs and actual mutations rather than requesting
repetitive approvals. No reset or unrelated cleanup is needed. Use disposable
offline state and never purge the owner's browser stores. Historical fingerprints
and provenance investigations are superseded and must not be repeated. No real
SMS, external contact, responder dispatch or mocked successful server response.

Evidence for these four scenarios must separately show actual private WS frames,
UI reconciliation, network receipts, encrypted local persistence and PostgreSQL
assertions. A polling refresh cannot substitute for a received event. Remaining
sharing/revocation, stale concurrency, immutable replay, retry error matrix,
owner/session races and clinical state transitions remain required by the full
matrix under the current local dummy-write authorization. First-wave PASS alone does
not establish C2 ACCEPTED. Antigravity executes these browser checks separately under the current owner-authorized local C2 scope.

## Concrete policy and channel expectations

Posko A routes new cases to facility A; Posko B routes to B. An unidentified T0
still routes. Missing/inactive assignment persists UNRESOLVED with no Healthcare
audience and no human-receipt claim. Reassigning the Relawan, editing patient data,
or changing the Posko primary facility does not move existing cases.

Referral sharing is explicit and audited. Destination B can read the referred
emergency and its specifically shared linked assessment, while unrelated patient
records remain hidden. Destination B cannot acknowledge, classify, validate,
refer, complete Referral or progress Dispatch for A's case. The origin retains
authority. Dispatch unit organization alone grants no access. Share revocation is
implemented as a guarded service; no new management UI or transfer workflow was
added. A browser revocation scenario must use the implemented guarded sharing service for the synthetic case; record the invocation and actual effects.

Clinical channels are `healthcare.facility.{facility}.user.{user}.version.{version}`.
The old role-wide `emergencies` channel is denied. The facility-only compatibility
channel has no clinical event publisher. Check actual event reception, not only a
successful authorization request. Healthcare logout retires the old version and
requires other sessions of that account to reauthenticate. Watch channel replacement
after scope changes and verify that retired channels receive no further case IDs.

Automated source/contract results: 405 PHP tests / 4,219 assertions, 33 Node files,
TypeScript and temporary frontend/PWA build passed. These are not browser evidence.

## Evidence record

For every scenario capture timestamp, synthetic actor/role/facility alias, case
UUID alias, initial state, steps, actual result and PASS/FAIL/NOT TESTED. Capture
network endpoint/status/order, canonical receipt, permitted DB assertion supplied
by an approved backend verifier, relevant WebSocket event/subscription receipt,
and screenshots where useful. Redact credentials, cookies, JWTs, CSRF, keys,
full NIK and private clinical details from shared artifacts. Store sensitive raw
browser evidence privately rather than committing it.

Use IMPLEMENTED for source, AUTOMATED TESTED for synthetic automated checks,
DATABASE VERIFIED for actual PostgreSQL assertions, BROWSER VERIFIED only for
observed browser results, and ACCEPTED only after all exit gates are satisfied.
Unexpected state or an unapproved write target means stop that scenario and report.

## Acceptance scenarios

| Scenario | Required observations |
| --- | --- |
| Approved case/facility policy | Authorized Healthcare A sees its case in list/detail/counts and can perform permitted actions. Healthcare B, unassigned/inactive Healthcare, Relawan and Admin cannot access unauthorized IDs or mutate them, including hand-entered URLs and POSTs. Record 403/404 and absence of writes. Repeat for patient history and nested assessments, emergencies, validations, Referral and Dispatch records. Test unassigned cases and referral sharing exactly as approved. |
| Broadcast authorization | Authorized synthetic user subscribes successfully; denied facility/role cannot subscribe or receive case IDs. Inspect every relevant emergency/Referral/Dispatch/assessment channel and audience. Logout/revocation/reassignment must not retain unauthorized clinical payload exposure. No NIK, notes, answers or patient identity in broadcast payloads. |
| Four SRQ states and P1 | Save YES/NO/UNCLEAR/UNANSWERED plus permitted multiple observations/OTHER note; reload, lock/unlock and reconnect. Verify local draft, outgoing JSON, actual PostgreSQL values and authorized Healthcare canonical projection retain distinctions. Unresolved completion produces no definitive score/triage. Observations alone do not alter score or create T0. |
| SRQ-17 confirmation | Manual and transcript-assisted apparent YES open human confirmation before persistence. Cancel preserves previous answer, confirmation persists it, and no T0 transmits without the separate explicit verification/final-send flow. Manual emergency remains available with incomplete assessment or identity/GPS/network absent. |
| Stale unfinished assessment | Two approved disposable contexts load one owned assessment. A updates it; B sends changed content with its old base. Observe 409, preserved local draft/outbox and unchanged newer PostgreSQL evidence. Repeat with missing version and legacy step endpoints. Do not blindly replace the draft or retry a conflict automatically. |
| Lost assessment response | Drop only the response after real server commit, retaining stable UUID and payload. Replay receives canonical receipt with no duplicate rows. Edit/requeue locally during the first in-flight request: newer answers remain local/pending, accepted base advances, and the following snapshot uses that base. No newer edit is marked SYNCED by an older receipt. |
| Server scoring/immutability | Forged client score is ignored; approved clinical calculation is authoritative. Completed exact replay succeeds without new effects; changed answers/mode/metadata/status fail and the stored result remains unchanged. Patient replay retains existing demographic reconciliation semantics. |
| Offline T0 priority | Explicitly confirm/final-send a synthetic T0 while disconnected, with an assessment already queued. Show atomic encrypted LocalEmergency plus priority-1 outbox before transport. Reconnect: T0 POST precedes assessment; stable UUID is retained; only canonical receipt changes delivery to server-accepted. |
| Transient retry without online event | Keep navigator online and page visible; force timeout/network/408/429/503 on approved synthetic sync endpoints. Verify retry delays 2/5/10/20/40/60 seconds after persisted failures and a six-retry budget. No new online/visibility event or button press is needed. No tight loop. After exhaustion, local data/outbox remain; explicit retry is available. |
| Lost T0 response / duplicates | Let server commit, lose its response, then retry. One emergency, creation audit and creation event only; same UUID/canonical receipt. Repeated final-button handling/recovery must not create unintended new incidents. Technical acceptance is not Healthcare acknowledgement. |
| Reload and recovery | Reload after an interrupted SYNCING operation, unlock through the supported encrypted workflow and reconcile the original UUID. Verify receipt/outbox integrity and no silent plaintext fallback. Database reset or local-store purge is not recovery evidence. |
| Lock/logout/owner switch | Lock, logout or switch owner while retry is scheduled and while HTTP is in flight. Old timer must not send with another session, and late receipt must not mark old work synced in the new session. Re-enter the same owner in a new session too. No other owner's plaintext/draft/outbox becomes visible. Unlock/re-authentication resumes only eligible owned work. |
| Session/permanent errors | 401 requires reauthentication; 419 requires session recovery; 403/409/422 remain preserved failures without timed retries. Verify user-facing delivery/conflict state accurately describes lack of confirmation. |
| Healthcare freshness / reconnect | Keep an authorized assessment worklist open while Relawan syncs a completed eligible assessment. Observe approved scoped invalidation, actual WebSocket receipt and canonical reload. Disconnect WebSocket and confirm polling/reconnect reconciles the list/detail without inventing receipt. A dirty validation/clinical draft stays intact with a deferred-update indication. |
| Clinical/Referral/Dispatch separation | With the approved local synthetic writes, verify Healthcare T0 acknowledgement, secondary verification, confirmation or downgrade to T1/T2/T3. Original suspect remains auditable. Referral and Dispatch progress independently; internal assignment does not imply external contact, pickup or completed response. Relawan sees its report/delivery only. |
| Browser privacy | Inspect disposable profile IndexedDB, Cache Storage, service-worker cache, DOM/history restoration, console and network/broadcast payloads. No clinical plaintext, full NIK, keys or private notes leak into caches/logs/events. Verify offline data remains encrypted through failure and lock/recovery; inspect no real owner's storage. |

The Node repository fixtures use an in-memory replacement for IndexedDB transport;
they do not prove browser Dexie transactions, cross-tab execution or WebSocket
receipt. Simulating network failures in this browser run must preserve the actual
Laravel response/commit behavior; do not fabricate canonical success or clinical
transitions. Record which requests reached Laravel and which responses were lost.

## Completion and outstanding evidence

Return the scenario matrix with actual evidence links, unexpected mutations,
all FAIL/NOT TESTED rows, and the exact source/assets/environment tested. Cross-role
authorization, real PostgreSQL round trips, encrypted offline recovery and actual
WebSocket reception must each have their own evidence. Synthetic automation and
a successful build cannot substitute for them.

C1 natural background/foreground lock acceptance remains pending independently;
native mobile background lock is NOT TESTED. C2 acceptance must name any remaining
limits explicitly. No broad acceptance, real-data cutover or C3 authorization is
implied by successful individual scenarios.
