// Preserve the original response URL/redirect semantics after consuming a clone.
// An unresponsive transport must not indefinitely prevent the cached field shell.
export async function fetchRelawanNavigation(
    request: Request,
    timeoutMs = 7_000,
): Promise<Response> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error("Navigasi server melewati batas waktu."));
            controller.abort();
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            deadline,
            (async () => {
                const response = await fetch(request, {
                    signal: controller.signal,
                    cache: "no-store",
                });
                if (response.status >= 500)
                    throw new Error("Server tidak tersedia.");
                await response.clone().arrayBuffer();
                return response;
            })(),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
