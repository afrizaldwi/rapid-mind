# Healthcare T0 and realtime: scoped acceptance

Date: 13 November 2026 (Asia/Jakarta).
Owner scope: synthetic-profile/data Healthcare T0 acceptance and realtime through established Reverb/Echo; fix findings, verify, stop. No database/storage reset, manual purge, old-key migration or dependency changes.

## Outcome

**10 browser acceptance scenarios PASS; 24 focused Node tests PASS.** Actual Laravel/PostgreSQL transitions and actual Reverb WebSocket frames were measured using the published localhost frontend. No application defect was found in this scope, so product code, published assets and infrastructure configuration were not changed. Harness selectors/response parsing were corrected to match the observed UI and real server document responses.

This is acceptance of the scenarios below, not a claim of full C2/C3, production security, real patient care or physical response readiness.

## Environment and isolation

- Existing Docker app/nginx/postgres/queue/reverb/scheduler services were running; no restart or image operation.
- Read-only preflight confirmed local environment, PostgreSQL `rapid_mind`, exact `http://localhost:8080`, enrollment opt-in, DevTools false, real broadcast driver `reverb`, internal Reverb HTTP target `reverb:8080`, and case/facility schema availability.
- Fresh Chrome/157.0.8103.52 profiles, native CDP, real rendered Vue, real login/CSRF, ordinary published assets. No browser/package installation.
- New test-specific region/Posko and facilities A/B; new Relawan assigned to A's Posko, Healthcare A to A, Healthcare B to B. Fixture provisioning is direct scoped Docker/Eloquent creation, not an Admin provisioning acceptance test. Existing organizations/users were not reassigned.
- The isolated browser proxy forwards permitted HTTP and WebSocket traffic to actual Nginx/Reverb. No candidate overlay, fake authentication, fabricated event or substitute broker. The optional Healthcare mode allows only relevant routes and localhost WebSocket tunnels; other origins stay blocked. No system proxy change.
- Credentials/passphrase are random per run and held in runner memory. Evidence excludes cookies, authentication signatures, passwords and recovery codes. New profiles/data remain retained, with all test browser processes closed.

## Final acceptance scenarios

| Scenario | Measured result |
| --- | --- |
| Synthetic fixture isolation and real Reverb configuration | PASS |
| Healthcare A/B actual private Echo subscriptions | Both received real `pusher_internal:subscription_succeeded` on their own facility/user/version channel |
| Channel authorization boundaries | B's request for A's channel and the old role-wide channel both returned HTTP 403 |
| Relawan explicit T0 server receipt | First tap created no event; final send created PENDING T0 routed to facility A, without Healthcare action |
| ID-only EmergencyCreated and automatic queue freshness | A received the real frame and reconciled its queue without manual page reload; payload was exactly `emergency.id`; B received no event, and foreign GET/acknowledge returned 404 |
| Explicit Healthcare acknowledgement | A's UI action persisted ACKNOWLEDGED and audit, with EmergencyUpdated; no verification/clinical confirmation yet |
| Separate secondary verification | UI action persisted REVIEWING and a separate FIELD_TEAM verification record with a simulation note |
| Explicit clinical confirmation and scoped updates | UI action persisted CONFIRMED, separate clinical decision and audit; all updates ID-only, none to B; no referral/dispatch auto-created |
| Exact replay and stale-state safety | Exact classification replay returned 200 without another audit/verification/event; stale acknowledge returned 409 and preserved CONFIRMED |
| Relawan report-only privacy | Real Relawan detail projection after confirmation still omitted Healthcare status, verifications, clinical result, referral and dispatch |

The initial technical receipt is explicitly checked while the database remains PENDING. Queue visibility and WebSocket delivery do not count as human acknowledgement. The later synthetic clinical transitions require explicit Healthcare UI actions.

## Final run evidence

Directory: `C:\Users\daffa\AppData\Local\Temp\rapid-mind-healthcare-t0-msWixH`.
Files: `results.json`, `01-healthcare-pending.png`, `02-healthcare-confirmed.png`.
Retained profiles: `healthcareA`, `healthcareB`, `relawan`.

