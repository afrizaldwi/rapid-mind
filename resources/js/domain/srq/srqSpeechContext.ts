import { srqQuestions } from "./srqQuestions.ts";

const equivalents: ReadonlyArray<[RegExp, string]> = [
    [/\b(?:nggak|enggak|gak|ga|ngga|engga)\b/g, "tidak"],
    [/\b(?:iya|iyah|yaa+)\b/g, "ya"],
    [/\b(?:ibu\s*(?:\/|atau)?\s*bapak|bapak\s*(?:\/|atau)?\s*ibu|sdr\.?|saudara|ibu|bapak)\b\.?/g, "anda"],
    [/\bwaswas\b/g, "was was"],
    [/\bdegdegan\b/g, "deg degan"],
    [/\bmales\b/g, "malas"],
    [/\bgemeter\b/g, "gemetar"],
    [/\bkawatir\b/g, "khawatir"],
    [/\b(?:pengen|pingin)\b/g, "ingin"],
    [/\bngakhiri\b/g, "mengakhiri"],
    [/\bgampang\b/g, "mudah"],
    [/\bcepet\b/g, "cepat"],
    [/\blemes\b/g, "lemas"],
];

export function normalizeSrqTranscript(transcript: string): string {
    let normalized = transcript.normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase("id-ID")
        .replace(/[’']/g, "")
        .replace(/[-–—]/g, " ");
    for (const [pattern, replacement] of equivalents)
        normalized = normalized.replace(pattern, replacement);
    return normalized.replace(/[^\p{L}\p{N}?!.,;\s]/gu, " ")
        .replace(/\s+/g, " ").trim();
}

// Match complete displayed wording, allowing punctuation/spacing differences.
// Never promote the metadata keyword lists to answer evidence.
const anchors = srqQuestions.flatMap(({ number, question, script }) =>
    [question, script].map((text, index) => {
        const words = normalizeSrqTranscript(text).match(/[\p{L}\p{N}]+/gu)!;
        return {
            number,
            // The Q17 script is a compound question including nonspecific giving up.
            review: number === 17 && index === 1,
            pattern: new RegExp(`\\b${words.join("[\\s?!.,;]+")}\\b[?!.,;]*`, "g"),
            length: words.length,
        };
    }),
).sort((left, right) => right.length - left.length);

export function markSrqQuestions(normalized: string): string {
    for (const anchor of anchors) {
        normalized = normalized.replace(anchor.pattern,
            `; srqcontext${anchor.number}${anchor.review ? "review" : ""}; `);
    }
    return normalized.replace(/\bpernah (?:tidak )?kepikiran nyerah\b[?!.,;]*/g, "; srqcontext17concern; ");
}
