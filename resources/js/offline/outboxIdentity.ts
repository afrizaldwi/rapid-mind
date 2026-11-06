// Gaps are valid reservations. A damaged/missing high-water mark is never
// silently repaired for an initialized encrypted queue.
export function allocateOutboxIdentity(
    plainId: number | undefined,
    encryptedId: number | undefined,
    lastId: number | undefined,
    receiptIds: Array<number | undefined>,
    syntheticLegacy = false,
): number {
    for (const value of [plainId, encryptedId])
        if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0))
            throw new Error("Identitas antrean rusak.");
    if (lastId !== undefined && (!Number.isSafeInteger(lastId) || lastId < 0))
        throw new Error("Batas identitas antrean rusak.");
    if (
        !syntheticLegacy &&
        lastId === undefined &&
        (plainId !== undefined ||
            encryptedId !== undefined ||
            receiptIds.length > 0)
    )
        throw new Error(
            "Batas identitas antrean hilang. Data tetap tersimpan.",
        );
    let observed = Math.max(plainId ?? 0, encryptedId ?? 0);
    for (const receiptId of receiptIds) {
        // Older receipts cannot prove an issued ID. Keep them intact and block
        // production allocation rather than guessing a replacement high-water.
        if (receiptId === undefined && syntheticLegacy) continue;
        if (
            typeof receiptId !== "number" ||
            !Number.isSafeInteger(receiptId) ||
            receiptId <= 0
        )
            throw new Error(
                "Bukti identitas antrean tidak lengkap atau rusak.",
            );
        observed = Math.max(observed, receiptId);
    }
    if (lastId !== undefined && lastId < observed)
        throw new Error("Batas identitas antrean tidak konsisten.");
    const id = Math.max(observed, lastId ?? 0) + 1;
    if (!Number.isSafeInteger(id)) throw new Error("Identitas antrean habis.");
    return id;
}
