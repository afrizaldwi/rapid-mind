import assert from "node:assert/strict";
import test from "node:test";
import { moduleStub, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

for (const scenario of ["matching", "expired", "wrong-owner", "inactive", "wrong-role", "logout-race", "switch-race", "fence-race", "unavailable", "missing-csrf"]) {
    test(`in-place recovery validates identity and never navigates: ${scenario}`, async t => {
        const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
        Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
        t.after(() => { if (previous) Object.defineProperty(globalThis, "navigator", previous); });
        const state: any = { continuity: { state: "ELIGIBLE", context: { owner_user_id: 101 } }, tokens: [], invalidated: false };
        const id = crypto.randomUUID();
        const registry = ((globalThis as any).__recoveryFixtures ??= new Map());
        registry.set(id, state);
        t.after(() => registry.delete(id));
        const global = `globalThis.__recoveryFixtures.get(${JSON.stringify(id)})`;
        state.probe = async () => {
            if (scenario === "unavailable") throw Error("Synthetic transport failure");
            if (scenario === "logout-race") state.continuity = { state: "LOGGED_OUT_LOCALLY" };
            if (scenario === "switch-race") state.continuity.context.owner_user_id = 202;
            if (scenario === "fence-race") state.invalidated = true;
            return { response: new Response(null, { status: scenario === "expired" ? 401 : ["inactive", "wrong-role"].includes(scenario) ? 403 : 200 }),
                payload: { state: scenario === "expired" ? "REAUTHENTICATION_REQUIRED" : scenario === "inactive" ? "ACCOUNT_INACTIVE" : scenario === "wrong-role" ? "WRONG_ROLE" : "AUTHENTICATED",
                    user: { id: scenario === "wrong-owner" ? 202 : 101, role: "RELAWAN" },
                    csrf_token: scenario === "missing-csrf" ? null : "synthetic-csrf" } };
        };
        const source = await import(await vueModuleUrl("resources/js/offline/sessionRecovery.ts", {
            "./relawanContinuity": moduleStub(`export const resolveRelawanContinuity=async()=>${global}.continuity;`),
            "./sessionProbe": moduleStub(`export const probeRelawanSession=()=>${global}.probe();`),
            "./clinicalAccessFence": moduleStub(`export const captureClinicalAccess=()=>({});export const assertClinicalAccess=()=>{if(${global}.invalidated)throw Error('stale');};`),
            "./csrfToken": moduleStub(`export const installCsrfToken=token=>{if(!token)return false;${global}.tokens.push(token);return true;};`),
        }));
        assert.equal(await source.recoverRelawanSession(101), scenario === "matching");
        assert.equal(state.tokens.length, scenario === "matching" ? 1 : 0);
        const expected: Record<string, string> = { matching: "READY", expired: "REAUTHENTICATION_REQUIRED", "wrong-owner": "WRONG_IDENTITY", inactive: "ACCOUNT_INACTIVE", "wrong-role": "WRONG_IDENTITY", "logout-race": "IDLE", "switch-race": "IDLE", "fence-race": "SERVER_UNAVAILABLE", unavailable: "SERVER_UNAVAILABLE", "missing-csrf": "SERVER_REJECTED" };
        assert.equal(source.relawanSessionRecovery.state, expected[scenario]);
    });
}
