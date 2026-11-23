# Bilingual SRQ STT checkpoint — 15 November 2026

Code-level implementation and automated verification: PASS.
Browser/microphone/served-PWA acceptance: NOT TESTED; separate owner checkpoint.
This extends the Indonesian speech checkpoint from the same date; it preserves
that report and its historical test results.

## Support matrix and language lifecycle

| Mode | Speech language | Interpreter | Availability boundary |
| --- | --- | --- | --- |
| Offline Whisper | Indonesian (`id` / worker `Indonesian`) only | Indonesian SRQ rules | Existing prepared local model; no model/provider added |
| Online Web Speech | Indonesian (`id-ID`) | Indonesian SRQ rules | Browser/service support and existing synthetic-data consent required |
| Online Web Speech | English (`en-US`) | English SRQ rules | Browser/service support and existing synthetic-data consent required |
| Offline English | Unsupported | No English offline route | Use English Online where supported, Indonesian Offline, or manual answers |

The online default follows the UI locale while idle until explicitly overridden.
The spoken-language selector does not change the display locale. During recording
or final processing, a locale change cannot retarget the microphone or interpreter.
After a successful session ends, an unoverridden default can follow the new UI
locale. Errors retain the failed language; they never silently retry in another
language. Explicit language changes abort/dispose the old capture, clear transcript
previews, and require a fresh recording action. Consent is retained across ordinary
mode/language switches. Existing clinical cleanup, lock, owner interruption and
Q17 interruption still dispose captures and clear consent; the language override
is local to that page/session and resets on clinical cleanup.

Every browser segment restart uses the immutable language captured by its
`WebSpeechClient`. The composable passes that same language with final text to
`useSrqResponses`. Whisper always supplies `id-ID`, including under an English UI.
Only final results reach answer application. Fatal browser errors discard partial
segments, abort recognition, and fence out late callbacks. Error text identifies
unsupported recognition language and labels any offline option Indonesian-only.
There is no claim that every browser/service supports English.

## Files modified by this bilingual checkpoint

| File | Purpose |
| --- | --- |
| `resources/js/stt/speechLanguage.ts` | Shared supported language type and runtime guard |
| `resources/js/stt/webSpeechClient.ts` | Explicit language before start/restart, language-aware failures, abort/discard on fatal error |
| `resources/js/composables/useSrqSpeech.ts` | Independent spoken-language state, locale defaults, cancellation/fencing, final transcript routing, localized language feedback |
| `resources/js/Pages/Relawan/Assessment/Srq.vue` | Labeled language selector, online/offline language status, language passed into response application |
| `resources/js/domain/srq/srqEnglishSpeechContext.ts` | Contractions and anchors derived directly from `en.assessment.srq.questions` |
| `resources/js/domain/srq/srqEnglishSpeechRules.ts` | Whole-statement positive/negative English rules for Q1–Q20 |
| `resources/js/domain/srq/srqEnglishTranscriptInterpreter.ts` | English context, contradictions, uncertainty, overlap and Q17 review using the shared result contract |
| `resources/js/domain/srq/srqTranscriptInterpreter.ts` | Explicit language routing and conservative mixed-language handling; shortened Indonesian Q17 question review |
| `resources/js/domain/srq/srqSpeechContext.ts` | Anchor for `Pernah nggak kepikiran nyerah?` without treating it as definitive ideation |
| `resources/js/composables/useSrqResponses.ts` | Shared bilingual persistence/safety path; review blocks both YES and uncertain NO updates to Q17; feedback distinguishes CONFIRM/REVIEW |
| `tests/Node/helpers/srqEnglishSpeechCases.ts` | Synthetic examples for each English question |
| `tests/Node/srqEnglishSpeechCoverage.test.ts` | All-20 English polarity, script, ownership, ambiguity, contraction and mixed-language regression |
| `tests/Node/webSpeechLanguage.test.ts` | Real client with browser API double: configuration, restarts, disposal, stale events and failures |
| `tests/Node/srqBilingualSpeechLifecycle.test.ts` | Mounted composable routing, locale/override lifecycle, final-only application, offline invariance, Q17 safety and manual protection |
| `tests/Node/relawanAssessmentUi.test.ts` | Mounted real SRQ selector accessibility, mode behavior and display-language independence |
| This report | Support/coverage matrix, commands, review and browser handoff |

The existing `srqQuestions.ts`, Indonesian speech rules, English translations,
Whisper worker, backend APIs/schema, scoring and T0 transport are unchanged by
this bilingual checkpoint. Prior Indonesian implementation and unrelated
`scripts/c2` changes remain in the working tree. No dependencies or lockfiles
changed; no Git/GitHub mutations or Docker/database operations were performed.

