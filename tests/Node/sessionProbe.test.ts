import assert from "node:assert/strict";
import test from "node:test";
import { probeRelawanSession } from "../../resources/js/offline/sessionProbe.ts";

test("session probe retains HTTP status and never sends credentials in a body", async (t) => {
    for (const status of [200, 401, 403, 503]) {
        const mock = t.mock.method(
            globalThis,
            "fetch",
            async (url: string, options: RequestInit) => {
                assert.equal(url, "/relawan/session-status");
                assert.equal(options.method, "GET");
                assert.equal(options.credentials, "same-origin");
                assert.equal(options.cache, "no-store");
                assert.equal(options.body, undefined);
                return Response.json(
                    { state: "REAUTHENTICATION_REQUIRED" },
                    { status },
                );
            },
        );
        const result = await probeRelawanSession();
        assert.equal(result.response.status, status);
        if (status < 500)
            assert.equal(result.payload.state, "REAUTHENTICATION_REQUIRED");
        mock.mock.restore();
    }
});

test("deadline covers both fetch and stalled body and permits a later successful probe", async (t) => {
    for (const bodyHangs of [false, true]) {
        let signal: AbortSignal | undefined;
        const mock = t.mock.method(
            globalThis,
            "fetch",
            (_url: string, options: RequestInit) => {
                signal = options.signal as AbortSignal;
                return bodyHangs
                    ? Promise.resolve(
                          new Response(new ReadableStream({ start() {} })),
                      )
                    : new Promise<Response>(() => {});
            },
        );
        await assert.rejects(probeRelawanSession(25), /batas waktu/);
        assert.equal(signal?.aborted, true);
        mock.mock.restore();
    }
    t.mock.method(globalThis, "fetch", async () =>
        Response.json({
            state: "AUTHENTICATED",
            user: { id: 101, role: "RELAWAN" },
        }),
    );
    assert.equal((await probeRelawanSession()).payload.user?.id, 101);
});

test("malformed body does not become authenticated", async (t) => {
    t.mock.method(
        globalThis,
        "fetch",
        async () => new Response("<html>login</html>"),
    );
    assert.deepEqual((await probeRelawanSession()).payload, {});
});
