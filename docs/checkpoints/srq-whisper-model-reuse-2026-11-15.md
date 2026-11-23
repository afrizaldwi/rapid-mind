# Offline Whisper model reuse — 15 November 2026

Code-level changes and automated checks: PASS.
**Feature acceptance: PENDING.** Actual browser model-transfer measurements, a
page reopen/reload and fully offline reuse have NOT been verified in this session.
No browser-debugging connector was available. The user's reported repeated
network download is not confirmed by source inspection or progress bars.

This checkpoint preserves the preceding Indonesian, bilingual and reliability
changes. Earlier reports describe their historical checkpoints; their download
wording and mock-based cache assumptions are refined by this audit.

## Confirmed findings

1. Online → Offline within one mounted SRQ page already retains a healthy Whisper
   worker and returns to its genuine READY state. Switching modes cancels capture;
   it does not dispose the ready pipeline. Ten repeated switches are now tested.
2. Page unmount, clinical cleanup, explicit preparation cancellation and fatal
   recovery terminate the worker. This releases in-memory model/runtime state,
   so reopening requires pipeline creation and warm-up again. It does not delete
   persistent model/runtime caches. Initialization is not itself a download.
3. The installed Transformers.js **3.8.1** loader emits `initiate`, `download`,
   `progress`, `done` even when reading a cache hit. This was reproduced against
   its actual installed `getModelFile()` implementation with synthetic responses.
   The prior UI's “downloaded (100%)” wording was therefore inaccurate for hits.
4. The worker requested `local_files_only: true` offline, but the library's browser
   default is `env.allowLocalModels = false`. Its guard rejects that combination
   **before looking in cache**, even if all requested files are cached. The guard
   failure and corrected lookup were reproduced using the installed loader.
5. The installed loader is already cache-first online. An online pipeline failure
   does not establish a cache miss; retrying the whole pipeline cache-only adds
   no cache-reuse benefit and cannot repair a runtime error. That blanket retry
   is removed. Explicit failure recovery and WebGPU→WASM fallback remain guarded.
6. The installed loader trusts matching cache responses, does not repair a known
   bad matching entry itself, and can suppress cache-write failures. The new
   adapter rejects detectable invalid entries and checks persistence before READY.

These findings explain an apparent download and a real offline configuration
failure. They do **not** prove why the affected browser transferred model bytes
again, if it did. Browser eviction, storage permissions/quota, missing artifacts,
a different origin/profile, and stale active app/service-worker code still need
browser evidence where relevant.

## Cache architecture

| Layer | Lifetime / keys | Role and limits |
| --- | --- | --- |
| In-memory Whisper pipeline | One worker on the mounted page | Reused across speech mode switches; recreated after disposal/unmount |
| Transformers model cache | Cache Storage `transformers-cache`, owned by the app origin/profile | JSON/tokenizer/config and existing q4 ONNX artifacts; same installed-library request keys |
| Runtime cache | Cache Storage `rapid-mind-onnx-runtime-v1` | Same-origin hashed `.mjs` and `.wasm` URLs; retained across worker recreation |
| Browser HTTP cache | Browser-managed request cache | A browser fetch may be served here without a wire transfer; not interchangeable with the model cache |
| Workbox app precache | Existing versioned PWA app/static cache | Supplies the offline shell/bundles. Its outdated-precache cleanup filters `-precache-` names, not either cache above |
| Clinical IndexedDB | Existing encrypted clinical storage | Not used for model artifacts and not modified by this task |

The installed model key format remains the full resolved Hub URL, e.g.
`https://huggingface.co/cmaree/Bagus-whisper-small-id-onnx/resolve/main/onnx/encoder_model_q4.onnx`.
The library may also probe its local-path key first. The adapter passes request
keys unchanged to the same Cache Storage bucket; its filename parsing is only
for in-memory progress provenance. No second model downloader or model store was
introduced. Model ID, revision policy, q4 variants, language support and scoring
are unchanged. WebGPU and WASM retain the same existing model-artifact variants.

`localhost:8080`, `127.0.0.1:8080`, other ports/schemes and separate browser profiles
have separate origin/profile storage. A warm cache on one is not evidence of a
warm cache on another. UI language does not select a different Offline model.
Online English Web Speech remains independent of Whisper.

