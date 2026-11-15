# SRQ safety and Whisper preparation reliability — 15 November 2026

Workstream A: implemented; automated regressions PASS.
Workstream B: observable stages, readiness gate and recovery implemented; mocked
lifecycle checks PASS. The original browser/device hang is **not confirmed fixed**.
Actual ONNX/WASM execution and microphone acceptance remain NOT TESTED.

This follows the Indonesian and bilingual SRQ checkpoints dated 15 November 2026.
Their recorded test results remain historical evidence. The new cases below expose
coverage gaps in that earlier code-level checkpoint; they do not establish that
the earlier browser hang had any particular cause.

## Root-cause evidence and competing hypotheses

The English regressions were reproduced in deterministic tests before editing:
64 existing English tests passed and the three new test groups failed. Late
qualifications lacked symptom words, so they could be ignored after a definitive
clause. Independent-clause splitting only started from `I`, omitting `My` reports.
The safety-concern vocabulary also omitted the requested additional phrases.

For Whisper, source inspection confirms that 100% is a **per-file transfer**
callback. More model files, ONNX session creation/runtime initialization and the
silent-audio probe may still be pending. The original code awaited all of those
before READY, without exposing their stages or enforcing a recovery deadline.
Warm-up rejection was swallowed; a warm-up promise that never settled would still
block READY forever. Swallowing rejection was a separate false-readiness risk,
not evidence that warm-up caused this user's hang.

| Hypothesis | Evidence collected | Evidence still missing |
| --- | --- | --- |
| Artifact download finished, pipeline/session initialization still pending | Source distinguishes progress callbacks from completion of `pipeline()`; the observed UI is consistent with this | Affected browser's actual stage/timing and ONNX state |
| Silent warm-up stalls or is excessively costly | Source awaited unrestricted generation on silent input; a pending probe blocks READY; deterministic pending-probe test reproduces that control-flow condition | Real-model warm-up timing, browser CPU/memory and stack evidence |
| Missing/incorrect runtime response | Direct localhost GETs returned 200, correct MIME types, no redirect/HTML; WASM magic bytes valid | Responses actually served to the affected worker through its active service worker/cache |
| WASM compilation/resource exhaustion | Source uses the existing q4 small model, emitted WASM assets and existing thread policy | Real runtime errors, memory measurements and device performance |
| Stale/corrupt cached asset | Cache keys and runtime URL wiring inspected; no cache was cleared | Affected browser's cache entries, worker URL/version and response validity |
| WebGPU failure/fallback resource issue | Returned pipelines are now explicitly released before falling back; disposal-failure regression fails preparation safely | Actual device GPU allocation/release measurements; internal library resources from a pipeline call that rejects before returning an instance |

Read-only HTTP verification on `http://localhost:8080`:

- `/build/assets/ort-wasm-simd-threaded.jsep-B0TxsgQ-.mjs`: HTTP 200, `application/javascript; charset=utf-8`, no redirect, no HTML prefix.
- `/build/assets/ort-wasm-simd-threaded.jsep-B0T3yYHD.wasm`: HTTP 200, `application/wasm`, no redirect, valid `00 61 73 6d` header. Local emitted size: 21,596,019 bytes.

Initial sandboxed HTTP attempts were unavailable. The subsequent authorized
read-only static-asset requests succeeded. These requests did not run the model,
inspect patient routes, reproduce browser Cache Storage behavior, or prove that
the affected browser loaded the current build. No browser-debugging connector was
available in this session.

## Workstream A changes

- Later `Maybe not`, `I am not sure`, and similar qualifications now identify the
  affected earlier answer and suppress it from definitive matches. They never
  become affirmative evidence through the qualification-target lookup.
- `I want to die. Maybe not.`, `I want to die. I am not sure.`, and
  `I want to die but maybe not.` all require REVIEW, with no matched Q17 answer.
- `I have headaches but might not have headaches.` remains unresolved. Explicit
  uncertainty about a different symptom does not remove an independently clear
  answer, e.g. `My hands are shaking and I might have headaches.` preserves Q5.
- `I have suicidal thoughts.`, `I wish I were dead.`, and `I thought of suicide.`
  route to REVIEW without definitive YES. Question-only, quoted and third-party
  wording never supplies the survivor's own definitive answer.
