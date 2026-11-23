import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, createRenderer, nextTick } from "vue";
import { renderToString } from "@vue/server-renderer";
import ts from "typescript";
import {
    clinicalCompletion,
    dispatchAssignment,
    dispatchTransition,
    referralLink,
    timeline,
    type Dispatch,
    type Operations,
} from "../../resources/js/lib/healthcareOperations.ts";
import { createHealthcareReconciler, healthcareDrafts } from "../../resources/js/lib/healthcareReconciliation.ts";

const calls: any[] = [];
(globalThis as any).__operationCalls = calls;
const inertia = `data:text/javascript,${encodeURIComponent('export const router = { post: (...args) => globalThis.__operationCalls.push(["post", ...args]), reload: (...args) => globalThis.__operationCalls.push(["reload", ...args]) };')}`;
const asModule = (code: string) =>
    `data:text/javascript,${encodeURIComponent(code)}`;
function transpile(code: string) {
    return ts
        .transpileModule(code, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
            },
        })
        .outputText.replace(
            /from ["']vue["']/g,
            `from '${import.meta.resolve("vue")}'`,
        )
        .replace(/from ["']@inertiajs\/vue3["']/g, `from '${inertia}'`);
}
const hookUrl = asModule(
    transpile(
        readFileSync(
            resolve("resources/js/composables/useHealthcareOperation.ts"),
            "utf8",
        ),
    ),
);
const { useHealthcareOperation } = await import(hookUrl);
async function component(name: string) {
    const filename = resolve(
        `resources/js/components/Healthcare/Operations/${name}.vue`,
    );
    const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
    let code = transpile(
        compileScript(descriptor, { id: name, inlineTemplate: true }).content,
    );
    code = code
        .replace(
            /from ["']@\/lib\/healthcareOperations["']/g,
            `from '${pathToFileURL(resolve("resources/js/lib/healthcareOperations.ts")).href}'`,
        )
        .replace(
            /from ["']@\/lib\/healthcareEmergency["']/g,
            `from '${pathToFileURL(resolve("resources/js/lib/healthcareEmergency.ts")).href}'`,
        )
        .replace(
            /from ["']@\/composables\/useHealthcareOperation["']/g,
            `from ${JSON.stringify(hookUrl)}`,
        );
    code = code.replace(/from ["']@\/composables\/useHealthcareDraft["']/g,
        `from "${pathToFileURL(resolve('resources/js/composables/useHealthcareDraft.ts')).href}"`);
    if (code.includes("./OperationConfirmation.vue")) {
        const filename = resolve(
            "resources/js/components/Healthcare/Operations/OperationConfirmation.vue",
        );
        const { descriptor } = parse(readFileSync(filename, "utf8"), {
            filename,
        });
        const confirmationUrl = asModule(
            transpile(
                compileScript(descriptor, {
                    id: "confirmation",
                    inlineTemplate: true,
                }).content,
            ),
        );
        code = code.replace(
            /from ["']\.\/OperationConfirmation\.vue["']/g,
            `from ${JSON.stringify(confirmationUrl)}`,
        );
    }
    return (await import(asModule(code))).default;
}
const dispatch: Dispatch = {
    id: "dispatch-test",
    status: "ON_SITE",
    referral_id: null,
    assigned_at: "2026-10-24T01:00:00Z",
    target_source: "MANUAL",
    target_description: "Lokasi sintetis",
    target_latitude: null,
    target_longitude: null,
    response_unit: { code: "SYN", name: "Unit Sintetis" },
    next_statuses: ["TRANSPORT", "COMPLETED"],
    history: [],
};

test("independent commands carry expected state and reject unsupported UI actions", () => {
    assert.deepEqual(clinicalCompletion({ id: "r", status: "ACTIVE" }), {
        url: "/healthcare/referrals/r/complete",
        data: { expected_status: "ACTIVE" },
    });
    assert.equal(clinicalCompletion({ id: "r", status: "EN_ROUTE" }), null);
    assert.deepEqual(dispatchTransition(dispatch, "COMPLETED", "catatan"), {
        url: "/healthcare/dispatches/dispatch-test/status",
        data: {
            expected_status: "ON_SITE",
            status: "COMPLETED",
            notes: "catatan",
        },
    });
    assert.equal(dispatchTransition(dispatch, "ASSIGNED", ""), null);
    assert.deepEqual(referralLink(dispatch, "r", ""), {
        url: "/healthcare/dispatches/dispatch-test/referral",
        data: { referral_id: "r", expected_referral_id: null, notes: "" },
    });
    assert.equal(
        referralLink({ ...dispatch, referral_id: "original" }, "other", ""),
        null,
    );
    assert.equal(
        referralLink({ ...dispatch, status: "COMPLETED" }, "r", ""),
        null,
    );
});

test("mutation hook prevents duplicate clicks and reconciles conflicts before another write", () => {
    calls.length = 0;
    const operation = useHealthcareOperation();
    const command = clinicalCompletion({ id: "r", status: "ACTIVE" });
    operation.submit(command);
    operation.submit(command);
    assert.equal(calls.length, 1);
    assert.equal(operation.busy.value, true);
    calls[0][3].onError({ conflict: "Data berubah" });
    calls[0][3].onFinish();
    assert.equal(calls[1][0], "reload");
    operation.submit(command);
    assert.equal(calls.length, 2);
    calls[1][1].onSuccess();
    calls[1][1].onFinish();
    assert.equal(operation.stale.value, false);
    operation.submit(command);
    assert.equal(calls.length, 3);
    calls[2][3].onError({ notes: "Catatan tidak valid" });
    calls[2][3].onFinish();
    assert.equal(operation.errors.value.notes, "Catatan tidak valid");
    operation.submit(command);
    calls[3][3].onSuccess();
    calls[3][3].onFinish();
    assert.match(operation.message.value, /tersimpan di sistem/);
});

test("reconciliation coalesces bursts, preserves drafts, and rechecks updates arriving during reload", () => {
    const scheduled: (() => void)[] = [];
    const done: (() => void)[] = [];
    const controller = createHealthcareReconciler(
        (callback) => done.push(callback),
        (job) => scheduled.push(job),
    );
    controller.editing(true);
    controller.request();
    controller.request();
    assert.equal(scheduled.length, 0);
    controller.refresh();
    controller.editing(false);
    assert.equal(scheduled.length, 1);
    scheduled.shift()!();
    assert.equal(done.length, 1);
    controller.request();
    controller.request();
    done.shift()!();
    assert.equal(scheduled.length, 1);
    scheduled.shift()!();
    done.shift()!();
    controller.mutating(true);
    controller.request();
    assert.equal(scheduled.length, 0);
    controller.mutating(false);
    controller.stop();
    scheduled.shift()!();
    assert.equal(done.length, 0);
});

test("timeline uses persisted, distinguishable events and deterministic chronological ordering", () => {
    const operations: Operations = {
        available: true,
        referrals: [
            {
                id: "r",
                status: "ACTIVE",
                created_at: "",
                updated_at: "",
                history: [
                    {
                        id: 2,
                        previous_status: null,
                        status: "ACTIVE",
                        created_at: "2026-10-24T02:00:00Z",
                    },
                ],
            },
        ],
        dispatch: {
            ...dispatch,
            history: [
                {
                    id: 1,
                    event_type: "ASSIGNED",
                    previous_status: null,
                    status: "ASSIGNED",
                    created_at: "2026-10-24T01:00:00Z",
                },
            ],
        },
    };
    assert.deepEqual(
        timeline(operations).map((row) => row.domain),
        ["Respons Lapangan", "Rujukan"],
    );
    assert.equal(timeline({ available: true }).length, 0);
    const sameTick = {
        ...operations,
        referrals: [],
        dispatch: {
            ...dispatch,
            history: [
                {
                    id: 10,
                    previous_status: "ON_SITE",
                    status: "TRANSPORT",
                    created_at: "2026-10-24T01:00:00Z",
                },
                {
                    id: 2,
                    previous_status: "EN_ROUTE",
                    status: "ON_SITE",
                    created_at: "2026-10-24T01:00:00Z",
                },
            ],
        },
    };
    assert.deepEqual(
        timeline(sameTick).map((row) => row.id),
        [2, 10],
    );
});

test("rendered Dispatch sections distinguish schema unavailable, assignment, and valid progression", async () => {
    const panel = await component("DispatchPanel");
    const render = (operations: Operations) =>
        renderToString(
            createSSRApp(panel, { emergencyId: "e", operations, units: [] }),
        );
    const unavailable = await render({ available: false });
    assert.match(unavailable, /skema Dispatch/);
    assert.doesNotMatch(unavailable, /Simpan penugasan respons/);
    const empty = await render({
        available: true,
        dispatch: null,
        referrals: [],
        targets: [{ source: "MANUAL", label: "Lokasi manual" }],
    });
    assert.match(empty, /Belum ada unit respons aktif/);
    assert.match(empty, /disabled/);
    assert.match(empty, /Unit respons aktif/);
    const active = await render({ available: true, dispatch, referrals: [] });
    assert.match(active, /Transport pasien/);
    assert.match(active, /Respons selesai/);
    assert.doesNotMatch(active, /Simpan penugasan respons/);
    const complete = await render({
        available: true,
        dispatch: { ...dispatch, status: "COMPLETED", next_statuses: [] },
        referrals: [],
    });
    assert.doesNotMatch(complete, /Hubungkan secara permanen|Catatan respons/);
});

test("rendered Referral controls offer clinical completion only for ACTIVE", async () => {
    const card = await component("ClinicalReferralCard");
    const referral = {
        id: "r",
        status: "ACTIVE",
        source: "T0_CONFIRMED",
        facility: { name: "Faskes Sintetis" },
        history: [],
    };
    const active = await renderToString(
        createSSRApp(card, { referral, available: true }),
    );
    assert.match(active, /Selesaikan pekerjaan rujukan/);
    const legacy = await renderToString(
        createSSRApp(card, {
            referral: { ...referral, status: "ON_SITE" },
            available: true,
        }),
    );
    assert.match(legacy, /Alur lama/);
    assert.doesNotMatch(legacy, /Selesaikan pekerjaan rujukan/);
    const completed = await renderToString(
        createSSRApp(card, {
            referral: { ...referral, status: "COMPLETED" },
            available: true,
        }),
    );
    assert.doesNotMatch(completed, /Selesaikan pekerjaan rujukan/);
});

test("assignment uses server options, requires manual descriptions, and sends no invented coordinates", () => {
    const input = {
        response_unit_id: 7,
        referral_id: "",
        target_source: "GPS",
        target_description: "",
        notes: "Sintetis",
    };
    const units = [{ id: 7, name: "Unit", code: "SYN" }];
    const operations = {
        available: true,
        targets: [
            { source: "GPS", label: "GPS tersimpan" },
            { source: "MANUAL", label: "Manual" },
        ],
    };
    const command = dispatchAssignment("e", operations, input, units)!;
    assert.deepEqual(command, {
        url: "/healthcare/emergencies/e/dispatches",
        data: {
            response_unit_id: 7,
            referral_id: null,
            target_source: "GPS",
            target_description: null,
            notes: "Sintetis",
        },
    });
    assert.equal(dispatchAssignment("e", operations, input, []), null);
    assert.equal(
        dispatchAssignment(
            "e",
            operations,
            { ...input, target_source: "SHELTER" },
            units,
        ),
        null,
    );
    assert.equal(
        dispatchAssignment(
            "e",
            operations,
            { ...input, target_source: "MANUAL" },
            units,
        ),
        null,
    );
    assert.equal(
        dispatchAssignment(
            "e",
            operations,
            { ...input, referral_id: "unrelated" },
            units,
        ),
        null,
    );
    assert.equal(
        dispatchAssignment("e", { available: false }, input, units),
        null,
    );
    assert.equal(
        dispatchAssignment(
            "e",
            operations,
            {
                ...input,
                target_source: "MANUAL",
                target_description: "Gerbang sintetis",
            },
            units,
        )!.data.target_description,
        "Gerbang sintetis",
    );
});

test("confirmation dialog renders a labelled native dialog and autofocus cancel control", async () => {
    const dialog = await component("OperationConfirmation");
    const html = await renderToString(
        createSSRApp(dialog, {
            titleId: "synthetic-completion",
            title: "Konfirmasi",
            busy: false,
        }),
    );
    assert.match(html, /<dialog/);
    assert.match(html, /aria-labelledby="synthetic-completion"/);
    assert.match(html, /autofocus/);
    assert.match(html, /Batal/);
});

test("network uncertainty blocks blind retries until canonical state has reloaded", () => {
    calls.length = 0;
    const operation = useHealthcareOperation();
    const command = clinicalCompletion({ id: "r", status: "ACTIVE" });
    operation.submit(command);
    assert.equal(
        calls[0][3].onNetworkError(new Error("Synthetic disconnect")),
        false,
    );
    calls[0][3].onFinish();
    assert.equal(operation.stale.value, true);
    assert.match(operation.errors.value.form, /belum dapat dipastikan/);
    operation.submit(command);
    assert.equal(calls.length, 1);
    operation.refresh();
    calls[1][1].onSuccess();
    calls[1][1].onFinish();
    assert.equal(operation.stale.value, false);
});

test('mutation receipts acknowledge the submitted draft only on successful persistence', () => {
    calls.length = 0;
    let submittedUrl = '';
    let receipts = 0;
    const operation = useHealthcareOperation(command => {
        submittedUrl = command.url;
        return () => { receipts += 1; };
    });
    const command = clinicalCompletion({ id: 'r', status: 'ACTIVE' });
    operation.submit(command);
    assert.equal(submittedUrl, '/healthcare/referrals/r/complete');
    calls[0][3].onError({ notes: 'Catatan tidak valid' });
    calls[0][3].onFinish();
    assert.equal(receipts, 0);
    operation.submit(command);
    calls[1][3].onSuccess(); calls[1][3].onFinish();
    assert.equal(receipts, 1);
});


test('mounted referral completion cancellation and component exit resume deferred updates', async () => {
    const savedGlobals = { document: globalThis.document, HTMLElement: globalThis.HTMLElement, Document: globalThis.Document, ShadowRoot: globalThis.ShadowRoot };
    class Element {
        tagName: string; text = ''; value = ''; children: any[] = []; parentNode: any = null;
        listeners: Record<string, ((event: any) => void)[]> = {};
        constructor(tag: string) { this.tagName = tag.toUpperCase(); }
        addEventListener(name: string, callback: (event: any) => void) { (this.listeners[name] ??= []).push(callback); }
        getRootNode() { return null; }
        showModal() {} close() {} focus() {}
    }
    Object.assign(globalThis, { document: { activeElement: null }, HTMLElement: Element, Document: class {}, ShadowRoot: class {} });
    const renderer = createRenderer({
        patchProp(node: any, key, _old, value) { node[key] = value; },
        insert(child: any, parent: any) { parent.children.push(child); child.parentNode = parent; },
        remove(child: any) { const siblings = child.parentNode?.children; if (siblings) siblings.splice(siblings.indexOf(child), 1); },
        createElement: tag => new Element(tag) as any,
        createText: text => Object.assign(new Element('#text'), { text }) as any,
        createComment: () => new Element('#comment') as any,
        setText(node: any, text) { node.text = text; },
        setElementText(node: any, text) { node.text = text; node.children = []; },
        parentNode: (node: any) => node.parentNode,
        nextSibling: () => null,
    });
    const root = new Element('root');
    const jobs: (() => void)[] = []; let reloads = 0;
    const reconciler = createHealthcareReconciler(done => { reloads += 1; done(); }, job => jobs.push(job));
    const unsubscribe = healthcareDrafts.subscribe(reconciler.editing);
    const card = await component('ClinicalReferralCard');
    const app = renderer.createApp(card, { referral: { id: 'r', status: 'ACTIVE', source: 'T0_CONFIRMED', history: [] }, available: true });
    function find(predicate: (node: any) => boolean, node: any = root): any {
        return predicate(node) ? node : node.children.map((child: any) => find(predicate, child)).find(Boolean);
    }
    async function edit() {
        find(node => node.tagName === 'BUTTON' && node.text.includes('Selesaikan pekerjaan')).onClick();
        await nextTick();
        const textarea = find(node => node.tagName === 'TEXTAREA');
        textarea.value = 'Catatan belum tersimpan';
        textarea.listeners.input.forEach((callback: any) => callback({ target: textarea }));
        await nextTick();
        reconciler.request();
        assert.equal(jobs.length, 0);
    }
    let mounted = false;
    try {
        app.mount(root as any); mounted = true;
        await edit();
        find(node => node.tagName === 'BUTTON' && node.text.trim() === 'Batal').onClick();
        await nextTick();
        assert.equal(jobs.length, 1); jobs.shift()!(); assert.equal(reloads, 1);
        await edit();
        app.unmount(); mounted = false;
        assert.equal(jobs.length, 1); jobs.shift()!(); assert.equal(reloads, 2);
    } finally {
        if (mounted) app.unmount();
        reconciler.stop(); unsubscribe(); Object.assign(globalThis, savedGlobals);
    }
});
