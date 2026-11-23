import assert from "node:assert/strict";
import test from "node:test";
import { mountFixture, moduleStub, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

test("T0 follows a delayed, resized or replaced assessment footer and retains its click action", async () => {
    let footer: any = null;
    let top = 730;
    let mutation: () => void = () => {};
    let resize: () => void = () => {};
    const browser = Object.assign(new EventTarget(), { innerHeight: 800 });
    (globalThis as any).window = browser;
    (globalThis as any).document = { body: {}, querySelector: () => footer };
    (globalThis as any).MutationObserver = class {
        constructor(callback: () => void) { mutation = callback; }
        observe() {}
        disconnect() {}
    };
    (globalThis as any).ResizeObserver = class {
        constructor(callback: () => void) { resize = callback; }
        observe() {}
        disconnect() {}
    };
    const Button = (await import(await vueModuleUrl("resources/js/components/Relawan/T0Button.vue", {
        "@/i18n": moduleStub("export const useI18n=()=>({isEn:false,t:()=> 'T0 Darurat'});"),
    }))).default;
    let triggers = 0;
    const f = mountFixture(Button, { focused: true, onTrigger: () => triggers++ });
    try {
        await f.flush();
        footer = { getBoundingClientRect: () => ({ top, height: 70 }) };
        mutation();
        await f.flush();
        const position = () => f.nodes(node => node.tag === "div")[0].style.bottom;
        assert.equal(position(), "82px");
        top = 640;
        resize();
        await f.flush();
        assert.equal(position(), "172px");
        footer = { getBoundingClientRect: () => ({ top: 720, height: 80 }) };
        mutation();
        await f.flush();
        assert.equal(position(), "92px");
        browser.innerHeight = 900;
        browser.dispatchEvent(new Event("resize"));
        await f.flush();
        assert.equal(position(), "192px");
        f.nodes(node => node.tag === "button")[0].onClick();
        assert.equal(triggers, 1);
    } finally {
        f.app.unmount();
    }
});
