export const nonVerbalReasonCodes = [
    "NOT_SPEAKING",
    "SEVERE_DISTRESS",
    "SPEECH_DIFFICULTY",
    "HEARING_COMMUNICATION_BARRIER",
    "CHOOSES_NOT_TO_SPEAK",
    "UNKNOWN",
    "OTHER",
] as const;
export type NonVerbalReason = (typeof nonVerbalReasonCodes)[number];
export type NonVerbalObservations = {
    non_verbal_reasons?: NonVerbalReason[];
    non_verbal_other_note?: string | null;
};

export function normalizeObservations(
    input: NonVerbalObservations,
): NonVerbalObservations {
    if (input.non_verbal_reasons === undefined) {
        if (input.non_verbal_other_note !== undefined)
            throw new Error("Kirim daftar observasi bersama catatan lainnya.");
        return {};
    }
    const reasons = input.non_verbal_reasons;
    if (
        !Array.isArray(reasons) ||
        reasons.some((code) => !nonVerbalReasonCodes.includes(code)) ||
        new Set(reasons).size !== reasons.length
    )
        throw new Error("Kode observasi tidak valid.");
    if (reasons.includes("UNKNOWN") && reasons.length !== 1)
        throw new Error("UNKNOWN tidak boleh digabung dengan observasi lain.");
    const note = input.non_verbal_other_note ?? null;
    if (
        note !== null &&
        (typeof note !== "string" ||
            Array.from(note).length > 500 ||
            !reasons.includes("OTHER"))
    )
        throw new Error(
            "Catatan observasi hanya untuk OTHER, maksimal 500 karakter.",
        );
    return {
        non_verbal_reasons: [...reasons].sort(),
        non_verbal_other_note: note,
    };
}

export function mergeObservations(
    server: NonVerbalObservations,
    local: NonVerbalObservations,
): NonVerbalObservations {
    return {
        ...normalizeObservations(server),
        ...normalizeObservations(local),
    };
}
