import { cacheableAsset } from "../pwa/assetCachePolicy.ts";

export const WHISPER_RUNTIME_REPAIR_HEADER = "X-Rapid-Mind-Runtime-Repair";

export class WhisperRuntimeCacheError extends Error {
    readonly code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
}

async function usableRuntime(response: Response, url: string): Promise<boolean> {
    if (!cacheableAsset(new Request(url), response) || !response.body) return false;
    const reader = response.clone().body!.getReader();
    const prefix: number[] = [];
    try {
        while (prefix.length < 64) {
            const next = await reader.read();
            if (next.done) break;
            prefix.push(...next.value.subarray(0, 64 - prefix.length));
        }
    } catch { return false; }
    finally { void reader.cancel().catch(() => {}); }
    if (new URL(url).pathname.endsWith(".wasm"))
        return [0, 97, 115, 109, 1, 0, 0, 0].every((byte, index) => prefix[index] === byte);
    const text = new TextDecoder().decode(new Uint8Array(prefix)).trimStart();
    return text.length > 0 && !/^(?:<!doctype html|<html|<head|<body)/i.test(text);
}

export async function cachedWhisperRuntime(cache: Cache, url: string, online: boolean): Promise<Response> {
    const cached = await cache.match(url);
    if (cached && await usableRuntime(cached, url)) return cached;
    if (!online) throw new WhisperRuntimeCacheError("runtime_cache_missing_offline", "Berkas runtime belum tersedia atau tidak valid. Siapkan Whisper saat internet tersedia.");
    const response = await fetch(url, {
        credentials: "same-origin",
        // Reload only this proven-invalid artifact, not any intact cache entry.
        cache: cached ? "reload" : "default",
        ...(cached ? { headers: { [WHISPER_RUNTIME_REPAIR_HEADER]: "1" } } : {}),
    });
    if (!await usableRuntime(response, url)) throw new WhisperRuntimeCacheError("runtime_asset_invalid", "Respons berkas runtime Whisper tidak valid.");
    try { await cache.put(url, response.clone()); }
    catch { throw new WhisperRuntimeCacheError("runtime_cache_unavailable", "Berkas runtime tidak dapat disimpan di cache browser."); }
    return response;
}
