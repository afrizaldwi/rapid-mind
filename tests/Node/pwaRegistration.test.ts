import assert from "node:assert/strict";
import test from "node:test";
import { loadVueSource, moduleStub } from "./helpers/mountedVueFixture.ts";

test("offline readiness requires a controlling worker's inventory and surfaces installation failure", async () => {
    for (const scenario of [
        "ready",
        "incomplete",
        "registration-failure",
        "install-failure",
        "development",
        "unsupported",
    ]) {
        let registrations = 0;
        const installing = Object.assign(new EventTarget(), {
            state: "installing",
        });
        const registration = Object.assign(new EventTarget(), {
            installing: scenario === "install-failure" ? installing : null,
            waiting: null,
            // An unavailable update server must not invalidate the current cache.
            update: async () => {
                throw new Error("offline");
            },
        });
        const worker = {
            postMessage(message: any, ports: MessagePort[]) {
                assert.equal(message.type, "RAPID_MIND_CHECK_OFFLINE");
                ports[0].postMessage({
                    type: "RAPID_MIND_OFFLINE_STATUS",
                    ready: scenario === "ready",
                });
            },
        };
        const serviceWorker = Object.assign(new EventTarget(), {
            controller: scenario === "install-failure" ? null : worker,
            register: async (path: string, options: any) => {
                registrations++;
                assert.equal(path, "/build/serviceWorker.js");
                assert.equal(options.scope, "/relawan/");
                if (scenario === "registration-failure")
                    throw new Error("denied");
                return registration;
            },
        });
        (globalThis as any).__c1Navigator =
            scenario === "unsupported" ? {} : { serviceWorker };
        const source = (
            await loadVueSource("resources/js/pwa/register.ts", {})
        ).replaceAll(
            "import.meta.env.PROD",
            String(scenario !== "development"),
        );
        const runtime = await import(
            moduleStub(
                `const navigator = globalThis.__c1Navigator;\n${source}\n// ${scenario}`,
            )
        );
        runtime.registerRelawanServiceWorker();
        if (scenario === "install-failure") {
            await new Promise((resolve) => setImmediate(resolve));
            installing.state = "redundant";
            installing.dispatchEvent(new Event("statechange"));
        }
        const expected: Record<string, string> = {
            ready: "READY",
            incomplete: "INCOMPLETE",
            "registration-failure": "ERROR",
            "install-failure": "ERROR",
            development: "DEVELOPMENT",
            unsupported: "UNSUPPORTED",
        };
        // MessageChannel delivery uses the actual Node event loop.
        for (
            let attempt = 0;
            attempt < 100 &&
            runtime.offlineReadiness.state !== expected[scenario];
            attempt++
        )
            await new Promise((resolve) => setTimeout(resolve, 1));
        assert.equal(
            runtime.offlineReadiness.state,
            expected[scenario],
            scenario,
        );
        assert.equal(
            registrations,
            ["development", "unsupported"].includes(scenario) ? 0 : 1,
        );
    }
    delete (globalThis as any).__c1Navigator;
});
