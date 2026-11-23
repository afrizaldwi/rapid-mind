import type { LocalAssessment, OutboxItem } from "./db";

// The accepted snapshot may be older than the current local draft. Advance only
// its server base, never replace the newer answers or claim that they synced.
export function receiptVersionPatch(
    local: LocalAssessment,
    item: OutboxItem,
    canonical: Partial<LocalAssessment>,
): Partial<LocalAssessment> {
    if (!canonical.server_version) return {};
    if ((local.server_version ?? null) !== (item.payload.base_version ?? null))
        throw new Error("Versi server asesmen berubah selama sinkronisasi.");
    return { server_version: canonical.server_version };
}
