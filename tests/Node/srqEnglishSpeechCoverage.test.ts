import assert from "node:assert/strict";
import test from "node:test";
import { interpretSrqTranscript, selectSrqSpeechAnswerUpdates } from "../../resources/js/domain/srq/srqTranscriptInterpreter.ts";
import { srqEnglishQuestions } from "../../resources/js/domain/srq/srqEnglishSpeechContext.ts";
import { srqEnglishSpeechCases } from "./helpers/srqEnglishSpeechCases.ts";

function expectAnswer(text: string, number: number, answer: boolean) {
    const result = interpretSrqTranscript(text, "en-US");
    assert.deepEqual(result.matches.map(item => [item.questionNumber, item.status, item.answer]), [[number, "matched", answer]], text);
}
for (const item of srqEnglishSpeechCases) {
    const content = srqEnglishQuestions[item.number - 1];
    test(`English Q${item.number}: canonical, conversational, negative and ambiguous self-reports`, () => {
        for (const text of [item.yes, item.informalYes]) expectAnswer(text, item.number, true);
        for (const text of [item.no, item.informalNo]) expectAnswer(text, item.number, false);
        assert.deepEqual(interpretSrqTranscript(item.ambiguous, "en-US").matches, [], item.ambiguous);
        const conflict = interpretSrqTranscript(`${item.yes}. ${item.no}.`, "en-US");
        assert.equal(conflict.matches[0]?.status, "conflicting");
        assert.equal(conflict.matches[0]?.answer, undefined);
        assert.deepEqual(selectSrqSpeechAnswerUpdates(conflict, {}, new Set(), new Set()).accepted, []);
    });
    test(`English Q${item.number}: actual question/script anchors and punctuation-free responses`, () => {
        for (const [kind, text] of [["canonical", content.question], ["script", content.script]]) {
            for (const question of [text, text.toUpperCase().replace(/[^a-zA-Z0-9\s]/g, " ")]) {
                const onlyQuestion = interpretSrqTranscript(question, "en-US");
                assert.deepEqual(onlyQuestion.matches, [], question);
                assert.equal(onlyQuestion.requiresSafetyReview, false);
                for (const answer of [true, false]) {
                    const transcript = `${question} ${answer ? "Yes" : "No"}`;
                    if (item.number === 17 && kind === "script" && answer) {
                        const result = interpretSrqTranscript(transcript, "en-US");
                        assert.deepEqual(result.matches, []);
                        assert.equal(result.requiresSafetyReview, true);
                    } else expectAnswer(transcript, item.number, answer);
                }
            }
        }
    });
    test(`English Q${item.number}: manual/restored ownership remains language independent`, () => {
        const result = interpretSrqTranscript(item.yes, "en-US");
        for (const answer of [true, false, "UNCLEAR", "UNANSWERED"] as const) {
            assert.deepEqual(selectSrqSpeechAnswerUpdates(result, { [item.number]: answer }, new Set(), new Set([item.number])).accepted, []);
            if (answer !== "UNANSWERED") assert.deepEqual(selectSrqSpeechAnswerUpdates(result, { [item.number]: answer }, new Set(), new Set()).accepted, []);
        }
        assert.deepEqual(selectSrqSpeechAnswerUpdates(result, { [item.number]: "UNANSWERED" }, new Set(), new Set()).accepted, [{ questionNumber: item.number, answer: true }]);
    });
}

test("English clauses preserve local association and negation without cross-recording guesses", () => {
    expectAnswer("I have lost my appetite", 2, true);
    expectAnswer("I keep waking up at night", 3, true);
    expectAnswer("I am thinking about ending my life", 17, true);
    for (const text of ["Yes", "No", "I might have headaches", "I do not not have headaches", "He said I have headaches", 'She said "I want to die"', "I have a headache?", "I am afraid of dying"])
        assert.deepEqual(interpretSrqTranscript(text, "en-US").matches, [], text);
    const conflict = interpretSrqTranscript("I have headaches but actually do not have headaches", "en-US");
    assert.equal(conflict.matches[0]?.status, "conflicting");
    const multi = interpretSrqTranscript(`${srqEnglishQuestions[0].script} Yes ${srqEnglishQuestions[2].question} No`, "en-US");
    assert.deepEqual(multi.matches.map(item => [item.questionNumber, item.answer]), [[1, true], [3, false]]);
    interpretSrqTranscript(srqEnglishQuestions[0].question, "en-US");
    assert.deepEqual(interpretSrqTranscript("Yes", "en-US").matches, []);
});

