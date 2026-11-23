# SRQ speech interpretation checkpoint — 15 November 2026

Status: implemented; automated checks passed. Browser, microphone, deployed PWA,
and clinical acceptance are NOT TESTED by this checkpoint.

## Root cause and scope

The displayed `keywords` and `script` in `srqQuestions.ts` were not the operational
speech vocabulary. Interpretation used a separate regex list, plus exact canonical
question anchors. Most conversational scripts were absent from those anchors.
Normalization covered informal negation and YA but missed spellings such as
`males`, `gemeter`, accented `dég-dégan`, and question subject variations.
Some answer expressions matched substrings before checking interviewer/reported
speech. This also risked treating a qualified statement as definitive evidence.

The change uses whole self-report expressions, derives complete canonical/script
anchors from the existing content, and checks local response association before
symptom interpretation. Punctuation-free local question/answer pairs and multiple
independent statements remain supported. Question context is confined to one final
transcript; there is no cross-recording memory.

Sources inspected: all 20 canonical questions, scripts, instructions and keywords;
the operational rules/interpreter; response and speech composables; SRQ page wiring;
existing Node regressions; `docs/workflow.md` content contract;
`RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md` safety overrides; and
`RAPID_MIND_T0_EMERGENCY_INTERACTION.md` STT review requirements.

## Audit and operational coverage

Examples below are synthetic. Normally prepend `Saya` to symptom fragments;
whole short responses can omit it except Q17. Existing supported phrases are
retained alongside the additions. Every item has tests for affirmative/negative
self-reports, conversational variants, canonical and actual script question-only
text, local YA/TIDAK, case/punctuation/subject variants, unsupported evidence,
manual protection, restored definitive answers, and eligible `UNANSWERED` states.

All complete displayed scripts now anchor their own question. A script alone
never supplies an answer. The compound Q17 script uses REVIEW for bare YA; TIDAK supports NO.