- Independent self-reports beginning with `I` or `My` now split only after a
  complete supported statement. `My appetite is poor and I feel anxious.` fills
  Q2/Q6; `My hands are shaking and I have headaches.` fills Q5/Q1.
- Existing negation, conflicts and overlapping symptoms remain guarded. Clear
  Q17 YES still opens CONFIRM; uncertainty or contradiction uses REVIEW.
- Mounted response tests check all six requested safety phrases against absent,
  YES, NO, UNCLEAR and UNANSWERED existing Q17 states: no save and no overwrite.
  Existing manual confirmation, emergency escalation, persistence and ownership
  logic is reused; no scoring or T0 transport changes.

## Workstream B changes

Observable stages are now `worker_start`, `runtime_assets`, `pipeline`,
`model_assets` and `warmup`, followed by genuine READY or a failure. Pipeline
creation and ONNX runtime initialization are reported together because the library
call does not expose a reliable boundary between those operations. No fabricated
runtime/warm-up percentages are shown. Worker-origin elapsed times update on
observable stage transitions/heartbeats; the client also records completion/error
timing in development diagnostics.

Download percentage remains independent of readiness. At file progress 100%, the
page explicitly says the file is downloaded and STT is not ready yet. Recording
cannot start until READY from a successful pipeline/probe. Preparation can be
canceled while the main recording controls remain unavailable.

Warm-up still uses synthetic silence and the existing Indonesian model. Only the
probe's decoder generation is bounded to two new tokens; actual transcription
settings, dtype, model ID and thread policy are unchanged. Probe errors now fail
preparation rather than being swallowed. A returned WebGPU pipeline is disposed
before WASM fallback after a failed probe. If disposal itself fails, preparation
fails and the client terminates the worker instead of allocating another pipeline.

The preparation watchdog uses these documented recovery limits:

| Condition | Behavior |
| --- | --- |
| 90 seconds without forward progress | Show a slow-stage notice; do not mark READY or abort |
| 10 minutes without any worker response | Terminate the worker and show a retryable preparation error |
| 20 minutes without stage/backend/file-percent progress, despite responses | Terminate the worker and show a stalled-stage error |
| Genuine file/stage/backend progress | Renew the forward-progress allowance; long downloads can continue |
| Heartbeat or repeated identical 100% progress | Shows responsiveness only; cannot extend the no-progress limit forever |
| READY, failure, explicit cancellation or unmount | Stop watchdog timers |

These are conservative engineering recovery limits, not measured performance
thresholds or a claim that all devices finish within them. A very slow device or
suspended browser can still require a manual retry. Timers act when the browser's
main event loop is scheduled. The worker heartbeat is every 15 seconds and never
claims readiness. Diagnostics are development-only stage/backend/elapsed/code
metadata: no audio, transcripts, identifiers, credentials, URLs or session secrets.

The client handles worker errors, message errors, fatal worker rejection and
post-message failures. A watchdog is not merely a rejected Promise: failure and
explicit disposal terminate the worker immediately, including hung WASM/probe
work. Late callbacks are fenced by disposed-client identity. A manual retry
creates one fresh worker; there is no automatic retry loop. The worker's existing
in-flight preparation guard is retained, and the client now avoids redundant
PREPARE posts.

Switching Online does not consume an unready Offline worker. Preparation may
continue in the background with the same watchdog; its events do not overwrite
Online capture state. Returning Offline reuses a genuinely ready worker or shows
its preparation/failure state. Fatal errors after readiness require preparation
again; they are not presented as a still-usable transcription pipeline.

Model/runtime caches, Cache Storage, IndexedDB, service-worker configuration,
runtime asset URLs and clinical data are untouched. Existing cached runtime paths
and local-only pipeline options are exercised with mocks; real offline model
reuse is still a browser acceptance requirement. No English offline model or
remote audio/interpretation service was added.

## New modifications versus previous working changes