## Implemented changes

- Configure the verified library option combination per preparation attempt:
  offline uses `allowLocalModels=true` with `local_files_only=true`; online uses
  `allowLocalModels=false` with `local_files_only=false`. Complete cached files
  are checked first in both cases. First use can still fetch missing files online.
- Use the library's supported `env.customCache` interface, backed by its existing
  `transformers-cache` bucket. Transformers.js still performs model fetches and
  writes. Observed cache hits are reported as cache reads; the browser fetch path
  is explicitly labeled “network or HTTP cache,” not proven network transfer.
- Reject detectable invalid cached model responses: invalid status/redirects,
  empty bodies, malformed JSON, HTML/error content, JSON in an ONNX entry, and
  detectable short bodies with explicit uncompressed length metadata. They are
  treated as misses, allowing the installed loader to replace only those keys.
- Preserve intact data even when model MIME metadata is imprecise or a decoded
  cross-origin response carries compressed Content-Length without exposing its
  Content-Encoding. Neither condition alone proves corruption.
- Never clear caches or remove valid entries. Repairs overwrite only a missing
  or rejected artifact after successful fetching. A write/open failure is visible
  and blocks preparation from falsely declaring persistent offline readiness.
- Validate runtime responses by existing asset MIME/status policy and binary/code
  prefix checks. Missing/invalid runtime artifacts fail clearly offline; online
  only the affected artifact is fetched and written back under the same key.
- A known-invalid runtime refresh carries `X-Rapid-Mind-Runtime-Repair: 1` and
  `cache: reload`. Only that explicit repair request bypasses Workbox's runtime
  bucket via NetworkOnly. Ordinary reload requests remain CacheFirst; intact
  runtime files are not invalidated. No clinical route gains a new cache policy.
- Keep 100% as file-read progress, never readiness. The page now says “Model file
  read (100%)” / “Berkas model selesai dibaca (100%).” Cache reads, browser fetch,
  runtime/pipeline initialization, warm-up, READY and failures remain distinct.
- Retain genuine warm-up/READY gating, conservative preparation watchdog,
  cancellation, stale-event fencing and manual retry from the earlier checkpoint.

An offline miss may result in the installed library attempting its same-origin
local-model path before reporting `local_files_only`. It cannot download missing
Hub files in that mode. Complete-cache fixture reads make zero fetch calls.
Missing optional files may produce checks/404s on reopen; that is different from
retransferring intact ONNX weights.

## Files changed in this task

| File | Purpose |
| --- | --- |
| `resources/js/stt/whisperModelCache.ts` (new) | Same-bucket adapter, source observation, structural validation and persistence check |
| `resources/js/stt/whisperRuntimeCache.ts` (new) | Runtime hit validation and selective repair without deleting cache entries |
| `resources/js/stt/whisper.worker.ts` | Browser-compatible offline flags, existing-cache integration, source metadata and actionable failures |
| `resources/js/stt/types.ts` | Optional model-source metadata on progress events |
| `resources/js/stt/whisperPreparationPresentation.ts` | Accurate cache/fetch messages and missing/unavailable-cache errors |
| `resources/js/composables/useSrqSpeech.ts` | Preserve and localize observed model source during preparation |
| `resources/js/Pages/Relawan/Assessment/Srq.vue` | Replace the misleading “downloaded” progress caption with “read” |
| `resources/js/pwa/serviceWorker.ts` | Explicit per-runtime-artifact repair bypass; ordinary requests retain CacheFirst |
| `tests/Node/whisperModelCache.test.ts` (new) | Installed file-loader caching/recreation/offline/partial/corruption/write-failure regressions |
| `tests/Node/whisperRuntimeCache.test.ts` (new) | Runtime reuse/repair/offline behavior and actual SW source routing with doubles |
| `tests/Node/whisperWorkerPreparation.test.ts` | Worker option/persistence regressions; valid runtime MIME metadata added to its synthetic fixture |
| `tests/Node/whisperPreparationUi.test.ts` | Repeated mode reuse and accurate cache/error messages |
| `tests/Node/whisperClientLifecycle.test.ts` | Disposal without persistent-cache deletion |
| This report (new) | Audit evidence, verification and browser byte-measurement procedure |