| Q | Original gap / vocabulary mismatch | Supported or improved affirmative variants | Negative handling examples | Ambiguity / intentionally excluded evidence |
| --- | --- | --- | --- | --- |
| 1 | `cekot-cekot` absent; script absent | pusing; sakit kepala; cekot-cekot; kepala terasa berat | tidak sakit kepala; gak pusing; kepala tidak berat | heat/dehydration cause not inferred; question-only excluded |
| 2 | `males`, `selera`, canonical decline incomplete | males/malas makan; gak nafsu/selera makan; nafsu makan menurun | masih punya nafsu makan; gak malas makan; nafsu makan tidak menurun | food dislike or unsuitable food alone excluded |
| 3 | insomnia already supported; scripts/negatives incomplete | insomnia; susah tidur; gak bisa tidur; kebangun-bangun | tidur nyenyak; bisa tidur nyenyak; gak susah tidur | noisy/hot shelter alone excluded |
| 4 | `gampang` not normalized; worry overlaps Q6 | takut; was-was/waswas; gampang kaget | tidak mudah merasa takut; gak sering takut | takut mati excluded; khawatir belongs to Q6 |
| 5 | `tremor` absent; metadata misleadingly lists dég-dégan | tangan gemeter/gemetar; tangan tremor | tangan saya gak gemeter | bare tremor lacks hand context; deg-degan never Q5 |
| 6 | deg-degan absent despite script/guidance | cemas; gelisah; kawatir/khawatir; dég-dégan/degdegan; debar-debar | tidak merasa cemas; gak gelisah; tidak deg-degan | dada sesek alone excluded; no Q5 inference |
| 7 | abbreviated pencernaan metadata not a safe substring rule | mual; diare; gangguan pencernaan; pencernaan buruk | gak mual; tidak diare; pencernaan baik | perut melilit unresolved Q7/Q19 |
| 8 | `gak fokus` absent; generic bingung unsafe | linglung; susah fokus/konsentrasi; gak fokus; mengalami kesulitan berpikir jernih | gak linglung; bisa fokus/berpikir jernih | bingung alone does not distinguish decisions from clarity |
| 9 | informal negation partially normalized; scripts absent | sedih; hampa; gak bahagia; merana | bahagia; gak sedih/hampa | uncertain sadness stays unresolved |
| 10 | `nangis`, `pengen`, `mewek` absent | nangis terus; pengen nangis; mewek terus; lebih sering menangis | tidak sering menangis; gak mewek | child's/third-party crying excluded |
| 11 | metadata's generic inactivity overlaps Q15 | sulit menikmati kegiatan; hobi gak seru/menarik lagi | menikmati kegiatan; masih menikmati kegiatan; tidak sulit menikmati kegiatan | malas ngapa-ngapain unresolved Q11/Q15 |
| 12 | `milih`, `mutusin` absent | bingung milih; gak bisa mutusin; sulit mengambil keputusan | gak bingung milih; bisa mutusin; tidak sulit mengambil keputusan | generic ragu or bingung excluded |
| 13 | canonical deterioration and colloquial tasks incomplete | hasil kerja sehari-hari memburuk; tugas terbengkalai; lambat ngerjain tugas | tugas gak terbengkalai; hasil kerja tidak memburuk | an uncared-for tent alone does not establish survivor function |
| 14 | `nyusahin` and canonical inability incomplete | gak berguna; nyusahin orang; tidak bisa melakukan hal yang bermanfaat | berguna; bisa melakukan hal yang bermanfaat; gak merepotkan orang lain | broad incomplete phrases excluded; no Q16 inference |
| 15 | `gak ada semangat` absent; inactivity overlaps Q11 | kehilangan minat/semangat; gak ada semangat | masih punya minat; gak kehilangan minat | malas semua unresolved Q11/Q15 |
| 16 | self-devaluation variants incomplete | gak berharga; diri ini gagal; gak ada artinya | berharga; gak gagal | failure to obtain an item is not self-devaluation |
| 17 | broad metadata (`nyerah`, `mati`) not definitive | explicit ingin/mau mati, bunuh diri, mengakhiri hidup; gak mau hidup lagi; memiliki pemikiran untuk mengakhiri hidup | gak mau bunuh diri; tidak ingin mengakhiri hidup | apparent YES requires CONFIRM; compound script YA, capek hidup, nyerah, uncertain/contradictory/quoted concern use REVIEW; takut mati never YES |
| 18 | metadata's `capek banget`, `badan lemes` lacks duration | capek sepanjang hari; lemes terus menerus; lelah sepanjang waktu | gak capek sepanjang hari; tidak merasa lelah sepanjang waktu | capek/lelah/lemas alone unresolved Q18/Q20 |
| 19 | abdominal discomfort and metadata variants incomplete | perut gak enak; perih perut; ulu hati sakit; perasaan tidak nyaman di perut | perut gak perih; perut nyaman; tidak merasakan perasaan tidak nyaman di perut | melilit unresolved Q7/Q19; mual/diare not Q19 |
| 20 | `cepet` and brief-activity descriptions incomplete | gampang capek; cepet lelah; baru gerak sebentar langsung kehabisan tenaga | gak gampang capek; tidak mudah merasa lelah | tenaga habis or capek without activity/tendency context excluded |

The metadata remains unchanged because it is authoritative displayed content
covered by the workflow contract. It is not used as a keyword-to-YES lookup.
In particular, the misleading Q5 `dég-dégan` metadata and broad Q17 words are
explicitly excluded from automatic interpretations for those questions.
These rules do not establish a symptom's cause, diagnosis, or clinical score.

## Files changed

