import assert from "node:assert/strict";
import test from "node:test";
import {
    interpretSrqTranscript,
    selectSrqSpeechAnswerUpdates,
    type SrqTranscriptInterpretation,
} from "../../resources/js/domain/srq/srqTranscriptInterpreter.ts";

function answerFor(
    transcript: string,
    questionNumber: number,
): boolean | undefined {
    const match = interpretSrqTranscript(transcript).matches.find(
        (item) => item.questionNumber === questionNumber,
    );
    return match?.status === "matched" ? match.answer : undefined;
}

test("question-only text does not answer Q1", () => {
    assert.equal(answerFor("Apakah Anda sering sakit kepala?", 1), undefined);
});

test("first-person Q1 statements preserve positive and negative polarity", () => {
    assert.equal(answerFor("Saya sering sakit kepala.", 1), true);
    assert.equal(answerFor("Saya tidak sakit kepala.", 1), false);
});

test("a recognized question can use its local direct response", () => {
    assert.equal(answerFor("Apakah Anda sering sakit kepala? Iya.", 1), true);
    assert.equal(
        answerFor("Apakah Anda sering sakit kepala? Tidak.", 1),
        false,
    );
});

test("a comma-containing canonical question keeps its local direct response", () => {
    const question = "Apakah Anda merasa cemas, tegang, atau khawatir?";
    assert.equal(answerFor(`${question} Iya.`, 6), true);
    assert.equal(answerFor(`${question} Tidak.`, 6), false);
});

const canonicalQuestions = [
    "Apakah sering merasa sakit kepala?",
    "Apakah nafsu makan menurun?",
    "Apakah sulit tidur nyenyak?",
    "Apakah mudah merasa takut?",
    "Apakah tangan terasa gemetar?",
    "Apakah merasa cemas, tegang, atau khawatir?",
    "Apakah pencernaan terasa buruk?",
    "Apakah sulit berpikir jernih?",
    "Apakah merasa tidak bahagia?",
    "Apakah lebih sering menangis?",
    "Apakah sulit menikmati kegiatan sehari-hari?",
    "Apakah kesulitan mengambil keputusan?",
    "Apakah hasil kerja atau tugas posko terganggu?",
    "Apakah merasa tidak mampu berbuat hal bermanfaat?",
    "Apakah kehilangan minat total pada berbagai hal?",
    "Apakah merasa diri tidak berharga atau gagal?",
    "Apakah memiliki pemikiran untuk mengakhiri hidup?",
    "Apakah merasa lelah sepanjang waktu?",
    "Apakah merasakan tidak nyaman di perut/ulu hati?",
    "Apakah mudah merasa lelah?",
] as const;

test("all canonical SRQ questions support an anchored YA or TIDAK response", () => {
    canonicalQuestions.forEach((question, index) => {
        const questionNumber = index + 1;
        assert.equal(
            answerFor(`${question} Iya.`, questionNumber),
            true,
            `Q${questionNumber} YA`,
        );
        assert.equal(
            answerFor(`${question} Tidak.`, questionNumber),
            false,
            `Q${questionNumber} TIDAK`,
        );
    });
});

test("a bare direct response stays unresolved", () => {
    const interpretation = interpretSrqTranscript("Iya.");
    assert.equal(interpretation.matches.length, 0);
    assert.equal(interpretation.unresolved[0]?.reason, "unanchored_response");
});

test("one transcript can produce multiple independent answers", () => {
    const interpretation = interpretSrqTranscript(
        "saya sering sakit kepala, saya susah tidur, saya merasa takut dan khawatir, saya sering menangis, saya tidak berguna, saya tidak ingin mati",
    );
    const answers = Object.fromEntries(
        interpretation.matches.map((match) => [
            match.questionNumber,
            match.answer,
        ]),
    );
    assert.deepEqual(answers, {
        1: true,
        3: true,
        4: true,
        6: true,
        10: true,
        14: true,
        17: false,
    });
});

test("an unspecific tired statement does not set Q18 or Q20", () => {
    const interpretation = interpretSrqTranscript("Saya lelah.");
    assert.equal(answerFor("Saya lelah.", 18), undefined);
    assert.equal(answerFor("Saya lelah.", 20), undefined);
    assert.deepEqual(interpretation.unresolved[0]?.questionNumbers, [18, 20]);
});

test("Q17 affirmative phrases are recognized explicitly", () => {
    for (const phrase of [
        "Saya ingin mati.",
        "Saya mau mati.",
        "Lebih baik saya mati saja.",
        "Saya ingin bunuh diri.",
        "Saya ingin mengakhiri hidup.",
        "Saya tidak mau hidup lagi.",
    ]) {
        assert.equal(answerFor(phrase, 17), true, phrase);
    }
});

test("Q17 explicit negative phrases do not become affirmative", () => {
    for (const phrase of [
        "Saya tidak ingin mati.",
        "Saya tidak mau mati.",
        "Saya tidak ingin bunuh diri.",
        "Saya tidak mau bunuh diri.",
    ]) {
        assert.equal(answerFor(phrase, 17), false, phrase);
    }
});

test("Q17 non-self-report and interviewer wording do not become affirmative", () => {
    for (const phrase of [
        "Saya takut mati.",
        "Apakah Anda ingin mati?",
        "Orang lain ingin mati.",
    ]) {
        assert.notEqual(answerFor(phrase, 17), true, phrase);
    }
});

test("contradictory Q17 evidence requires review and produces no answer", () => {
    const interpretation = interpretSrqTranscript(
        "Saya ingin mati, saya tidak ingin mati.",
    );
    const q17 = interpretation.matches.find(
        (match) => match.questionNumber === 17,
    );
    assert.equal(q17?.status, "conflicting");
    assert.equal(q17?.answer, undefined);
    assert.equal(interpretation.requiresSafetyReview, true);
});

test("ownership filtering distinguishes manual, STT-owned, and restored answers", () => {
    const interpretation: SrqTranscriptInterpretation = interpretSrqTranscript(
        "Saya sering sakit kepala, saya susah tidur, saya merasa takut.",
    );
    const result = selectSrqSpeechAnswerUpdates(
        interpretation,
        { 1: false, 3: false, 4: false },
        new Set([3]),
        new Set([1]),
    );

    assert.deepEqual(result.accepted, [
        { questionNumber: 3, answer: true },
    ]);
    assert.deepEqual(result.protectedQuestionNumbers, [1, 4]);
});

test("affirmative Q17 remains identifiable when its existing answer is protected", () => {
    const interpretation = interpretSrqTranscript("Saya ingin mati.");
    const result = selectSrqSpeechAnswerUpdates(
        interpretation,
        { 17: false },
        new Set(),
        new Set(),
    );

    assert.equal(
        interpretation.matches.find(
            ({ questionNumber }) => questionNumber === 17,
        )?.answer,
        true,
    );
    assert.deepEqual(result.accepted, []);
    assert.deepEqual(result.protectedQuestionNumbers, [17]);
});
