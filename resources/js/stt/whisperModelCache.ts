export const WHISPER_MODEL_CACHE = "transformers-cache";
export type WhisperModelSource = "cache" | "browser_fetch" | "unknown";

export class WhisperModelCacheError extends Error {
    readonly code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
}

// Structural checks only, not a checksum or a complete ONNX validator. Read a
// small prefix of binary artifacts; never duplicate a whole model in memory.
async function usableModelArtifact(response: Response, filename: string): Promise<boolean> {
    if (response.status !== 200 || response.redirected || !response.body) return false;
    if (filename.endsWith(".json")) {
        try {
            const bytes = await response.clone().arrayBuffer();
            const declaredLength = Number(response.headers.get("Content-Length"));
            if (declaredLength > 0 && response.headers.get("Content-Encoding") === "identity" && declaredLength !== bytes.byteLength) return false;
            const value = JSON.parse(new TextDecoder().decode(bytes));
            return value !== null && typeof value === "object";
        } catch { return false; }
    }
    const reader = response.clone().body!.getReader();
    const prefix: number[] = [];
    let ended = false;
    try {
        while (prefix.length < 64) {
            const next = await reader.read();
            if (next.done) { ended = true; break; }
            prefix.push(...next.value.subarray(0, 64 - prefix.length));
        }
    } catch { return false; }
    finally {
        // A clone tees the body. Awaiting cancel here can deadlock until the
        // original response is read by Transformers.js / Cache.put.
        void reader.cancel().catch(() => {});
    }
    if (!prefix.length) return false;
    const text = new TextDecoder().decode(new Uint8Array(prefix)).trimStart();
    if (/^(?:<!doctype html|<html|<head|<body)/i.test(text)) return false;
    // Cross-origin compressed responses may hide Content-Encoding while exposing
    // compressed Content-Length. Only explicit identity encoding is comparable.
    const length = Number(response.headers.get("Content-Length"));
    if (ended && length > 0 && response.headers.get("Content-Encoding") === "identity" && length !== prefix.length) return false;
    if (filename.endsWith(".onnx") && /^(?:\{|\[)/.test(text)) return false;
    return true;
}

// Supported Transformers.js custom-cache API, backed by its SAME Cache Storage
// bucket and unchanged request keys. Transformers still fetches and writes files.
export class WhisperModelCache {
    private readonly hits = new Set<string>();
    private readonly rejected = new Set<string>();
    private writeFailed = false;
    hadMiss = false;
    constructor(cache: Cache, modelId: string) {
        this.cache = cache;
        this.modelId = modelId;
    }
    private readonly cache: Cache;
    private readonly modelId: string;

    private filename(request: RequestInfo | URL): string {
        const raw = typeof request === "string" ? request : request instanceof URL ? request.href : request.url;
        const path = new URL(raw, "https://cache-key.invalid").pathname;
        const marker = `/${this.modelId}/`;
        const index = path.indexOf(marker);
        return index < 0 ? path : path.slice(index + marker.length).replace(/^resolve\/[^/]+\//, "");
    }
    beginFile(filename: string): void { this.hits.delete(filename); }
    source(filename: string, localOnly: boolean): WhisperModelSource {
        return this.hits.has(filename) ? "cache" : localOnly ? "unknown" : "browser_fetch";
    }
    async match(request: RequestInfo | URL): Promise<Response | undefined> {
        const filename = this.filename(request);
        const response = await this.cache.match(request);
        if (response && await usableModelArtifact(response, filename)) {
            this.hits.add(filename);
            return response;
        }
        this.hadMiss = true;
        if (response) this.rejected.add(filename);
        return undefined;
    }
    async put(request: RequestInfo | URL, response: Response): Promise<void> {
        try {
            if (!await usableModelArtifact(response, this.filename(request))) throw new Error("Invalid model artifact");
            await this.cache.put(request, response);
        } catch (error) {
            this.writeFailed = true;
            throw error;
        }
    }
    assertPersisted(): void {
        if (this.writeFailed) throw new WhisperModelCacheError("model_cache_unavailable", "Cache model tidak dapat disimpan. Periksa izin dan ruang penyimpanan browser.");
    }
    get hasRejectedArtifacts(): boolean { return this.rejected.size > 0; }
}