- `resources/js/domain/srq/srqSpeechContext.ts`: normalization and complete question/script anchors.
- `resources/js/domain/srq/srqSpeechRules.ts`: bounded question-specific positive/negative self-reports.
- `resources/js/domain/srq/srqTranscriptInterpreter.ts`: question association, statement boundaries, ambiguity/conflict/reporting guards, and Q17 review signals.
- `resources/js/composables/useSrqResponses.ts`: mixed Q17 uncertainty prioritizes REVIEW; feedback distinguishes filled, protected and unresolved results.
- `tests/Node/helpers/srqSpeechCases.ts`: reusable synthetic examples for all 20 questions.
- `tests/Node/srqSpeechCoverage.test.ts`: all-question coverage and interpreter safety regressions.
- `tests/Node/relawanSrqSafety.test.ts`: real response-composable ownership, persistence callbacks, Q17 review and feedback regressions.
- This report: audit matrix, verification evidence and manual checklist.

## Verification actually executed

Focused final command:

```bash
node --experimental-strip-types --test --test-isolation=none tests/Node/srqTranscriptInterpreter.test.ts tests/Node/srqSpeechCoverage.test.ts tests/Node/relawanSrqSafety.test.ts
```

PASS: 93 tests (15 original interpreter, 66 coverage, 12 composable/safety).
No skipped tests. Existing expectations were not rewritten.

Each command below was executed separately, with PASS and no skipped tests:

| Command | Tests passed |
| --- | ---: |
| `node --experimental-strip-types tests/Node/srqQuestions.test.ts` | 3 |
| `node --experimental-strip-types tests/Node/srqResponseMap.test.ts` | 2 |
| `node --experimental-strip-types tests/Node/webSpeechPause.test.ts` | 4 |
| `node --experimental-strip-types tests/Node/relawanAssessmentUi.test.ts` | 11 |
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

Related regression total: 75; combined with focused coverage: 168 distinct tests.

- `./node_modules/.bin/vue-tsc --noEmit`: PASS.
- `npm run build`: PASS, including PWA service-worker generation. Warnings: large chunks and deprecated `inlineDynamicImports`. Generated `public/build` assets are ignored by Git; a build is not proof that a browser activated those assets.
- `git diff --check`: PASS.
- Read-only `git status`, `git branch --show-current`, `git diff`, `git diff --stat` and `git diff --numstat` inspected. Existing unrelated `scripts/c2` changes preserved.

Development failures were corrected before the final run: the initial original
interpreter run was 14/15 (clause splitting broke “Lebih baik saya mati saja”);
the initial new coverage run was 55/65 (missing canonical phrases and multiple
unpunctuated question pairs); one intermediate combined run failed to parse an
unescaped slash in a normalization regex. Subsequent focused runs passed first
92, then 93 tests as additional safety coverage was added. Standalone interpreter
and coverage commands were also run successfully during development. No remaining
known failing automated case in this checkpoint.

Backend tests were not run: no backend/schema/API/scoring files changed.
No dependencies installed, upgraded or removed; no lockfile changes.
No Docker/database/reset/seeding operations, Git mutations, GitHub changes,
remote interpretation service or additional clinical-data transmission introduced.

## Manual browser verification — NOT PERFORMED

Use synthetic data and a synthetic Relawan assessment. Record browser, exact origin,
served asset version and active service worker. Do not use real survivor audio.
Apply the checklist independently to both modes:

1. Offline Whisper: prepare its existing model, record and stop; inspect the actual
   final transcript. Once the model is available, also repeat with the browser offline.
2. Online Web Speech: grant the existing synthetic-testing privacy consent; start
   and stop recording. Verify interim text does not select answers and inspect the
   actual final transcript. A question and response split into separate FINAL
   events intentionally do not share context.
3. Start each independent case with an eligible empty/restored `UNANSWERED` item.
   Existing manual/restored answers can intentionally prevent automatic filling.

