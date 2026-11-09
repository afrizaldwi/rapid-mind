import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, provide } from "vue";
import { moduleStub, mountFixture, vueModuleUrl } from "./helpers/mountedVueFixture.ts";
import { offlineNavigationFixture, settle } from "./helpers/offlineNavigationFixture.ts";

async function linkModules() {
    const vue = import.meta.resolve("vue");
    const state: any = { visits: [], reloads: [] };
    (globalThis as any).__offlineLinkTest = state;
    const inertia = moduleStub(`import {defineComponent,h} from '${vue}';
        export const Link = defineComponent({props:['href'],setup:props=>()=>h('inertia-link',{href:props.href})});
        export const usePage = () => ({url:'/relawan/home', props:{auth:{user:{id:101,role:'RELAWAN'}}}});
        export const router = {
            visit: path => globalThis.__offlineLinkTest.visits.push(path),
            reload: options => globalThis.__offlineLinkTest.reloads.push(options),
        };`);
    const runtimeUrl = await vueModuleUrl("resources/js/relawan/runtime.ts", {
        "@inertiajs/vue3": inertia,
        "@/offline/db": moduleStub("export const requireOwner = owner => owner;"),
    });
    const runtime = await import(runtimeUrl);
    const Link = (await import(await vueModuleUrl("resources/js/relawan/RelawanLink.vue", {
        "@inertiajs/vue3": inertia, "./runtime": runtimeUrl,
    }))).default;
    return { state, runtime, Link };
}
function click(node: any, href: string, options: Record<string, unknown> = {}) {
    let prevented = false;
    const event = {
        button: 0, defaultPrevented: false,
        currentTarget: { href, target: "", hasAttribute: () => false },
        preventDefault() { prevented = true; }, ...options,
    };
    node.onClick(event);
    return prevented;
}

test("real RelawanLink delegates ordinary offline clicks to same-document runtime navigation", async t => {
    const f = await offlineNavigationFixture(t);
    const { runtime, Link } = await linkModules();
    const n = f.state.navigation;
    await n.start();
    const mounted = mountFixture(defineComponent({ setup() {
        provide(runtime.relawanRuntimeKey, n.runtime);
        return () => h(Link, { href: "/relawan/pfa" }, { default: () => "PFA" });
    } }));
    t.after(() => mounted.app.unmount());
    const anchor = mounted.nodes(node => node.tag === "a")[0];
    const href = new URL("/relawan/pfa", f.browser.location.href).href;
    assert.equal(click(anchor, href), true);
    for (let i = 0; i < 100 && n.runtime.path !== "/relawan/pfa"; i++) await settle();
    assert.equal(n.runtime.path, "/relawan/pfa");
    assert.equal(n.view.value.status, "READY");
    assert.equal(f.storage.clinicalKeyReady(101), true);
    assert.deepEqual(f.assignments, []);
    for (const options of [
        { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true },
        { button: 1 }, { button: 2 }, { defaultPrevented: true },
        { currentTarget: { href, target: "_blank", hasAttribute: () => false } },
        { currentTarget: { href, target: "", hasAttribute: () => true } },
    ]) assert.equal(click(anchor, href, options), false);
    for (const nativeHref of ["https://example.invalid/relawan/pfa", "mailto:demo@example.invalid", "/login", "/logo.png"])
        assert.equal(click(anchor, nativeHref), false);
    assert.equal(f.historyStates.length, 1);
});

test("online RelawanLink and runtime keep the existing Inertia navigation and reload behavior", async t => {
    const { state, runtime, Link } = await linkModules();
    let online: any;
    const mounted = mountFixture(defineComponent({ setup() {
        online = runtime.useRelawanRuntime();
        return () => h(Link, { href: "/relawan/assessment" });
    } }));
    t.after(() => mounted.app.unmount());
    assert.equal(mounted.nodes(node => node.tag === "a").length, 0);
    assert.equal(mounted.nodes(node => node.tag === "inertia-link")[0].href, "/relawan/assessment");
    online.navigate("/relawan/assessment");
    online.reload(["assessment"]);
    assert.equal(online.mode, "ONLINE_SERVER");
    assert.deepEqual(state.visits, ["/relawan/assessment"]);
    assert.deepEqual(state.reloads, [{ only: ["assessment"] }]);
});
