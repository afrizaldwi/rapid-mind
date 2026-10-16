import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import { createRenderer, defineComponent, h, nextTick, ref } from "vue";

const filename = resolve(
    "resources/js/components/Healthcare/Emergencies/EmergencyActionsTab.vue",
);
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });

test("mounted Actions tab patches parent drafts without losing same-tick edits", async () => {
    const compiled = compileScript(descriptor, { id: "actions-test", inlineTemplate: true });
    let code = ts.transpileModule(compiled.content, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    }).outputText;
    code = code
        .replaceAll("from 'vue'", `from '${import.meta.resolve("vue")}'`)
        .replaceAll('from "vue"', `from "${import.meta.resolve("vue")}"`)
        .replaceAll(
            'from "@/lib/referralStatus"',
            `from "${pathToFileURL(resolve("resources/js/lib/referralStatus.ts")).href}"`,
        );

    const component = (await import(`data:text/javascript,${encodeURIComponent(code)}`))
        .default;
    const initialDrafts = {
        verificationForm: { method: "FIELD_TEAM", notes: "" },
        decisionForm: { clinical_result: "T0_CONFIRMED", notes: "" },
        referralForm: { facility_id: null as number | null, notes: "" },
    };
    const verificationForm = ref({ ...initialDrafts.verificationForm });
    const decisionForm = ref({ ...initialDrafts.decisionForm });
    const referralForm = ref({ ...initialDrafts.referralForm });
    const originalPropDrafts = [verificationForm.value, decisionForm.value, referralForm.value];
    const events: Array<[string, Record<string, unknown>]> = [];
    const item = ref({ status: "PENDING", hasReferral: false, volunteerName: "Relawan Uji" });
    const submits: string[] = [];
    // v-model DOM directives only need these methods on the renderer's elements.
    class TestDocument {}
    class TestShadowRoot {}
    (globalThis as any).Document = TestDocument;
    (globalThis as any).ShadowRoot = TestShadowRoot;
    function element(tag: string) {
        const node: any = {
            tagName: tag.toUpperCase(), type: tag, value: "", children: [], listeners: {},
            addEventListener(name: string, listener: (event: unknown) => void) {
                (this.listeners[name] ??= []).push(listener);
            },
            getRootNode() { return null; },
            get options() { return this.children.filter((child: any) => child.tagName === "OPTION"); },
            get selectedIndex() { return this.options.findIndex((option: any) => option.selected); },
            set selectedIndex(index: number) {
                this.options.forEach((option: any, optionIndex: number) => {
                    option.selected = optionIndex === index;
                });
            },
        };
        return node;
    }
    const renderer = createRenderer({
        patchProp(node: any, key, _previous, value) {
            if (key === "value") node._value = value;
            node[key] = value;
        },
        insert(child: any, parent: any) { parent.children.push(child); child.parentNode = parent; },
        remove(child: any) {
            const siblings = child.parentNode?.children;
            if (siblings) siblings.splice(siblings.indexOf(child), 1);
        },
        createElement: element,
        createText: () => element("#text"),
        createComment: () => element("#comment"),
        setText() {},
        setElementText(node: any) { node.children = []; },
        parentNode: (node: any) => node.parentNode ?? null,
        nextSibling: () => null,
    });
    const root = element("root");
    const app = renderer.createApp(defineComponent({
        setup() {
            return () => h(component, {
                item: item.value,
                facilities: [{ id: 42, name: "Faskes Uji", type: "RUMAH_SAKIT" }],
                isSubmitting: false,
                verificationForm: verificationForm.value,
                decisionForm: decisionForm.value,
                referralForm: referralForm.value,
                "onUpdate:verificationForm": (patch: typeof verificationForm.value) => {
                    events.push(["update:verificationForm", patch]);
                    verificationForm.value = { ...verificationForm.value, ...patch };
                },
                "onUpdate:decisionForm": (patch: typeof decisionForm.value) => {
                    events.push(["update:decisionForm", patch]);
                    decisionForm.value = { ...decisionForm.value, ...patch };
                },
                "onUpdate:referralForm": (patch: typeof referralForm.value) => {
                    events.push(["update:referralForm", patch]);
                    referralForm.value = { ...referralForm.value, ...patch };
                },
                "onSubmit:verify": () => submits.push("verify"),
                "onSubmit:classify": () => submits.push("classify"),
                "onSubmit:referral": () => submits.push("referral"),
            });
        },
    }));
    app.mount(root);
    function find(tag: string): any {
        const visit = (node: any): any =>
            node.tagName === tag.toUpperCase()
                ? node
                : node.children?.map(visit).find(Boolean);
        return visit(root);
    }
    function dispatch(node: any, name: string) {
        const event = { target: node, prevented: false, preventDefault() { this.prevented = true; } };
        for (const listener of node.listeners[name] ?? []) listener(event);
        if (node[`on${name[0].toUpperCase()}${name.slice(1)}`])
            node[`on${name[0].toUpperCase()}${name.slice(1)}`](event);
        return event;
    }
    function input(node: any, value: string) { node.value = value; dispatch(node, "input"); }
    function select(node: any, value: number | string | null) {
        node.selectedIndex = node.options.findIndex((option: any) => option._value === value);
        dispatch(node, "change");
    }

    input(find("textarea"), "Hasil verifikasi");
    assert.equal(dispatch(find("form"), "submit").prevented, true);
    item.value = { ...item.value, status: "REVIEWING" };
    await nextTick();
    select(find("select"), "T3");
    input(find("textarea"), "Pertimbangan klinis");
    input(find("textarea"), "Pertimbangan klinis terbaru");
    assert.equal(dispatch(find("form"), "submit").prevented, true);
    item.value = { ...item.value, status: "CONFIRMED" };
    await nextTick();
    select(find("select"), 42);
    input(find("textarea"), "Instruksi transport");
    assert.equal(dispatch(find("form"), "submit").prevented, true);
    await nextTick();

    assert.deepEqual(events, [
        ["update:verificationForm", { notes: "Hasil verifikasi" }],
        ["update:decisionForm", { clinical_result: "T3" }],
        ["update:decisionForm", { notes: "Pertimbangan klinis" }],
        ["update:decisionForm", { notes: "Pertimbangan klinis terbaru" }],
        ["update:referralForm", { facility_id: 42 }],
        ["update:referralForm", { notes: "Instruksi transport" }],
    ]);
    assert.deepEqual(initialDrafts, {
        verificationForm: { method: "FIELD_TEAM", notes: "" },
        decisionForm: { clinical_result: "T0_CONFIRMED", notes: "" },
        referralForm: { facility_id: null, notes: "" },
    });
    assert.deepEqual(originalPropDrafts, [
        { method: "FIELD_TEAM", notes: "" },
        { clinical_result: "T0_CONFIRMED", notes: "" },
        { facility_id: null, notes: "" },
    ]);
    assert.deepEqual(decisionForm.value, {
        clinical_result: "T3",
        notes: "Pertimbangan klinis terbaru",
    });
    assert.deepEqual(referralForm.value, {
        facility_id: 42,
        notes: "Instruksi transport",
    });
    select(find("select"), null);
    await nextTick();
    assert.deepEqual(events.at(-1), ["update:referralForm", { facility_id: null }]);
    assert.deepEqual(referralForm.value, { facility_id: null, notes: "Instruksi transport" });
    assert.deepEqual(submits, ["verify", "classify", "referral"]);
    app.unmount();
});