## Q1–Q20 coverage

All 20 items have Indonesian and English regression coverage. The existing
Indonesian suite still passes (15 original interpreter + 66 coverage tests).
Its detailed vocabulary/exclusions remain in `srq-speech-coverage-2026-11-15.md`.

For every English item, tests cover canonical/conversational YES and NO,
canonical and displayed-script question-only speech, local Yes/No responses,
punctuation/case variants, contradictory/ambiguous statements, manual overrides,
restored definitive answers and eligible restored `UNANSWERED`. The response
composable also checks manual protection for all 20 English items.

| Q | English affirmative examples | English negative examples | Intentionally unresolved / safety distinction |
| --- | --- | --- | --- |
| 1 | I often have headaches; I have a headache | I do not have headaches; My head doesn't hurt | Strange head sensation alone |
| 2 | I have lost my appetite; I don't feel like eating | My appetite is normal; I haven't lost my appetite | Food taste/preference alone |
| 3 | I can't sleep; I keep waking up at night | I sleep well; I don't have insomnia | Noisy shelter alone |
| 4 | I am easily frightened/scared; I startle easily | I am not easily frightened; I don't startle easily | Fear of dying does not become Q17 YES |
| 5 | My hands shake; My hands are shaking | My hands do not shake; My hands aren't shaking | Racing heart does not imply hand tremor |
| 6 | I feel anxious; I am worried all the time | I am not anxious; I don't feel uneasy | Chest pain/racing heart without emotional context |
| 7 | My digestion is poor; I have diarrhea | My digestion is normal; I don't feel nauseous | Stomach cramps alone overlap Q19 |
| 8 | I have trouble thinking clearly; I can't focus | I can think clearly; I don't feel dazed | Generic confusion alone |
| 9 | I feel unhappy; I feel empty | I feel happy; I don't feel sad | Uncertain sadness |
| 10 | I keep crying; I cry more often than usual | I don't keep crying; I don't cry more than usual | Someone else's crying |
| 11 | I cannot enjoy daily activities; I no longer enjoy my hobbies | I enjoy daily activities; My hobbies are still enjoyable | Not feeling like doing anything overlaps Q15 |
| 12 | I cannot make decisions; I have difficulty making decisions | I can make decisions; I don't have difficulty making decisions | Generic uncertainty alone |
| 13 | My daily work is suffering; I keep neglecting my daily tasks | My daily work is not suffering; My daily tasks don't get neglected | Untidy tent alone |
| 14 | I feel useless; I cannot do anything useful | I can play a useful part in life; I don't feel useless | Inability to carry one item alone |
| 15 | I have lost interest in things; I have no drive to do anything | I have not lost interest in things; I haven't lost my motivation | Inactivity alone overlaps Q11 |
| 16 | I feel worthless; I feel like a complete failure | I am not worthless; My existence has value | Failure to obtain food alone |
| 17 | I want to die; I am thinking about ending my life; I don't want to live anymore | I don't want to die; I am not thinking about ending my life | YES is only a CONFIRM candidate; uncertainty/giving up uses REVIEW |
| 18 | I feel tired all the time; I am always tired | I do not feel tired all the time; I am not always tired | Tired without duration overlaps Q20 |
| 19 | My stomach aches; I have uncomfortable feelings in my stomach | My stomach doesn't ache; My stomach feels comfortable | Cramps overlap Q7; nausea/diarrhea do not imply Q19 |
| 20 | I get tired quickly; I run out of energy after a small task | I don't get tired easily; I am not easily tired | Tired without activity/tendency context overlaps Q18 |

Question anchors reuse the actual `en.ts` canonical/script content, not a second
copy of translated UI text. Selected-language rules are never merged into one
keyword pass. Recognizable language mixing/mismatch remains unresolved, with
credible safety concerns routed to REVIEW. This is conservative marker detection,
not general language detection or automatic translation.

## Q17 verification

Explicit English self-reports and unambiguous canonical question/Yes answers open
CONFIRM without saving YES. Confirmation alone persists through the existing
callback. Dismissal preserves prior answers and leaves capture stopped. Manual and
restored answers retain their authority. Apparent positives against protected
answers open REVIEW, not an overwrite.

`I might want to die`, `I feel like giving up`, `I am tired of living`, conflicting
statements, and the compound English script followed by Yes use REVIEW.
`Pernah nggak kepikiran nyerah? Iya.` also uses REVIEW. A No to that nonspecific
short question does not establish a definitive Q17 NO. Full compound script/No
can supply NO, because it denies both parts of the recognized displayed question.
Question-only speech and unanchored Yes/No do not supply answers.

