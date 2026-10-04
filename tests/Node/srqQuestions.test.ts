import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { srqQuestions } from "../../resources/js/domain/srq/srqQuestions.ts";

test("SRQ content defines exactly the canonical numbered 20 items", () => {
    assert.equal(srqQuestions.length, 20);
    assert.deepEqual(
        srqQuestions.map(({ number }) => number),
        Array.from({ length: 20 }, (_, index) => index + 1),
    );

    for (const item of srqQuestions) {
        assert.ok(item.question.length > 0, `Q${item.number} question`);
        assert.ok(item.script.length > 0, `Q${item.number} script`);
        assert.ok(
            item.volunteerInstruction.length > 0,
            `Q${item.number} guidance`,
        );
        assert.ok(item.keywords.length > 0, `Q${item.number} keywords`);
    }
});

test("questions, scripts, guidance, and keywords come from workflow.md", async () => {
    const workflow = await readFile(
        new URL("../../docs/workflow.md", import.meta.url),
        "utf8",
    );

    for (const item of srqQuestions) {
        assert.ok(workflow.includes(item.question), `Q${item.number} question`);
        assert.ok(workflow.includes(item.script), `Q${item.number} script`);
        assert.ok(
            workflow.includes(item.volunteerInstruction),
            `Q${item.number} guidance`,
        );
        for (const keyword of item.keywords) {
            assert.ok(
                workflow.includes(`\"${keyword}\"`),
                `Q${item.number} keyword: ${keyword}`,
            );
        }
    }
});

test("Q17 content does not encode automatic emergency creation or transmission", () => {
    const q17 = srqQuestions.find(({ number }) => number === 17);
    assert.ok(q17);
    assert.doesNotMatch(
        q17.volunteerInstruction,
        /otomatis|memicu status|sinyal dikirim/i,
    );
});