| File changed in this task | Purpose |
| --- | --- |
| `resources/js/domain/srq/srqEnglishTranscriptInterpreter.ts` | Late qualification, credible Q17 concern and independent My/I statement handling |
| `resources/js/domain/srq/srqTranscriptInterpreter.ts` | Preserve REVIEW for the additional concerns when language is mixed/mismatched |
| `resources/js/stt/types.ts` | Stage, heartbeat, slow-preparation and fatal-error metadata |
| `resources/js/stt/whisper.worker.ts` | Stage reporting, synthetic probe bound, genuine readiness, cleanup-before-fallback and rejection handling |
| `resources/js/stt/whisperClient.ts` | Readiness gate, watchdog integration, duplicate protection, failure termination and safe diagnostics |
| `resources/js/stt/whisperPreparationWatchdog.ts` (new) | Responsiveness versus forward-progress recovery policy |
| `resources/js/stt/whisperPreparationPresentation.ts` (new) | Localized preparation-stage and recovery messages |
| `resources/js/composables/useSrqSpeech.ts` | Stage/failure presentation, cancellation/retry and independent background preparation state |
| `resources/js/Pages/Relawan/Assessment/Srq.vue` | Visible stage/elapsed information and preparation cancellation at 100% |
| `tests/Node/srqEnglishSpeechCoverage.test.ts` | Three regression groups reproducing the requested interpreter failures |
| `tests/Node/srqBilingualSpeechLifecycle.test.ts` | REVIEW/persistence protection across prior Q17 states and multi-item application |
| `tests/Node/whisperClientLifecycle.test.ts` (new) | Deterministic worker/timer failures, timeout recovery, duplicate/stale-event guards |
| `tests/Node/whisperWorkerPreparation.test.ts` (new) | Actual worker module logic with mocked pipeline/runtime cache: progress/probe/fallback/disposal |
| `tests/Node/whisperPreparationUi.test.ts` (new) | Mounted composable preparation/failure/retry/cancel/mode-switch coverage |
| `tests/Node/relawanAssessmentUi.test.ts` | Mounted real page stage/cancel behavior without recording at 100% |
| This report (new) | Evidence, limitations and acceptance handoff |

Earlier Indonesian/bilingual vocabulary, language selection, Web Speech lifecycle,
answer state, backend APIs, schemas, scoring and emergency transport are preserved.
The older SRQ reports are not rewritten. Unrelated `scripts/c2` content is checked
against hashes captured before this task. No Git mutations, dependency changes,
Docker/database operations, global cache clearing or GitHub writes were performed.

## Verification results

All Node commands below ran separately to isolate synthetic browser/worker globals.
Every final command passed, with zero failed/skipped tests. They are deterministic
Node/mounted-Vue tests, not actual browser or ONNX execution.

