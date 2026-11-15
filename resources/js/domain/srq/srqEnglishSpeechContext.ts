import en from "../../i18n/locales/en.ts";

// Reuse the exact content displayed by the English UI, independent of UI locale.
export const srqEnglishQuestions = Object.entries(en.assessment.srq.questions)
    .map(([number, content]) => ({ number: Number(number), ...content }));

export function normalizeEnglishSrqTranscript(transcript: string): string {
    return transcript.normalize("NFKC").toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\bi'm\b/g, "i am")
        .replace(/\bi've\b/g, "i have")
        .replace(/\bdon't\b/g, "do not")
        .replace(/\bdoesn't\b/g, "does not")
        .replace(/\bcan't\b/g, "cannot")
        .replace(/\b(?:can not)\b/g, "cannot")
        .replace(/\baren't\b/g, "are not")
        .replace(/\bisn't\b/g, "is not")
        .replace(/\bhaven't\b/g, "have not")
        .replace(/\b(?:yeah|yep)\b/g, "yes")
        .replace(/\bnope\b/g, "no")
        .replace(/[-–—/]/g, " ")
        .replace(/[^a-z0-9?!.,;\s]/g, " ")
        .replace(/\s+/g, " ").trim();
}

const anchors = srqEnglishQuestions.flatMap(({ number, question, script }) =>
    [question, script].map((text, index) => {
        const words = normalizeEnglishSrqTranscript(text).match(/[a-z0-9]+/g)!;
        return {
            marker: `srqcontext${number}${number === 17 && index === 1 ? "review" : ""}`,
            pattern: new RegExp(`\\b${words.join("[\\s?!.,;]+")}\\b[?!.,;]*`, "g"),
            length: words.length,
        };
    }),
).sort((a, b) => b.length - a.length);

export function markEnglishSrqQuestions(text: string): string {
    for (const { pattern, marker } of anchors)
        text = text.replace(pattern, `; ${marker}; `);
    // This question concerns nonspecific giving up, not definitive Q17 evidence.
    text = text.replace(/\b(?:do you want to die|are you thinking (?:about|of) ending your life|do you have thoughts of ending your life)\b[?!.,;]*/g, "; srqcontext17; ");
    return text.replace(/\bhave you (?:ever )?felt like giving up\b[?!.,;]*/g, "; srqcontext17concern; ");
}