A definitive denial followed by uncertain positive evidence also opens REVIEW and
preserves the existing answer; it does not save a false NO. Tests exercise this
in both languages. The shared response composable keeps safety handling above
language-specific rule matching. No STT path creates or transmits T0, and manual
T0 remains independent of SRQ completion.

## Commands and actual results

Every Node command below was executed against synthetic fixtures; all passed,
with 0 failed and 0 skipped. Each file was run separately to isolate global
browser/Vue doubles.

| Command | Tests passed |
| --- | ---: |
| `node --experimental-strip-types tests/Node/srqTranscriptInterpreter.test.ts` | 15 |
| `node --experimental-strip-types tests/Node/srqSpeechCoverage.test.ts` | 66 |
| `node --experimental-strip-types tests/Node/srqEnglishSpeechCoverage.test.ts` | 64 |
| `node --experimental-strip-types tests/Node/srqBilingualSpeechLifecycle.test.ts` | 8 |
| `node --experimental-strip-types tests/Node/webSpeechLanguage.test.ts` | 3 |
| `node --experimental-strip-types tests/Node/relawanSrqSafety.test.ts` | 12 |
| `node --experimental-strip-types tests/Node/webSpeechPause.test.ts` | 4 |
| `node --experimental-strip-types tests/Node/srqQuestions.test.ts` | 3 |
| `node --experimental-strip-types tests/Node/srqResponseMap.test.ts` | 2 |
| `node --experimental-strip-types tests/Node/relawanAssessmentUi.test.ts` | 12 |
| `node --experimental-strip-types tests/Node/assessmentCanonicalRegression.test.ts` | 6 |
| `node --experimental-strip-types tests/Node/assessmentHandoff.test.ts` | 2 |
| `node --experimental-strip-types tests/Node/assessmentContract.test.ts` | 13 |
| `node --experimental-strip-types tests/Node/localPwaAssessment.test.ts` | 1 |
| `node --experimental-strip-types tests/Node/assessmentDisclaimer.test.ts` | 1 |
| `node --experimental-strip-types tests/Node/relawanAssessmentPersistence.test.ts` | 6 |
| `node --experimental-strip-types tests/Node/assessmentVersion.test.ts` | 6 |
| `node --experimental-strip-types tests/Node/onlineAssessmentPersistence.test.ts` | 8 |
| `node --experimental-strip-types tests/Node/offlineAssessmentRegression.test.ts` | 8 |
| `node --experimental-strip-types tests/Node/compactAssessmentHeader.test.ts` | 2 |
| `node --experimental-strip-types tests/Node/onlineAssessmentStart.test.ts` | 2 |

Total: **244 tests across 21 files**.

Also executed:

```bash
node --experimental-strip-types --test --test-isolation=none tests/Node/srqTranscriptInterpreter.test.ts tests/Node/srqSpeechCoverage.test.ts tests/Node/srqEnglishSpeechCoverage.test.ts tests/Node/srqBilingualSpeechLifecycle.test.ts tests/Node/relawanSrqSafety.test.ts
./node_modules/.bin/vue-tsc --noEmit
npm run build
git diff --check
```

The combined final SRQ command passed 165 tests (a rerun subset, not extra tests).
Type checking, frontend/PWA build and whitespace check passed. Build warnings:
large chunks and deprecated `inlineDynamicImports`. The build generated ignored
`public/build` assets; this does not prove a browser activated those assets.
Backend tests were not run because no backend/scoring/API/schema files changed.
No dependencies were missing or installed.

Development failures resolved before final verification: strip-only Node rejected
a TypeScript constructor parameter property (replaced with an ordinary explicit
property); an initial mixed-language guard missed `I sleep well` (expanded marker
coverage); one new lifecycle test asserted `abort` on a double whose cleanup API
was `dispose` (corrected assertion to the actual cleanup contract). Original
Indonesian test expectations were preserved.

## Manual browser checkpoint — NOT PERFORMED

Use only synthetic accounts, assessment data and audio. Record exact origin,
browser/version, active service worker and final transcript alongside answer state.
An interpreter result is contingent on what the recognizer actually transcribed.

### English Online

1. Select English UI, Online STT: the spoken-language default should be `en-US`.
   Accept the existing synthetic-testing privacy consent. Inspect that only the
   selected language is shown; browser support is not guaranteed.