Final fixture:
- Relawan user **21**, Healthcare A **22**, Healthcare B **23**.
- Facilities **8/9**, region **4**, Posko **7**, primary mapping Posko 7 → facility 8.
- Emergency **5d237626-07ef-44bb-8404-1f0d51fdf19b**, routed to facility 8; intentionally unidentified synthetic survivor, no real patient identity, no assessment or patient record created.
- Observed state chain: PENDING → ACKNOWLEDGED → REVIEWING → CONFIRMED.
- Verification records: actor 22 FIELD_TEAM secondary verification; actor 22 T0_CONFIRMED decision. Notes explicitly state simulation and no real examination.
- Audit order: EMERGENCY_CREATED (21), EMERGENCY_ACKNOWLEDGED (22), EMERGENCY_VERIFIED (22), EMERGENCY_CLASSIFIED (22).
- Referrals **0**, dispatches **0**. No phone/SMS/WhatsApp/composer, vehicle assignment or external contact action.

Actual WebSocket receipts:
- A channel `private-healthcare.facility.8.user.22.version.1`: **1 EmergencyCreated, 3 EmergencyUpdated**.
- B channel `private-healthcare.facility.9.user.23.version.1`: **0 matching EmergencyCreated, 0 matching EmergencyUpdated** throughout the workflow and replay observation.
- Every matching event payload was exactly `{emergency:{id}}`, with no identity, clinical notes or coordinates.
- Published asset digest unchanged; no unexpected browser application exception.

Earlier diagnostic runs stopped on outdated harness button wording (Ringkasan versus Ringkasan Kasus; decision button versus Simpan Keputusan Klinis). Their partial observations are not counted as complete acceptance. Native CDP helpers were also updated to parse actual Inertia bootstrap JSON from normal HTML responses for the final projection assertion; no backend response was replaced or mocked.

All attempts were preserved as requested: **9 synthetic users (15–23), 6 facilities (4–9), 3 regions (2–4), 3 Posko (5–7), and 3 emergencies**. Diagnostic cases remain PENDING and REVIEWING; the final case is CONFIRMED. Existing earlier P0 fixtures/profiles were not cleaned up. Normal successful synchronization consumes acknowledged outbox work through existing application behavior, not manual deletion.

## Files changed

Only test infrastructure and this report:
- `tests/Browser/healthcareT0Realtime.browser.mjs` (new): complete acceptance harness with persisted-state and frame assertions.
- `tests/Browser/helpers/nativeChromeSession.mjs` (new): isolated native Chrome/CDP sessions, actual frame observation and safe server document parsing.
- `tests/Browser/helpers/liveLaravelProxy.mjs`: opt-in Healthcare HTTP routes and actual localhost WebSocket forwarding; prior defaults remain restricted.
- `docs/checkpoints/healthcare-t0-realtime-acceptance-2026-11-13.md` (this report).

No application source, dependency or lockfile changes. No publication/build was needed because only harness files changed.

## Verification and limits

- Browser harness: **10 PASS** against actual published Nginx/Laravel/PostgreSQL/Reverb/Echo.
- Node regressions: **24 PASS** across healthcareEmergencyActions, healthcareEmergencyActionsTab, healthcareEmergencyQueue, healthcareWorklistFreshness and healthcareDraftReconciliation.
- `node --check` on all three harness/helper files and `git diff --check`: PASS.
- No PHP suite rerun: product PHP did not change, runtime assertions used real scoped routes/records, and existing broader feature suites use schema-reset traits prohibited by this task. Historical PHP results remain historical.
- No audible alarm acceptance, reconnect/outage matrix, logout/facility-revocation race, native/mobile background lock, full P1/P2, referral/dispatch lifecycle or general production/cross-role security certification. The negative audience checks cover the stated A/B facilities, not every possible sharing/revocation configuration.

Stop for owner review. No further phase or cleanup is started automatically.
