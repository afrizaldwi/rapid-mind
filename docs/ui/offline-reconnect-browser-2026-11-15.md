# Offline reconnect browser acceptance — 15 November 2026

Result: **PASS**, seven scenarios, real Chrome with a 421 × 915 viewport and
separate new browser profiles. This is desktop emulation, not a physical phone.
The test used published assets at `http://localhost:8080`, real Laravel/Nginx,
PostgreSQL persistence, server authentication, and real server responses.

## Verified flow

1. A new synthetic Relawan logged in and received a non-extractable automatic
   device key without entering a passphrase.
2. A new online assessment reached SRQ. CDP disconnected the profile's network
   and `navigator.onLine` was verified false. All 20 SRQ answers, five risk
   indicators, three function answers and final review were completed through
   the rendered UI without an unlock step. The durable outbox contained one item.
3. Restoring network delivered the assessment once, with COMPLETED/ROUTED status
   and the assigned Healthcare facility. The outbox reached zero only after
   server acceptance. The assigned Nakes opened its patient page in another
   authenticated Chrome profile and saw the assessment summary.
4. A second assessment was completed offline. A separate online browser profile
   for the same synthetic Relawan changed server Q1, using the current server
   version. Reconnection returned a real HTTP 409 and retained one outbox item.
5. **Periksa konflik versi** displayed the device/server difference. Opening
   this comparison left the server IN_PROGRESS and Q1 unchanged.
6. Clicking **Saya sudah memeriksa, kirim versi perangkat** explicitly selected
   local Q1. Server acceptance produced one COMPLETED/ROUTED assessment and an
   empty outbox, with no duplicate assessment.
7. The assigned Nakes opened the resolved assessment's patient page and saw the
   latest assessment summary. No browser application exception was recorded.

The previous checkpoint's PHP tests cover facility isolation, completed-server
immutability and a new server change after review; these were not claimed as
browser scenarios here. Realtime subscriptions were not acceptance-tested.

## Candidate and retained evidence

- HEAD: `0b1a189`, plus the uncommitted device-key and conflict-resolution changes.
- Served entry: `assets/app-DPFmgWSj.js`.
- Entry SHA-256: `3124cd79a672f44f8d2fa23cea1adc70d304077a691f768c69e796a60e84da9a`.
- Final report and screenshots:
  `C:/Users/daffa/AppData/Local/Temp/rapid-offline-reconnect-OTkjoe/`.
- Retained synthetic marker: `SINTETIS-RECONNECT-58aad422-e17`.
- Relawan/Nakes user IDs: 54/55; facility 21; Posko 16; region 11.
- Normal assessment: `e24666a9-9617-4b3e-b038-4d26e8f801d8`.
- Conflict assessment: `071a9651-7d7c-4491-9269-a9dfd9bd8c05`.

An earlier successful run is retained at
`C:/Users/daffa/AppData/Local/Temp/rapid-offline-reconnect-hHTifZ/`.
The final run adds explicit persisted-outbox assertions. No profiles or records
were reset/purged. Existing user records were not inspected or changed. Ordinary
application delivery cleanup ran as designed for the new synthetic cases.

## Harness used during validation

- `tests/Browser/offlineAssessmentReconnect.browser.mjs` — reproducible browser
  acceptance runner; only appends isolated synthetic fixtures after checking
  the target is the approved local PostgreSQL application.
- `tests/Browser/helpers/liveLaravelProxy.mjs` — opt-in allowance for assessment
  stage POST requests in the isolated test proxy; existing defaults preserved.
- `docs/ui/offline-reconnect-browser-2026-11-15.md` — this evidence.

Dependencies were unchanged. No commit or push was performed.

### Subsequent workspace change

Before completion, a read-only recheck found HEAD had moved to `0c2d7e9` and
the previously uncommitted automatic-access/conflict code, this browser runner,
and the proxy opt-in change were absent. The cause of that external workspace
change was not established. They were not restored over the new state. The
retained reports/screenshots prove the tested candidate above, not acceptance
of the current HEAD/build. At this final check this document is the only
remaining untracked change from this validation checkpoint. Syntax verification
of the runner could not be repeated because it no longer exists in the workspace.

## ngrok scope

This result is specific to localhost. Frontend `localEnrollmentOrigin()` and
server `LocalOfflineEnrollment` intentionally allow key enrollment only at
`http://localhost:8080`. An ngrok HTTPS origin does not satisfy that policy and
also owns a separate IndexedDB/service-worker namespace. Automatic keys created
on localhost are not available on ngrok. Changing that policy requires an
explicit permitted-origin design rather than treating localhost acceptance as
ngrok acceptance. The local ngrok API at port 4040 was unavailable during the
follow-up check; this alone does not prove that no ngrok tunnel is running.
