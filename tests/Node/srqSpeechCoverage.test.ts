import assert from "node:assert/strict";
import test from "node:test";
import { srqQuestions } from "../../resources/js/domain/srq/srqQuestions.ts";
import { interpretSrqTranscript, normalizeSrqTranscript, selectSrqSpeechAnswerUpdates } from "../../resources/js/domain/srq/srqTranscriptInterpreter.ts";
import { srqSpeechCases } from "./helpers/srqSpeechCases.ts";

function expectAnswer(text: string, number: number, answer: boolean) {
    const matches = interpretSrqTranscript(text).matches;
    assert.deepEqual(matches.map(item => [item.questionNumber, item.status, item.answer]), [[number, "matched", answer]], text);
}

for (const item of srqSpeechCases) {
    const question = srqQuestions[item.number - 1];
    test(`Q${item.number}: canonical and conversational survivor statements`, () => {
        for (const phrase of [item.yes, ...item.informalYes]) expectAnswer(phrase, item.number, true);
        for (const phrase of [item.no, item.informalNo]) expectAnswer(phrase, item.number, false);
        assert.ok(!interpretSrqTranscript(item.ambiguous).matches.some(match => match.questionNumber === item.number), item.ambiguous);
    });
    test(`Q${item.number}: actual canonical and displayed script anchors, punctuation and aliases`, () => {
        for (const anchor of [question.question, question.script]) {
            for (const wording of [anchor, anchor.toUpperCase().replace(/[^\p{L}\p{N}\s/-]/gu, " "), anchor.replace(/Ibu\/Bapak|Sdr/g, "Ibu")]) {
                const onlyQuestion = interpretSrqTranscript(wording);
                assert.deepEqual(onlyQuestion.matches, [], wording);
                assert.equal(onlyQuestion.requiresSafetyReview, false, wording);
                for (const response of ["Iya", "Tidak"]) {
                    const text = `${wording} ${response}`;
                    if (item.number === 17 && anchor === question.script && response === "Iya") {
                        assert.deepEqual(interpretSrqTranscript(text).matches, [], text);
                        assert.equal(interpretSrqTranscript(text).requiresSafetyReview, true, text);
                    } else expectAnswer(text, item.number, response === "Iya");
                }
            }
        }
    });
    test(`Q${item.number}: ownership of manual/restored states and unanswered eligibility`, () => {
        const interpretation = interpretSrqTranscript(item.yes);
        for (const answer of [true, false, "UNCLEAR", "UNANSWERED"] as const) {
            const result = selectSrqSpeechAnswerUpdates(interpretation, { [item.number]: answer }, new Set(), new Set([item.number]));
            assert.deepEqual(result.accepted, []);
            assert.deepEqual(result.protectedQuestionNumbers, [item.number]);
            if (answer !== "UNANSWERED") assert.deepEqual(selectSrqSpeechAnswerUpdates(interpretation, { [item.number]: answer }, new Set(), new Set()).accepted, []);
        }
        for (const answers of [{}, { [item.number]: "UNANSWERED" as const }])
            assert.deepEqual(selectSrqSpeechAnswerUpdates(interpretation, answers, new Set(), new Set()).accepted, [{ questionNumber: item.number, answer: true }]);
    });
}

test("normalization handles accents, informal spelling and repeated spacing", () => {
    assert.equal(normalizeSrqTranscript("  AKU  GAK  PENGEN dég-dégan; tangan gemeter  "), "aku tidak ingin deg degan; tangan gemetar");
});

