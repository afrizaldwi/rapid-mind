import assert from "node:assert/strict";
import test from "node:test";
import { loadVueSource, moduleStub } from "./helpers/mountedVueFixture.ts";

test("recovery preserves offline access but rejects expired, different and late identities", async () => {
    for (const scenario of [
        "matching",
        "expired",
        "wrong-owner",
        "inactive",
        "wrong-role",
        "logout-race",
        "switch-race",
        "unavailable",
    ]) {
        let tick: (() => Promise<void>) | undefined;
        const navigations: string[] = [];
        const fixture: any = {
            continuity: { state: "ELIGIBLE", context: { owner_user_id: 101 } },
            window: {
                addEventListener() {},
                setInterval(fn: () => Promise<void>) {
                    tick = fn;
                },
                location: {
                    assign(path: string) {
                        navigations.push(path);
                    },
                },
            },
            document: { addEventListener() {}, visibilityState: "visible" },
            async probe() {
                if (scenario === "unavailable") throw new Error("offline");
                if (scenario === "logout-race")
                    fixture.continuity = { state: "LOGGED_OUT_LOCALLY" };
                if (scenario === "switch-race")
                    fixture.continuity.context.owner_user_id = 102;
                return {
                    response: new Response(null, {
                        status:
                            scenario === "expired"
                                ? 401
                                : scenario === "inactive" ||
                                    scenario === "wrong-role"
                                  ? 403
                                  : 200,
                    }),
                    payload: {
                        state:
                            scenario === "inactive"
                                ? "ACCOUNT_INACTIVE"
                                : scenario === "wrong-role"
                                  ? "WRONG_ROLE"
                                  : "AUTHENTICATED",
                        user: {
                            id: scenario === "wrong-owner" ? 102 : 101,
                            role: "RELAWAN",
                        },
                    },
                };
            },
        };
        (globalThis as any).__c1Recovery = fixture;
        const source = await loadVueSource(
            "resources/js/offline/sessionRecovery.ts",
            {
                "./relawanContinuity": moduleStub(
                    "export const resolveRelawanContinuity = async () => globalThis.__c1Recovery.continuity;",
                ),
                "./sessionProbe": moduleStub(
                    "export const probeRelawanSession = () => globalThis.__c1Recovery.probe();",
                ),
            },
        );
        const runtime = await import(
            moduleStub(
                `const window = globalThis.__c1Recovery.window; const document = globalThis.__c1Recovery.document;\n${source}\n// ${scenario}`,
            )
        );
        runtime.startRelawanSessionRecovery(101);
        await new Promise((resolve) => setImmediate(resolve));
        assert.ok(tick);
        const expected: Record<string, string> = {
            matching: "RESTORING_ONLINE_RUNTIME",
            expired: "REAUTHENTICATION_REQUIRED",
            "wrong-owner": "WRONG_IDENTITY",
            inactive: "ACCOUNT_INACTIVE",
            "wrong-role": "WRONG_IDENTITY",
            "logout-race": "IDLE",
            "switch-race": "IDLE",
            unavailable: "SERVER_UNAVAILABLE",
        };
        assert.equal(runtime.relawanSessionRecovery.state, expected[scenario]);
        assert.deepEqual(
            navigations,
            scenario === "matching" ? ["/relawan/data"] : [],
        );
    }
    delete (globalThis as any).__c1Recovery;
});
