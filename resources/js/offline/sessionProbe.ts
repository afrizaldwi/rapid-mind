export type SessionStatusPayload = {
    state?: string;
    user?: { id?: unknown; role?: unknown };
};

// The deadline includes body consumption, even when headers arrive promptly.
export async function probeRelawanSession(timeoutMs = 7_000): Promise<{
    response: Response;
    payload: SessionStatusPayload;
}> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error("Pemeriksaan sesi melewati batas waktu."));
            controller.abort();
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            deadline,
            (async () => {
                const response = await fetch("/relawan/session-status", {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                });
                if (response.status >= 500) return { response, payload: {} };
                const body = await response.text();
                let payload: SessionStatusPayload = {};
                try {
                    payload = JSON.parse(body) ?? {};
                } catch {
                    /* Invalid JSON is not authentication. */
                }
                return { response, payload };
            })(),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