| Command | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `node --experimental-strip-types tests/Node/srqTranscriptInterpreter.test.ts` | 15 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqSpeechCoverage.test.ts` | 66 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqEnglishSpeechCoverage.test.ts` | 67 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqBilingualSpeechLifecycle.test.ts` | 9 | 0 | 0 |
| `node --experimental-strip-types tests/Node/webSpeechLanguage.test.ts` | 3 | 0 | 0 |
| `node --experimental-strip-types tests/Node/relawanSrqSafety.test.ts` | 12 | 0 | 0 |
| `node --experimental-strip-types tests/Node/webSpeechPause.test.ts` | 4 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperClientLifecycle.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperWorkerPreparation.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperPreparationUi.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqQuestions.test.ts` | 3 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqResponseMap.test.ts` | 2 | 0 | 0 |
| `node --experimental-strip-types tests/Node/relawanAssessmentUi.test.ts` | 13 | 0 | 0 |
| `node --experimental-strip-types tests/Node/assessmentCanonicalRegression.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/assessmentHandoff.test.ts` | 2 | 0 | 0 |
| `node --experimental-strip-types tests/Node/assessmentContract.test.ts` | 13 | 0 | 0 |
| `node --experimental-strip-types tests/Node/localPwaAssessment.test.ts` | 1 | 0 | 0 |
| `node --experimental-strip-types tests/Node/assessmentDisclaimer.test.ts` | 1 | 0 | 0 |
| `node --experimental-strip-types tests/Node/relawanAssessmentPersistence.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/assessmentVersion.test.ts` | 6 | 0 | 0 |
| `node --experimental-strip-types tests/Node/onlineAssessmentPersistence.test.ts` | 8 | 0 | 0 |
| `node --experimental-strip-types tests/Node/offlineAssessmentRegression.test.ts` | 8 | 0 | 0 |
| `node --experimental-strip-types tests/Node/compactAssessmentHeader.test.ts` | 2 | 0 | 0 |
| `node --experimental-strip-types tests/Node/onlineAssessmentStart.test.ts` | 2 | 0 | 0 |
| `node --experimental-strip-types tests/Node/pwaTransport.test.ts` | 3 | 0 | 0 |
| `node --experimental-strip-types tests/Node/pwaRegistration.test.ts` | 1 | 0 | 0 |

Total: **271 tests across 26 files**, all PASS.

Additional final checks:

```bash
./node_modules/.bin/vue-tsc --noEmit
npm run build
git diff --check
```

Type checking, frontend/PWA build and whitespace check passed. Build warnings:
large chunks and deprecated `inlineDynamicImports`. Ignored build assets were
regenerated; no active service-worker update or browser publication is claimed.
Backend tests were not run because no backend/schema/API/scoring files changed.
The initial English red run (same English command above) was 64 PASS / 3 FAIL /
0 SKIP, demonstrating the new failures before implementation. Subsequent focused
runs passed; no existing valid expectation was weakened to obtain a pass.

Verification boundaries:

| Level | Result |
| --- | --- |
| Current source, installed Transformers implementation, build/SW/cache wiring | Inspected |
| Direct runtime-asset HTTP responses on localhost | PASS for the two emitted assets |
| Deterministic Node/client/timer/worker-module/mounted-Vue tests | PASS |
| Actual browser Worker executing ONNX/WASM/model inference | NOT TESTED |
| Affected Kubuntu browser/microphone and original 100% hang | NOT REPRODUCED / acceptance pending |
| Real offline model reuse, active service worker, GPU/CPU memory behavior | NOT TESTED |

The worker-module tests evaluate the actual module using fake worker globals and a
mocked pipeline. They validate control flow and configuration, not neural inference
or the cause of the observed hang.

## Exact browser debugging and acceptance checklist

Use a synthetic assessment/account and synthetic audio only. Keep actual clinical
records, identifiers, private notes and tokens out of screenshots and exported
network logs. Do not clear IndexedDB or use global Clear Site Data/cache resets.

1. Record browser/version, exact origin (localhost and 127.0.0.1 differ), UI locale,
   visible speech mode and selected language. In Application → Service Workers,
   record the controlling worker URL/state and any waiting worker. Do not force
   an update while unsynchronized work or another controlled tab is active.
2. Confirm the page loads the new SRQ and Whisper worker bundles from the current
   `public/build/manifest.json`. Record filenames, not patient-page payloads.
   A successful local build alone does not prove the browser uses it.
3. Open Console with Preserve Log. In development builds, filter for
   `[Whisper preparation]`; collect only stage/backend/elapsed/code metadata.
   Production intentionally omits those debug logs; use the visible stage label
   and the worker's Sources breakpoints instead.
4. Open Network with Preserve Log and first leave normal cache behavior enabled.
   Filter `whisper`, `onnx`, `ort-wasm`, `.mjs`, `.wasm` and the model host. Record
   URL path, status, MIME, transferred size, duration and cache/SW source. Do not
   export auth headers, cookies or assessment/API request bodies.
5. Verify worker JS and runtime MJS are JavaScript, WASM is `application/wasm` with
   valid binary bytes, responses are not redirected to HTML/login, and there are
   no CORS/CSP/compile/worker-start failures. Inspect actual browser responses,
   since direct server checks do not exercise its service-worker caches.
6. In the dedicated worker context, record `crossOriginIsolated` and
   `navigator.hardwareConcurrency`. The source uses one WASM thread when not
   isolated; the existing isolated-device thread policy is unchanged. Do not
   enable extra threads or alter COOP/COEP just to force preparation through.
7. Start Offline preparation. Record each observed stage and elapsed time:
   worker start → runtime assets → pipeline/model files → warm-up → READY/error.
   Pipeline/model stages can alternate as files complete. File progress 100%
   must still show preparing; microphone controls must remain unavailable.
8. If still stuck, note the last stage. In Sources select the Whisper worker:
   break at `ensureOfflineWasmRuntime`, the `pipeline()` await, `warmupPipeline`
   and READY emission. Pause on caught exceptions for initialization errors.
   Record which await remains pending and the initialization error/stack only;
   do not inspect/copy real audio or transcript buffers. Use synthetic data.
9. For long stages, collect process CPU/memory observations and network progress.
   A warm-up label alone does not prove a warm-up defect; a pipeline label alone
   does not identify download, graph loading, compilation or memory as the cause.
10. At 90 seconds without forward progress, expect an informative slow-stage
    message, not false READY. Cancel preparation if desired: worker must terminate,
    controls return to preparation/manual use, and model caches remain intact.
11. Retry once explicitly. Verify one active Whisper worker and one preparation
    attempt. Old READY/ERROR callbacks must not change the newer session. There
    must be no automatic repeated downloads/retry loop.
12. For a genuinely unresponsive worker, the 10-minute response deadline should
    terminate it; responsive-but-stalled work reaches the 20-minute no-progress
    deadline. Browser suspension/debugger pauses can affect wall-clock timing.
    Do not deliberately wait through every deadline on real data.
13. After genuine READY, record `Saya males makan.` and stop. Confirm the actual
    final transcript is supported, eligible Q2 becomes YES, and manual answers
    remain protected. Record again without model reinitialization. A successful
    synthetic transcription is required to close the original hang acceptance.
14. Switch Online and back: a genuinely ready Offline worker is reused; a pending
    one cannot record. Online English must remain independent of background
    preparation/failure. Canceling or unmounting must prevent late UI updates.
15. After preparing while connected, test Offline Indonesian with the browser
    offline. Runtime/model assets should come from their existing caches. Verify
    no unexpected network dependency and a successful second synthetic recording.
    Missing assets should produce an actionable error, not global cache deletion.
16. Online English (`en-US`): `My appetite is poor and I feel anxious.` fills Q2/Q6;
    `My hands are shaking and I have headaches.` fills Q5/Q1. `I have headaches
    but might not have headaches.` remains unresolved. `I am tired.` and
    `My stomach cramps.` stay unresolved for overlapping questions.
17. For each of `I want to die. Maybe not.`, `I want to die. I am not sure.`,
    `I want to die but maybe not.`, `I have suicidal thoughts.`,
    `I wish I were dead.`, and `I thought of suicide.`: expect REVIEW, no saved
    Q17 change, no direct T0 dispatch. Test `I want to die.` separately: CONFIRM
    before saving; cancellation preserves the previous answer. An unambiguous
    `I do not want to die.` can supply NO to an eligible question. Fear of dying,
    questions alone, quoted speech and third-party statements must not supply YES.
18. Online Indonesian (`id-ID`): repeat `Saya mewek terus.`, `Saya tidak sering
    menangis.`, `Saya deg-degan.` and `Pernah nggak kepikiran nyerah? Iya.`.
    Expect Q10 YES, Q10 NO, Q6 only, and Q17 REVIEW respectively, on independent
    eligible synthetic cases. Test language switching discards old transcripts.

Collect the last stage/timing, relevant asset statuses, safe error metadata, actual
READY and synthetic-transcription evidence. That evidence determines the affected
device root cause and whether the original hang is fixed; mock PASS cannot do so.

## Final audit and remaining limits

Reviewed changed source/tests, readiness/error paths, diagnostic payloads, timer
cleanup, worker disposal, retry guards and incremental/cumulative diff inventory.
All visible readiness still comes from worker READY after successful inference
probe; no path promotes 100% progress to READY. Watchdog failure terminates the
worker before a fresh attempt, does not clear caches, and cannot re-enable an
old worker. Returned GPU pipelines are released before fallback; failed cleanup
forces recovery. Earlier Indonesian rules, Q17 manual confirmation and Web Speech
language/session behavior are retained. No backend or emergency transport changed.

Deterministic language rules still cannot resolve every qualification, speaker
change or paraphrase. Conservative suppression may require manual clarification.
Readiness of the real model, performance of the two-token probe, internal library
cleanup after a rejected pipeline creation, browser cache correctness and actual
memory release remain unmeasured on the affected device. Recovery thresholds
bound unattended waiting but do not prove or cure a particular ONNX/browser fault.

The handoff includes a diff of only this task against the captured local starting
state and a cumulative STT diff including the earlier Indonesian/bilingual work.
Both exclude unrelated `scripts/c2`. Next checkpoint: owner/Antigravity verification
on the affected Kubuntu browser, using the checklist above.
