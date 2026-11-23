import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { nextTick, reactive } from "vue";
import { healthcareDrafts } from "../../resources/js/lib/healthcareReconciliation.ts";
import {
    loadVueSource,
    moduleStub,
    mountFixture,
} from "./helpers/mountedVueFixture.ts";

for (const path of [
    "/healthcare/validations?filter=pending",
    "/healthcare/validations/synthetic",
]) {
    test(`worklist polling reloads canonical props and respects dirty drafts on ${path}`, async (t) => {
        const requests: string[][] = [];
        const joined: string[] = [],
            left: string[] = [];
        const listeners: Record<string, (event?: unknown) => void> = {};
        const channel: any = {};
        for (const method of ["listen", "subscribed", "error", "stopListening"])
            channel[method] = () => channel;
        channel.listen = (event: string, listener: () => void) => {
            listeners[event] = listener;
            return channel;
        };
        const context = {
            page: reactive({
                url: path,
                props: {
                    healthcareChannel: "scope-A",
                    auth: { user: { name: "Sintetis", role: "HEALTHCARE" } },
                },
            }),
            window: Object.assign(new EventTarget(), {
                navigator: { onLine: true },
            }),
            router: {
                on: () => () => {},
                reload: (options: any) => {
                    requests.push(options.only);
                    options.onSuccess();
                    options.onFinish();
                },
            },
            echo: () => ({
                connector: {},
                private: (name: string) => {
                    joined.push(name);
                    return channel;
                },
                leave(name: string) {
                    left.push(name);
                },
            }),
        };
        (globalThis as any).__c2Worklist = context;
        const code = await loadVueSource(
            "resources/js/layouts/HealthcareLayout.vue",
            {
                "@inertiajs/vue3": moduleStub(
                    "export const Link = () => null; export const usePage = () => globalThis.__c2Worklist.page; export const router = globalThis.__c2Worklist.router;" +
                        `\n// ${path}`,
                ),
                "@laravel/echo-vue": moduleStub(
                    "export const echo = () => globalThis.__c2Worklist.echo();" +
                        `\n// ${path}`,
                ),
                "@/lib/healthcareReconciliation": moduleStub(
                    `export * from ${JSON.stringify(pathToFileURL(resolve("resources/js/lib/healthcareReconciliation.ts")).href)};`,
                ),
            },
        );
        const component = (
            await import(
                moduleStub(
                    `const window = globalThis.__c2Worklist.window;\n${code}`,
                )
            )
        ).default;
        t.mock.method(
            globalThis,
            "fetch",
            async () => new Response(null, { status: 200 }),
        );
        t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
        const mounted = mountFixture(component);
        t.after(() => {
            mounted.app.unmount();
            delete (globalThis as any).__c2Worklist;
        });
        await nextTick();
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(150);
        await nextTick();
        assert.deepEqual(
            requests[0],
            path.includes("synthetic")
                ? [
                      "assessment",
                      "previousAssessments",
                      "facilities",
                      "pendingT0Count",
                      "auth",
                      "healthcareChannel",
                      "clinicalScopeAvailable",
                  ]
                : [
                      "pendingAssessments",
                      "completedAssessments",
                      "pendingT0Count",
                      "auth",
                      "healthcareChannel",
                      "clinicalScopeAvailable",
                  ],
        );
        const owner = Symbol("dirty validation form");
        t.after(() => healthcareDrafts.release(owner));
        healthcareDrafts.set(owner, true);
        t.mock.timers.tick(15000);
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(150);
        await nextTick();
        assert.equal(requests.length, 1);
        healthcareDrafts.release(owner);
        t.mock.timers.tick(150);
        await nextTick();
        assert.equal(requests.length, 2);
        listeners.AssessmentUpdated();
        t.mock.timers.tick(150);
        await nextTick();
        assert.equal(requests.length, 3);
        const oldListener = listeners.AssessmentUpdated;
        context.page.props.healthcareChannel = "scope-B";
        await nextTick();
        assert.deepEqual(joined, ["scope-A", "scope-B"]);
        assert.deepEqual(left, ["scope-A"]);
        oldListener();
        t.mock.timers.tick(150);
        await nextTick();
        assert.equal(
            requests.length,
            3,
            "retired channel cannot reconcile a new facility context",
        );
    });
}
