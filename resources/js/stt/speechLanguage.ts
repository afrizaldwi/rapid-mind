export type SpeechLanguage = "id-ID" | "en-US";

export function isSpeechLanguage(value: unknown): value is SpeechLanguage {
    return value === "id-ID" || value === "en-US";
}