2. Say `I have a headache.` and stop: eligible Q1 YES. Say `My appetite is normal.`:
   eligible Q2 NO. Say `I keep waking up at night.`: eligible Q3 YES. Say
   `I don't cry more than usual.`: eligible Q10 NO.
3. Say the displayed Q1 question alone: no selection. Say
   `Do you often have headaches? Yes.` in one session: Q1 YES. A bare `Yes` in
   another recording must remain unresolved.
4. Say `My hands are shaking.`: Q5 only. `I feel anxious.`: Q6 only.
   `My stomach cramps.`: neither Q7 nor Q19. `I am tired.`: neither Q18 nor Q20.
5. Say `I want to die.`: CONFIRM, no saved YES before confirmation. Cancel and
   verify unchanged answers and stopped microphone. Separately confirm a synthetic
   candidate and verify persistence through the existing path; no direct dispatch.
6. Say `I might want to die.`, `I feel like giving up.`, or
   `I don't want to die. I might want to die.`: REVIEW, Q17 preserved.
7. Wait through natural pauses/endpoints: the online session remains English,
   interim text does not answer questions, and Stop produces one final transcript.

### Indonesian Online

1. Keep the English UI and explicitly choose Indonesian speech: display locale
   stays English and microphone language becomes `id-ID` only on a fresh session.
2. Say `Saya males makan.`: Q2 YES. `Saya masih punya nafsu makan.`: Q2 NO.
   `Saya mewek terus.`: Q10 YES. `Saya deg-degan.`: Q6, never Q5.
3. Say `Pernah nggak kepikiran nyerah? Iya.` in one final transcript: REVIEW,
   Q17 unchanged. Its question alone and an unanchored later `Iya` do not answer.
4. Repeat canonical/script checks for all 20, using the prior Indonesian matrix.

### Indonesian Offline

1. Select Offline: status explicitly shows Indonesian only, with no English
   recognition option. Prepare the existing model while connected if necessary.
2. Use an English UI but say `Saya pusing.`: Q1 YES, proving UI language is
   independent of the intended offline speech language at the product level.
3. Once the model is ready, repeat with the browser offline. `Saya capek.` remains
   unresolved; `Saya capek sepanjang hari.` supplies Q18, while
   `Saya gampang capek.` supplies Q20. English offline remains unsupported.

### Session, consent and persistence checks in all supported modes

- During English recording, change only the UI locale: active recognition stays
  English. Its final result still uses English rules. Once idle, a default that
  was not explicitly overridden may follow the new locale.
- Explicitly change spoken language during capture: capture stops, previews clear,
  no old-language final is applied, and a new recording requires another action.
- Switch modes during capture and verify no late result populates answers.
- Verify actual browser unsupported-language, network and permission failures:
  no automatic alternate language, partial answer submission or retry loop. Any
  offline option must clearly be Indonesian-only; manual answers remain available.
- Set Q2 NO manually, then say an appetite-loss statement in either language:
  Q2 stays NO. Explicit manual clearing (`UNANSWERED`) and restored `UNCLEAR` or
  definitive answers stay protected. A restored eligible `UNANSWERED` can fill.
- Reload a synthetic draft after accepted answers and confirm local persistence.
  Verify server synchronization separately; local saving does not prove sync.
- Exercise existing lock/unlock/owner boundaries and manual T0 availability without
  altering clinical controls. These are browser checks, not established by mocks.

## Final diff review and limitations

Reviewed all bilingual source/test diffs, the earlier Indonesian working changes,
and the complete working-tree inventory. Verified unrelated `scripts/c2` content
against hashes captured before this task: unchanged. English content is reused from
`en.ts`; translated question/script text, scoring, SRQ answer maps, drafts, sync and
T0 transport are not replaced. No remote provider/model or backend contract added.

The English matcher uses complete supported statements; it cannot recover bad
transcription, establish speaker identity, translate mixed-language interviews,
resolve every discourse-level negation, or safely accept every paraphrase. Exact
script anchors tolerate punctuation/case/contraction normalization but arbitrary
rewording may remain unresolved. Quoted/reported speech can conservatively suppress
other statements in the same transcript. Speech describing symptoms does not
establish their cause or a diagnosis. Real browser language availability, microphone
accuracy, spontaneous restarts, service-worker activation and live
Offline→server→Healthcare behavior still require manual evidence.

Diff artifacts supplied with the handoff: an incremental bilingual diff relative
to the previous local SRQ checkpoint, and a cumulative SRQ diff including the prior
Indonesian changes. Both omit unrelated `scripts/c2` work. Next checkpoint: the
owner/Antigravity browser matrix above; code-level PASS is not browser acceptance.
