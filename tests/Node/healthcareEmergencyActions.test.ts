import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { createRenderer, defineComponent, nextTick, ref } from "vue";
import ts from "typescript";
import { useEmergencyQueue } from "../../resources/js/composables/useEmergencyQueue.ts";

type PostCall = { url: string; payload: unknown; options: any };
const posts: PostCall[] = [];
(globalThis as any).__rapidMindActionPosts = posts;

const mockInertia = `data:text/javascript,${encodeURIComponent(
    "export const router = { post: (url, payload, options) => globalThis.__rapidMindActionPosts.push({ url, payload, options }) };",
)}`;
const source = readFileSync(
    resolve("resources/js/composables/useEmergencyActions.ts"),
    "utf8",
);
const code = ts
    .transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    })
    .outputText.replaceAll('from "vue"', `from "${import.meta.resolve("vue")}"`)
    .replaceAll('from "@inertiajs/vue3"', `from "${mockInertia}"`)
    .replaceAll('from "./useHealthcareDraft.ts"', `from "${pathToFileURL(resolve("resources/js/composables/useHealthcareDraft.ts")).href}"`);
const { useEmergencyActions } = await import(
    `data:text/javascript,${encodeURIComponent(code)}`
);

function emergency(id: string, status: string) {
    return {
        id,
        status,
        created_at: "2026-10-14T01:00:00Z",
        patient: { name: "Pasien Uji", nik: "3276123412345678" },
        referrals: [],
    };
}

test("action handlers keep routes, payloads, callbacks, and submitting state", () => {
    posts.length = 0;
    const actions = useEmergencyActions();
    const noId = { emergencyId: null };
    actions.acknowledgeCase(noId);
    actions.submitVerification(noId);
    actions.submitClassification(noId);
    actions.submitReferral(noId);
    assert.equal(posts.length, 0);
    assert.equal(actions.isSubmitting.value, false);

    actions.verificationForm.value = { method: "FIELD_TEAM", notes: "Verifikasi" };
    actions.decisionForm.value = { clinical_result: "T3", notes: "Klasifikasi" };
    actions.referralForm.value = { facility_id: 42, notes: "Rujukan" };
    const item = { emergencyId: 17 };
    const cases = [
        [actions.acknowledgeCase, "/acknowledge", {}, "Kasus darurat berhasil diakui.", "Gagal mengakui kasus."],
        [actions.submitVerification, "/verify", actions.verificationForm.value, "Verifikasi medis berhasil disimpan.", "Gagal menyimpan verifikasi."],
        [actions.submitClassification, "/classify", actions.decisionForm.value, "Klasifikasi triase berhasil ditetapkan.", "Gagal menetapkan klasifikasi."],
        [actions.submitReferral, "/referrals", actions.referralForm.value, "Rujukan medis berhasil diterbitkan.", "Gagal menerbitkan rujukan."],
    ] as const;

    for (const [submit, suffix, payload, success, fallback] of cases) {
        actions.actionFeedback.value = { type: "error", message: "Lama" };
        submit(item);
        const call = posts.at(-1)!;
        assert.equal(call.url, `/healthcare/emergencies/17${suffix}`);
        if (suffix === "/acknowledge") assert.deepEqual(call.payload, payload);
        else assert.strictEqual(call.payload, payload);
        assert.equal(actions.isSubmitting.value, true);
        assert.equal(actions.actionFeedback.value, null);
        assert.deepEqual(Object.keys(call.options), ["onSuccess", "onError", "onFinish"]);

        call.options.onSuccess();
        assert.deepEqual(actions.actionFeedback.value, {
            type: "success",
            message: success,
        });
        call.options.onError({ field: "Kesalahan server" });
        assert.deepEqual(actions.actionFeedback.value, {
            type: "error",
            message: "Kesalahan server",
        });
        call.options.onError({});
        assert.deepEqual(actions.actionFeedback.value, {
            type: "error",
            message: fallback,
        });
        call.options.onFinish();
        assert.equal(actions.isSubmitting.value, false);
    }
    assert.equal(posts.length, 4);
});

test("queue selection resets actions while same-case refresh preserves drafts and feedback", async () => {
    const renderer = createRenderer({
        patchProp() {},
        insert(child, parent) { parent.children.push(child); },
        remove() {},
        createElement: () => ({ children: [] }),
        createText: () => ({}),
        createComment: () => ({}),
        setText() {},
        setElementText() {},
        parentNode: () => null,
        nextSibling: () => null,
    });
    const records = ref([
        emergency("first", "PENDING"),
        emergency("second", "CONFIRMED"),
    ]);
    const activeTab = ref("actions");
    let actions: ReturnType<typeof useEmergencyActions>;
    let queue: ReturnType<typeof useEmergencyQueue>;
    const app = renderer.createApp(
        defineComponent({
            setup() {
                actions = useEmergencyActions();
                queue = useEmergencyQueue(() => records.value, () => {
                    activeTab.value = "overview";
                    actions.resetActions();
                });
                return () => null;
            },
        }),
    );
    app.mount({ children: [] });

    actions!.decisionForm.value = { clinical_result: "T3", notes: "Tetap ada" };
    actions!.referralForm.value = { facility_id: 42, notes: "Instruksi" };
    actions!.actionFeedback.value = { type: "success", message: "Tersimpan" };
    actions!.isSubmitting.value = true;
    records.value = [
        emergency("first", "ACKNOWLEDGED"),
        emergency("second", "CONFIRMED"),
    ];
    await nextTick();
    assert.equal(queue!.selectedItem.value.status, "ACKNOWLEDGED");
    assert.deepEqual(actions!.decisionForm.value, { clinical_result: "T3", notes: "Tetap ada" });
    assert.deepEqual(actions!.referralForm.value, { facility_id: 42, notes: "Instruksi" });
    assert.deepEqual(actions!.actionFeedback.value, { type: "success", message: "Tersimpan" });
    assert.equal(activeTab.value, "actions");
    assert.equal(actions!.isSubmitting.value, true);

    queue!.selectItem(queue!.selectedItem.value);
    assert.equal(activeTab.value, "overview");
    assert.deepEqual(actions!.decisionForm.value, { clinical_result: "T0_CONFIRMED", notes: "" });
    assert.deepEqual(actions!.referralForm.value, { facility_id: null, notes: "" });
    assert.equal(actions!.actionFeedback.value, null);
    assert.equal(actions!.isSubmitting.value, true);

    actions!.verificationForm.value.notes = "Perlu direset";
    activeTab.value = "actions";
    queue!.selectedFilter.value = "CONFIRMED";
    await nextTick();
    assert.equal(queue!.selectedItem.value.emergencyId, "second");
    assert.deepEqual(actions!.verificationForm.value, { method: "FIELD_TEAM", notes: "" });
    assert.equal(activeTab.value, "overview");
    app.unmount();
});