test("negation, contradictions, uncertainty, quotation and third parties never manufacture YES", () => {
    for (const phrase of ["Saya tidak tidak sakit kepala", "Saya bukan tidak sakit kepala", "Saya mungkin pusing", "Teman saya pusing", "Dia merasa saya sering sakit kepala", "Saya merasa tangan saya tidak berguna", "Saya merasa perut saya perih bukan kepala", "Dia: Apakah Sdr sering sakit kepala? Iya", "Dia menanyakan apakah Sdr sering sakit kepala? Iya", 'Dia bilang "saya sering sakit kepala"', "Apakah saya sering sakit kepala?", "Saya pusing? Saya tidur nyenyak."]) {
        assert.ok(!interpretSrqTranscript(phrase).matches.some(item => item.questionNumber === 1), phrase);
    }
    for (const phrase of ["Saya sering sakit kepala, tetapi sebenarnya tidak sakit kepala", "Saya sering sakit kepala tetapi saya tidak sakit kepala", "Saya pusing. Saya tidak pusing."]) {
        const q1 = interpretSrqTranscript(phrase).matches.find(item => item.questionNumber === 1);
        assert.equal(q1?.status, "conflicting", phrase);
        assert.equal(q1?.answer, undefined, phrase);
    }
});

test("overlapping symptoms remain unresolved and explicit distinctions remain separate", () => {
    for (const phrase of ["Saya capek", "Saya perut melilit", "Saya malas ngapa-ngapain", "Saya malas semua"])
        assert.deepEqual(interpretSrqTranscript(phrase).matches, [], phrase);
    expectAnswer("Saya deg-degan", 6, true);
    expectAnswer("Saya mual", 7, true);
    expectAnswer("Saya nyeri ulu hati", 19, true);
    expectAnswer("Saya capek sepanjang hari", 18, true);
    expectAnswer("Saya gampang capek", 20, true);
});

test("multiple local question/answer pairs and independent statements preserve association", () => {
    for (const text of [
        `${srqQuestions[0].script} Iya. ${srqQuestions[2].script} Tidak.`,
        "Apakah Ibu sering sakit kepala iya apakah Bapak sulit tidur tidak",
        "Saya pusing saya tidak susah tidur",
    ]) assert.deepEqual(interpretSrqTranscript(text).matches.map(item => [item.questionNumber, item.answer]), [[1, true], [3, false]], text);
    assert.deepEqual(interpretSrqTranscript("Iya").matches, []);
    assert.deepEqual(interpretSrqTranscript("Apakah Anda sering sakit kepala atau sulit tidur iya").matches, []);
});

test("Q17 concern requires review without a definitive answer; no cross-recording association", () => {
    for (const phrase of ["Saya capek hidup", "Saya ingin nyerah", "Saya mungkin ingin mengakhiri hidup", 'Dia bilang "saya ingin mati"', "Saya tidak tidak ingin mati", "Saya ingin mati tetapi saya tidak ingin mati"]) {
        const result = interpretSrqTranscript(phrase);
        assert.equal(result.requiresSafetyReview, true, phrase);
        assert.ok(!result.matches.some(item => item.status === "matched" && item.questionNumber === 17), phrase);
    }
    for (const phrase of ["Saya takut mati", srqQuestions[16].question, "Orang lain ingin mati", "Mau mati"]) assert.deepEqual(interpretSrqTranscript(phrase).matches, [], phrase);
    interpretSrqTranscript(srqQuestions[0].script);
    assert.deepEqual(interpretSrqTranscript("Iya").matches, []);
});


test("canonical negated symptom descriptions retain NO polarity", () => {
    for (const [number, phrase] of [
        [2, "Saya nafsu makan tidak menurun"],
        [3, "Saya bisa tidur nyenyak"],
        [4, "Saya tidak mudah merasa takut"],
        [8, "Saya tidak mengalami kesulitan untuk berpikir jernih"],
        [11, "Saya tidak sulit menikmati kegiatan sehari-hari"],
        [14, "Saya bisa melakukan hal yang bermanfaat dalam hidup"],
        [18, "Saya tidak merasa lelah sepanjang waktu"],
        [19, "Saya tidak merasakan perasaan tidak nyaman di perut"],
    ] as const) expectAnswer(phrase, number, false);
});
