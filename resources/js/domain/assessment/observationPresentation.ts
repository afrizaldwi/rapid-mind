import type {
    NonVerbalObservations,
    NonVerbalReason,
} from "./nonVerbalObservations.ts";
export const observationLabels: Record<NonVerbalReason, string> = {
    NOT_SPEAKING: "Tidak berbicara saat interaksi",
    SEVERE_DISTRESS: "Tampak mengalami distres berat",
    SPEECH_DIFFICULTY: "Kesulitan berbicara",
    HEARING_COMMUNICATION_BARRIER: "Hambatan pendengaran atau komunikasi",
    CHOOSES_NOT_TO_SPEAK: "Memilih tidak berbicara",
    UNKNOWN: "Alasan belum diketahui",
    OTHER: "Lainnya",
};
export function toggleObservation(
    current: NonVerbalObservations,
    code: NonVerbalReason,
): NonVerbalObservations {
    const selected = current.non_verbal_reasons ?? [];
    const reasons = selected.includes(code)
        ? selected.filter((value) => value !== code)
        : code === "UNKNOWN"
          ? [code]
          : [...selected.filter((value) => value !== "UNKNOWN"), code];
    return {
        non_verbal_reasons: reasons,
        non_verbal_other_note: reasons.includes("OTHER")
            ? (current.non_verbal_other_note ?? null)
            : null,
    };
}
