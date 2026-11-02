import assert from "node:assert/strict";
import test from "node:test";
import {
    jsonRequest,
    MissingCsrfTokenError,
    RequestTimeoutError,
} from "../../resources/js/offline/jsonRequest.ts";

test("bounded sync requests preserve CSRF, credentials, response and unknown outcome semantics", async (t) => {
    const originalDocument = Object.getOwnPropertyDescriptor(
        globalThis,
        "document",
    );
    let csrf: string | undefined = "synthetic-csrf";
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: { querySelector: () => (csrf ? { content: csrf } : null) },
    });
    t.after(() => {
        if (originalDocument)
            Object.defineProperty(globalThis, "document", originalDocument);
        else delete (globalThis as any).document;
    });

    await t.test(
        "successful and rejected HTTP responses keep status and body",
        async () => {
            for (const status of [200, 401, 419, 422, 503]) {
                const mock = t.mock.method(
                    globalThis,
                    "fetch",
                    async (_url, options) => {
                        assert.equal(options?.credentials, "same-origin");
                        assert.equal(
                            (options?.headers as Record<string, string>)[
                                "X-CSRF-TOKEN"
                            ],
                            csrf,
                        );
                        assert.equal(options?.body, '{"id":"stable-id"}');
                        return new Response(
                            '{"emergency":{"id":"stable-id"}}',
                            { status },
                        );
                    },
                );
                const response = await jsonRequest(
                    "/relawan/sync/emergencies",
                    { id: "stable-id" },
                    100,
                );
                assert.equal(response.status, status);
                assert.equal((await response.json()).emergency.id, "stable-id");
                mock.mock.restore();
            }
        },
    );
    await t.test(
        "hanging transport aborts with unknown outcome, including abort-ignoring fetch",
        async () => {
            let signal: AbortSignal | undefined;
            const mock = t.mock.method(
                globalThis,
                "fetch",
                async (_url, options) => {
                    signal = options?.signal as AbortSignal;
                    return await new Promise<Response>(() => {});
                },
            );
            await assert.rejects(
                jsonRequest("/relawan/sync/emergencies", {}, 15),
                (error) => {
                    assert.ok(error instanceof RequestTimeoutError);
                    assert.match(
                        error.message,
                        /Penerimaan server belum terkonfirmasi/,
                    );
                    return true;
                },
            );
            assert.equal(signal?.aborted, true);
            mock.mock.restore();
        },
    );
    await t.test(
        "headers alone do not finish the deadline when the response body stalls",
        async () => {
            const mock = t.mock.method(
                globalThis,
                "fetch",
                async () => new Response(new ReadableStream({ start() {} })),
            );
            await assert.rejects(
                jsonRequest("/relawan/sync/emergencies", {}, 15),
                RequestTimeoutError,
            );
            mock.mock.restore();
        },
    );
    await t.test(
        "late successful response cannot turn a timeout into acceptance",
        async () => {
            let finish!: (response: Response) => void;
            const mock = t.mock.method(
                globalThis,
                "fetch",
                () =>
                    new Promise<Response>((resolve) => {
                        finish = resolve;
                    }),
            );
            const request = jsonRequest("/relawan/sync/emergencies", {}, 15);
            await assert.rejects(request, RequestTimeoutError);
            finish(new Response('{"emergency":{"id":"stable-id"}}'));
            await assert.rejects(request, RequestTimeoutError);
            mock.mock.restore();
        },
    );
    await t.test("origin and CSRF guards still prevent a request", async () => {
        const mock = t.mock.method(
            globalThis,
            "fetch",
            async () => new Response("{}"),
        );
        await assert.rejects(
            jsonRequest("//example.invalid", {}),
            /same-origin/,
        );
        csrf = undefined;
        await assert.rejects(
            jsonRequest("/relawan/sync/emergencies", {}),
            MissingCsrfTokenError,
        );
        assert.equal(mock.mock.callCount(), 0);
        mock.mock.restore();
    });
});
