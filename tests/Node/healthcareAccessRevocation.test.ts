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


for (const result of ['revoked-session', 'changed-facility', 'revoked-case', 'temporary-failure', 'unchanged', 'late-old-route']) {
    test(`access probe bypasses dirty drafts: ${result}`, async (t) => {
        const destinations: string[] = [];
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
                url: "/healthcare/emergencies/synthetic",
                component: "Healthcare/Emergencies/Show",
                version: 'synthetic-version',
                props: {
                    healthcareChannel: "scope-A",
                    auth: { user: { name: "Sintetis", role: "HEALTHCARE" } },
                },
            }),
            window: Object.assign(new EventTarget(), {
                navigator: { onLine: true },
                location: { replace: (path: string) => destinations.push(path) },
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

        const code = await loadVueSource('resources/js/layouts/HealthcareLayout.vue', {
            '@inertiajs/vue3': moduleStub('export const Link = () => null; export const usePage = () => globalThis.__c2Worklist.page; export const router = globalThis.__c2Worklist.router;'),
            '@laravel/echo-vue': moduleStub('export const echo = () => globalThis.__c2Worklist.echo();'),
            '@/lib/healthcareReconciliation': moduleStub(`export * from ${JSON.stringify(pathToFileURL(resolve('resources/js/lib/healthcareReconciliation.ts')).href)};`),
        });
        const component = (await import(moduleStub(`const window = globalThis.__c2Worklist.window;\n${code}\n// ${result}`))).default;
        let accessChecks = 0;
        t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
            if (url === '/up') return new Response(null, {status: 200});
            accessChecks++;
            assert.equal(options.headers['X-Inertia-Version'], 'synthetic-version');
            assert.equal(options.headers['X-Inertia-Partial-Data'], 'auth,healthcareChannel,clinicalScopeAvailable');
            assert.equal(options.headers['X-Inertia-Partial-Component'], 'Healthcare/Emergencies/Show');
            if (result === 'late-old-route') context.page.url = '/healthcare/validations';
            if (result === 'revoked-session') return new Response(null, {status: 401});
            if (result === 'revoked-case') return new Response(null, {status: 404});
            if (result === 'temporary-failure') return new Response(null, {status: 503});
            return Response.json({props: {healthcareChannel: result === 'changed-facility' ? 'scope-B' : 'scope-A'}});
        });
        t.mock.timers.enable({apis:['setTimeout','setInterval']});
        const owner = Symbol('dirty synthetic clinical form');
        healthcareDrafts.set(owner, true);
        const mounted = mountFixture(component);
        t.after(() => { mounted.app.unmount(); healthcareDrafts.release(owner); delete (globalThis as any).__c2Worklist; });
        await nextTick(); await new Promise(resolve => setImmediate(resolve));
        assert.equal(accessChecks, 1);
        assert.equal(requests.length, 0, 'dirty draft still defers clinical prop reconciliation');
        const denied = ['revoked-session','changed-facility','revoked-case'].includes(result);
        assert.deepEqual(destinations, denied ? [result === 'revoked-session' ? '/login' : '/healthcare/emergencies'] : []);
        assert.deepEqual(left, denied ? ['scope-A'] : []);
        await nextTick();
        assert.equal(mounted.text().includes('Akses berubah'), denied);
        
    });
}