Existing SRQ interpretation, answer ownership, Q17 safeguards, Web Speech language
selection, model configuration and watchdog timings are preserved. Backend APIs,
clinical storage, scoring, model quantization and T0 transport are unchanged.
Unrelated `scripts/c2` content is verified against pre-task hashes. No dependencies,
Git/GitHub mutations, database operations or browser-storage resets were performed.

## Verification actually performed

The commands below were run separately with synthetic fixtures; all passed with
zero failed/skipped tests. No model files or audio were downloaded/uploaded by
the test suite. File-loader tests use the installed library with fake Fetch and
Cache objects; they do not run ONNX inference or a real browser Cache Storage.

| Command | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `node --experimental-strip-types tests/Node/srqTranscriptInterpreter.test.ts` | 15 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqSpeechCoverage.test.ts` | 66 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqEnglishSpeechCoverage.test.ts` | 67 | 0 | 0 |
| `node --experimental-strip-types tests/Node/srqBilingualSpeechLifecycle.test.ts` | 9 | 0 | 0 |
| `node --experimental-strip-types tests/Node/webSpeechLanguage.test.ts` | 3 | 0 | 0 |
| `node --experimental-strip-types tests/Node/relawanSrqSafety.test.ts` | 12 | 0 | 0 |
| `node --experimental-strip-types tests/Node/webSpeechPause.test.ts` | 4 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperClientLifecycle.test.ts` | 7 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperWorkerPreparation.test.ts` | 8 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperPreparationUi.test.ts` | 8 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperModelCache.test.ts` | 10 | 0 | 0 |
| `node --experimental-strip-types tests/Node/whisperRuntimeCache.test.ts` | 4 | 0 | 0 |
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

Total: **290 tests across 28 files**, all PASS.

Also executed, all PASS:

```bash
./node_modules/.bin/vue-tsc --noEmit
npm run build
git diff --check
```

Build warnings: large chunks and deprecated `inlineDynamicImports`. Ignored
`public/build` assets were regenerated; active browser/service-worker adoption was
not tested. Backend tests were not run because backend files were not affected.
Synthetic offline-miss tests produce the installed loader's expected local-path
warnings. These are not failed tests or evidence of a real browser transfer.

Before implementation, a direct installed-loader probe confirmed the invalid
browser-default/local-only combination and confirmed `download` progress on a
cache hit. These were diagnostic probes, not browser reproductions.

## Browser acceptance: measure bytes, not progress bars

Use one dedicated synthetic browser profile and the **same exact origin** through
all phases. For a cold first-use measurement, start a new disposable test profile;
do not clear an existing profile, clinical IndexedDB, service-worker cache or
model cache. Keep ordinary browser cache behavior enabled throughout.

1. Record browser/version, origin, UI locale, synthetic assessment, active app and
   controlling service-worker bundle URLs. Confirm the new build is actually
   served and controlled. If an older SW is waiting, follow the existing safe
   update process after protecting drafts/closing controlled tabs; do not force
   takeover or disable privacy controls.
2. Open DevTools Network → Preserve log. Leave **Disable cache unchecked** and
   **Bypass service worker unchecked**. Show Size/Transferred, Status, Initiator,
   Timing and resource URL path. Use only filtered model/runtime asset evidence;
   do not export cookies, authorization headers, signed URL secrets or clinical
   request bodies.
3. Filter both the model name and `.onnx`, tokenizer/config JSON, Hub/CDN requests,
   `ort-wasm`, `.wasm`, `.mjs`, and the Whisper worker. Follow redirect chains when
   measuring initial model transfers. Track model files separately from runtime,
   application JS, HTML and API traffic.
4. **Cold first preparation, online:** prepare Offline Whisper, wait for genuine
   READY, and record one synthetic Indonesian phrase. Record each model file,
   transfer bytes and whether it was saved in Application → Cache Storage →
   `transformers-cache`. Record runtime keys in `rapid-mind-onnx-runtime-v1`.
   READY and a valid cache inventory are separate observations.
5. **Same mounted page:** switch Online → Offline ten times. A healthy worker
   should remain the same and Offline should return ready without pipeline/model
   preparation again. Measure any new model/runtime requests; a large model body
   transfer is not expected. Then make a second synthetic recording.