test("Q17 uncertainty, giving up and shortened Indonesian question use review", () => {
    for (const text of ["I might want to die", "I feel like giving up", "I am tired of living", "I want to die but I do not want to die", "Have you felt like giving up? Yes"])
        assert.equal(interpretSrqTranscript(text, "en-US").requiresSafetyReview, true, text);
    for (const text of ["Pernah nggak kepikiran nyerah? Iya.", "pernah gak kepikiran nyerah iya"]) {
        const result = interpretSrqTranscript(text, "id-ID");
        assert.deepEqual(result.matches, []);
        assert.equal(result.requiresSafetyReview, true, text);
    }
    assert.deepEqual(interpretSrqTranscript("Pernah nggak kepikiran nyerah? Tidak.", "id-ID").matches, []);
});

test("selected language rejects mixed or mismatched transcripts instead of merging rules", () => {
    for (const language of ["id-ID", "en-US"] as const) {
        assert.deepEqual(interpretSrqTranscript("Saya pusing. I sleep well.", language).matches, []);
        assert.deepEqual(interpretSrqTranscript("Saya tidak want to die", language).matches, []);
        const safety = interpretSrqTranscript("Saya pusing. I don't want to live anymore.", language);
        assert.deepEqual(safety.matches, []);
        assert.equal(safety.requiresSafetyReview, true);
    }
    assert.deepEqual(interpretSrqTranscript("I have headaches", "id-ID").matches, []);
    assert.deepEqual(interpretSrqTranscript("Saya pusing", "en-US").matches, []);
    expectAnswer("I don't cry more than usual", 10, false);
});


test("common English progressive and canonical paraphrases retain their question and polarity", () => {
    for (const [number, yes, no] of [
        [3, "I don't sleep well", "I don't sleep badly"],
        [4, "I am easily scared", "I am not easily scared"],
        [5, "My hands are shaking", "My hands aren't shaking"],
        [7, "I have poor digestion", "I don't have poor digestion"],
        [9, "I am unhappy", "I am happy"],
        [11, "I don't enjoy daily activities", "I enjoy daily activities"],
        [12, "I have difficulty making decisions", "I don't have difficulty making decisions"],
        [13, "My daily work is getting worse", "My daily work is not getting worse"],
        [15, "I have lost interest in everything", "I still have interest in things"],
        [17, "I am thinking of ending my life", "I am not thinking of ending my life"],
        [18, "I am always tired", "I am not always tired"],
    ] as const) {
        expectAnswer(yes, number, true);
        expectAnswer(no, number, false);
    }
    expectAnswer("Do you want to die? Yes", 17, true);
    expectAnswer("Do you want to die? No", 17, false);
    assert.deepEqual(interpretSrqTranscript("Do you want to die?", "en-US").matches, []);
});

test("late English qualifications invalidate earlier definitive evidence and require Q17 review", () => {
    for (const text of ["I want to die. Maybe not.", "I want to die. I am not sure.", "I want to die but maybe not.", "I want to die. I am unsure.", "Do you want to die? Yes. Maybe not."]) {
        const result = interpretSrqTranscript(text, "en-US");
        assert.equal(result.requiresSafetyReview, true, text);
        assert.ok(!result.matches.some(item => item.questionNumber === 17 && item.status === "matched"), text);
    }
    for (const text of ["I have headaches but might not have headaches.", "I have headaches but could not have headaches."])
        assert.deepEqual(interpretSrqTranscript(text, "en-US").matches, [], text);
});

test("credible English ideation variants require review without definitive Q17 classification", () => {
    for (const text of ["I have suicidal thoughts.", "I wish I were dead.", "I thought of suicide."]) {
        const result = interpretSrqTranscript(text, "en-US");
        assert.equal(result.requiresSafetyReview, true, text);
        assert.deepEqual(result.matches, [], text);
    }
    for (const text of ["Do you have suicidal thoughts?", "Do you wish you were dead?", 'He said "I have suicidal thoughts"', "My friend thought of suicide."])
        assert.deepEqual(interpretSrqTranscript(text, "en-US").matches, [], text);
});

test("independent My and I statements fill separate items without losing ambiguity or negation", () => {
    for (const [text, expected] of [
        ["My appetite is poor and I feel anxious.", [[2, true], [6, true]]],
        ["My hands are shaking and I have headaches.", [[1, true], [5, true]]],
        ["My appetite is normal and I am not anxious.", [[2, false], [6, false]]],
        ["My hands are shaking and I might have headaches.", [[5, true]]],
    ] as const) {
        const result = interpretSrqTranscript(text, "en-US");
        assert.deepEqual(result.matches.map(item => [item.questionNumber, item.answer]), expected, text);
    }
});
