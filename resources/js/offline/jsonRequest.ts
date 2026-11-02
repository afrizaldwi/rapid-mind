export class MissingCsrfTokenError extends Error {
    constructor() {
        super("Missing CSRF token");
        this.name = "MissingCsrfTokenError";
    }
}

export const JSON_REQUEST_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
    constructor() {
        super(
            "Batas waktu permintaan terlampaui. Penerimaan server belum terkonfirmasi; catatan tetap menunggu sinkronisasi.",
        );
        this.name = "RequestTimeoutError";
    }
}

export async function jsonRequest(
    url: string,
    payload: unknown,
    timeoutMs = JSON_REQUEST_TIMEOUT_MS,
): Promise<Response> {
    if (!url.startsWith("/") || url.startsWith("//"))
        throw new Error("Only same-origin paths are allowed");
    const token = (
        document.querySelector(
            'meta[name="csrf-token"]',
        ) as HTMLMetaElement | null
    )?.content;
    if (!token) throw new MissingCsrfTokenError();
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
        throw new Error("Invalid request timeout");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            // Reject even if a transport ignores AbortSignal. The server may
            // already have committed: only canonical receipt removes the outbox.
            reject(new RequestTimeoutError());
            controller.abort();
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            timeout,
            (async () => {
                const response = await fetch(url, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": token,
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                // Include a stalled body in the deadline. Only small sync JSON
                // responses use this helper, never downloads.
                const body = await response.arrayBuffer();
                return new Response(
                    [204, 205, 304].includes(response.status) ? null : body,
                    {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                    },
                );
            })(),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