6. **Page reopen/reload, online:** navigate away and back or reload normally. The
   old Whisper worker should terminate and a new one should initialize pipeline
   and run warm-up. Cache-file progress may run again and reach 100%; the label
   should report reading, and direct model cache hits should identify cache.
   Measure bytes transferred for each model artifact again.
7. **Fully offline reuse:** after successful online preparation and app/PWA setup,
   switch DevTools Network to Offline, then reopen/reload the assessment without
   changing origin/profile. Use the approved unlock/session flow if needed.
   Expect cached model/runtime loading → pipeline → warm-up → READY, followed by
   successful synthetic Indonesian transcription. Record zero model/runtime wire
   bytes; there must be no dependency on a newly downloaded required artifact.
8. A cached file may show its full resource size even when transferred bytes are
   zero. “from memory cache,” “from disk cache,” and “from ServiceWorker” differ
   from a direct Transformers Cache Storage hit (which may produce no fetch
   request at all). HTTP 200 alone is not proof of a network body download. A 304
   or small metadata/optional-file request is not a repeated ONNX weight transfer.
9. Inspect missing-cache behavior using a fresh test profile while offline, not
   by deleting real entries. Expect a cache-specific error and manual answers,
   not false READY. Automated corruption/repair fixtures cover selective writes;
   do not corrupt or globally reset a real profile as part of routine acceptance.
10. Verify manual SRQ answers remain protected, Q17 still uses its existing
    confirmation/review, Online English remains `en-US`, and Offline remains
    Indonesian only. Missing cache/retry must not create T0 or modify drafts.

Fill this evidence table from the actual browser:

| Phase | Model wire bytes per file / total | Runtime wire bytes | New pipeline/worker? | READY + synthetic transcript |
| --- | --- | --- | --- | --- |
| First preparation, fresh profile | Pending | Pending | Expected yes | Pending |
| Ten same-page mode switches | Expected zero for intact model bodies | Expected no unnecessary transfer | Expected no | Pending |
| Reopen/reload, online | Expected zero for intact cached model bodies | Classify Cache Storage / SW / HTTP cache behavior | Expected yes | Pending |
| Reopen/reload, fully offline | Expected zero | Expected zero | Expected yes, using available cached assets | Pending |

If model bodies are actually retransferred, compare the exact origin/profile,
model ID/revision/variant keys, cache presence and cache errors immediately before
and after preparation. Check storage quota/permission or eviction evidence and
active code/SW version. Do not infer a cause from a progress percentage and do not
solve it by clearing valid model or clinical storage.

## Final review and remaining limits

Reviewed worker lifetime, new file-loader integration, selective writes, exact
cache keys, error/readiness paths, the runtime SW exception and changed diffs.
No global cache deletion or clinical storage was added. An explicit runtime repair
cannot change unrelated cache policy, and an ordinary reload cannot accidentally
select its NetworkOnly branch. The watchdog, termination/retry behavior and
previous safety tests pass unchanged.

Structural validation is not a cryptographic checksum or a complete ONNX/MJS
parser. Same-length internal weight corruption, subtle protobuf truncation, or
arbitrary JavaScript corruption may pass prefix checks and fail during actual
runtime initialization. Such failures remain actionable and fail readiness; the
code does not guess a file and delete/re-download intact artifacts. JSON bodies
are parsed; binary checks inspect a short prefix rather than hashing/re-reading
an entire model. Compression and MIME metadata alone do not invalidate model data.

The installed default revision remains `main`; this task does not add remote
model-version revalidation or pin a new revision. Browser eviction/private-mode
storage restrictions and device performance remain outside the mock evidence.
The online runtime MJS import still uses the existing hashed URL and normal
HTTP/service-worker caching; no arbitrary runtime relocation was introduced.

**No real browser cache-reuse acceptance is claimed.** Acceptance requires the
same-profile reload and fully offline reuse measurements above, plus actual READY
and a synthetic transcription. The supplied incremental diff covers this task;
the cumulative STT diff also includes the earlier uncommitted checkpoints. Both
exclude unrelated `scripts/c2` work.