| Exact synthetic phrase / action | Expected result in either mode |
| --- | --- |
| `Saya males makan.` | Q2 YES |
| `Saya masih punya nafsu makan.` | Q2 NO on an eligible item |
| `Saya mewek terus.` | Q10 YES |
| `Saya tidak sering menangis.` | Q10 NO on an eligible item |
| `Tangan saya gemeter.` | Q5 YES, no Q6 from this alone |
| `Saya deg-degan.` | Q6 YES, no Q5 |
| `Saya mual.` | Q7 YES, no Q19 |
| `Saya nyeri ulu hati.` | Q19 YES, no Q7 |
| `Saya capek.` | Neither Q18 nor Q20; clarification feedback |
| `Saya capek sepanjang hari.` | Q18 YES only |
| `Saya gampang capek.` | Q20 YES only |
| `Saya perut melilit.` | Neither Q7 nor Q19 |
| `Saya malas ngapa-ngapain.` | Neither Q11 nor Q15 |
| `Apakah Ibu sering sakit kepala?` | No selection |
| `Apakah Ibu sering sakit kepala? Iya.` in one final transcript | Q1 YES |
| `Selama di posko ini, kepala Ibu/Bapak sering terasa berat, cekot-cekot, atau pusing berulang nggak? Tidak.` | Q1 NO |
| `Saya sering sakit kepala, tetapi sebenarnya tidak sakit kepala.` | Q1 unchanged; contradiction feedback |
| `Saya takut mati.` | Q17 unchanged, no YES |
| `Saya ingin mengakhiri hidup.` | Pause speech and CONFIRM; no Q17 YES saved before confirmation |
| Cancel that Q17 confirmation | Prior answer preserved; no T0 created/sent; microphone stays stopped |
| Explicitly confirm that Q17 candidate | Q17 YES saved through existing confirmation path; no direct STT dispatch |
| `Saya capek hidup.` | REVIEW, Q17 unchanged |
| `Saya ingin mati. Saya mungkin tidak ingin mati.` | REVIEW, Q17 unchanged |
| Full displayed Q17 script followed by `Iya` | REVIEW, Q17 unchanged |
| Q1 question in one recording, `Iya` in another | No inferred cross-recording Q1 answer |
| `Saya pusing. Saya tidak susah tidur.` | Eligible Q1 YES, Q3 NO |
| Manually set Q2 NO, then say `Saya males makan.` | Q2 stays NO; preserved-answer feedback |
| Explicitly clear Q2 manually, then say `Saya males makan.` | Manual `UNANSWERED` remains protected |
| Restore an `UNANSWERED` Q2 draft, then say `Saya males makan.` | Q2 YES; save through existing draft callback |
| Restore Q2 NO or UNCLEAR, then say `Saya males makan.` | Restored answer preserved |

Repeat canonical and full displayed script YA/TIDAK checks for all 20 using the
coverage matrix and actual script text. Reload the synthetic draft and verify
accepted answers persist; distinguish local persistence from server synchronization.
Inspect Healthcare visibility only in an authorized integration checkpoint.

## Final review and remaining limits

Reviewed the changed source/tests and the complete working-tree diff inventory.
Ownership filtering remains intact; `UNCLEAR`, manual overrides and restored
definitive answers cannot be overwritten by STT. Q17 YES still goes through explicit
human confirmation, and uncertain Q17 evidence takes priority over confirmation.
The existing online/offline callbacks still use the same response composable.
No scoring, draft schema, sync contract, backend, clinical transitions or T0
transport was changed. Feedback reports actual fills/protected/unresolved results
and no longer states that a human has already reviewed the transcript.

Deterministic text rules cannot recover mistranscribed audio, establish reliable
speaker identity, determine clinical cause, infer sarcasm, resolve all discourse
negation, or recognize every paraphrase. Complete scripts tolerate normalization
and punctuation changes, not arbitrary deleted/reordered words. Unknown/qualified
self-reports are conservatively left unresolved; quoting/reporting indicators can
suppress otherwise valid speech in the same final transcript. Ambiguous safety
language may deliberately trigger extra REVIEW. No microphone/browser accuracy or
live offline→server→Healthcare acceptance is established by these tests.

No demo shortcut added. Suggested next checkpoint: owner/Antigravity browser checks
above for both speech modes, with final-transcript and answer-state evidence.
