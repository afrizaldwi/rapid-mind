import { isSpeechLanguage, type SpeechLanguage } from "../../stt/speechLanguage.ts";
import { interpretEnglishSrqTranscript } from "./srqEnglishTranscriptInterpreter.ts";
import { srqSpeechRules } from "./srqSpeechRules.ts";
import type { SrqAnswers } from "./srqAnswer.ts";
import { markSrqQuestions, normalizeSrqTranscript } from "./srqSpeechContext.ts";
export { normalizeSrqTranscript } from "./srqSpeechContext.ts";

export type SrqSpeechMatch = {
    questionNumber: number;
    status: "matched" | "conflicting";
    answer?: boolean;
    evidence: string[];
    safetyReview: boolean;
};

export type SrqSpeechUnresolved = {
    questionNumbers: number[];
    evidence: string;
    reason:
        | "question_without_response"
        | "unanchored_response"
        | "ambiguous_overlap"
        | "uncertain_statement";
};

export type SrqTranscriptInterpretation = {
    normalizedTranscript: string;
    matches: SrqSpeechMatch[];
    unresolved: SrqSpeechUnresolved[];
    requiresSafetyReview: boolean;
};

export type SrqSpeechAnswerUpdate = {
    questionNumber: number;
    answer: boolean;
};

function transcriptClauses(normalized: string): string[] {
    return normalized
        .replace(/\?/g, " srqinterrogative;")
        .replace(/\b(ya|tidak)\s+(?=apakah\b)/g, "$1; ")
        .split(/\s*[!.;]+\s*/)
        .flatMap(part => {
            // Split only within a self-report, never inside third-party speech.
            if (!/^(?:saya|aku)\b/.test(part.trim())) return [part];
            const subject = part.trim().split(/\s/)[0];
            const coordinated = part.replace(/,?\s+(?:tetapi|tapi|namun)(?: sebenarnya)?\s+(?!(?:saya|aku)\b)/g, `; ${subject} `);
            return coordinated.split(";").flatMap(segment => {
                let start = 0;
                const separated = segment.replace(/(?:,\s*|\s+(?:dan |tetapi |tapi |namun )?(?:sebenarnya )?)(?=(?:saya|aku)\s)/g,
                    (separator: string, offset: number) => {
                        const previous = segment.slice(start, offset).trim();
                        const complete = srqSpeechRules.some(rule =>
                            matchesAny(previous, [...rule.positivePatterns, ...rule.negativePatterns]));
                        if (!complete) return separator;
                        start = offset + separator.length;
                        return "; ";
                    });
                return separated.split(";");
            });
        })
        .map(clause => clause.trim())
        .filter(Boolean);
}

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

export function interpretSrqTranscript(
    transcript: string,
    language: SpeechLanguage = "id-ID",
): SrqTranscriptInterpretation {
    if (!isSpeechLanguage(language)) return {
        normalizedTranscript: transcript, matches: [],
        unresolved: [{ questionNumbers: [], evidence: transcript, reason: "uncertain_statement" }],
        requiresSafetyReview: false,
    };
    const hasIndonesian = /\b(?:saya|aku|apakah|nggak|gak)\b/i.test(transcript);
    const hasEnglish = /\b(?:i|my|yes|no)\b/i.test(transcript);
    if ((language === "en-US" && hasIndonesian) || (language === "id-ID" && hasEnglish)) {
        return { normalizedTranscript: transcript, matches: [],
            unresolved: [{ questionNumbers: [], evidence: transcript, reason: "uncertain_statement" }],
            requiresSafetyReview: /\b(?:ingin mati|mau mati|bunuh diri|mengakhiri hidup|tidak (?:mau|ingin) hidup|nyerah|want to die|ending my life|end my life|kill myself|giving up|live anymore|tired of living|suicidal thoughts|wish i (?:were|was) dead|thought of suicide|capek hidup)\b/i.test(transcript) };
    }
    if (language === "en-US") return interpretEnglishSrqTranscript(transcript);
    const normalizedTranscript = normalizeSrqTranscript(transcript);
    const clauses = transcriptClauses(markSrqQuestions(normalizedTranscript));
    const evidence = new Map<number, { positive: string[]; negative: string[] }>();
    const unresolved: SrqSpeechUnresolved[] = [];
    let safetyReview = false;
    const record = (number: number, answer: boolean, clause: string) => {
        const entry = evidence.get(number) ?? { positive: [], negative: [] };
        const target = answer ? entry.positive : entry.negative;
        if (!target.includes(clause)) target.push(clause);
        evidence.set(number, entry);
    };

    // Reported/quoted speech cannot establish the survivor's own answer.
    // Keep a credible Q17 concern on the human review path.
    const reported = /["“”]|['‘’](?:saya|aku)\b/i.test(transcript) ||
        /\b(?:kata|katanya|bilang|berkata|mengatakan|bertanya|menanyakan|menjawab|menceritakan|mendengar|menurut|contoh|kalimat|ucapan)\b/.test(normalizedTranscript) ||
        /^(?:dia|mereka|orang lain|teman saya|anak saya|ibu saya|bapak saya)\b/.test(normalizedTranscript);
    const concern = /\b(?:bunuh diri|mengakhiri hidup|ingin mati|mau mati|capek hidup|nyerah|tidak mau hidup)\b/.test(normalizedTranscript);
    if (reported) {
        return {
            normalizedTranscript, matches: [],
            unresolved: [{ questionNumbers: concern ? [17] : [], evidence: normalizedTranscript, reason: "uncertain_statement" }],
            requiresSafetyReview: concern,
        };
    }

    for (let index = 0; index < clauses.length; index++) {
        const clause = clauses[index];
        const marker = clause.match(/^srqcontext(\d+)(review|concern)?$/);
        const direct = clause.match(/^(.+?)[,\s]+(ya|tidak)$/);
        const question = (direct?.[1] ?? clause).replace(/ srqinterrogative$/, "");
        const anchored = marker ? [Number(marker[1])] : srqSpeechRules
            .filter(rule => rule.questionPatterns.some(pattern => question.match(pattern)?.[0] === question))
            .map(rule => rule.number);
        if (anchored.length) {
            const response = direct?.[2] ?? clauses[index + 1];
            if (anchored.length === 1 && (response === "ya" || response === "tidak")) {
                if (marker?.[2] === "concern" || (marker?.[2] === "review" && response === "ya")) {
                    // A yes to the compound Q17 script cannot resolve which part.
                    safetyReview ||= response === "ya";
                    unresolved.push({ questionNumbers: [17], evidence: clause, reason: "uncertain_statement" });
                } else record(anchored[0], response === "ya", `${question}? ${response}`);
                if (!direct) index++;
            } else unresolved.push({ questionNumbers: anchored, evidence: clause, reason: "question_without_response" });
            continue;
        }
        if (clause === "ya" || clause === "tidak") {
            unresolved.push({ questionNumbers: [], evidence: clause, reason: "unanchored_response" });
            continue;
        }

        const uncertain = /\b(?:mungkin|barangkali|sepertinya|entah|belum tentu|kadang iya|tidak tahu|tidak yakin|bukan tidak|tidak tidak)\b/.test(clause);
        const questionOnly = /\b(?:apakah|apa|kah|srqinterrogative)\b/.test(clause);
        if (uncertain || questionOnly) {
            unresolved.push({ questionNumbers: [], evidence: clause, reason: "uncertain_statement" });
            safetyReview ||= !questionOnly && concern;
            continue;
        }
        const candidates: SrqSpeechAnswerUpdate[] = [];
        for (const rule of srqSpeechRules) {
            for (const [answer, patterns] of [[true, rule.positivePatterns], [false, rule.negativePatterns]] as const) {
                // Elliptical symptom responses are supported only as a complete,
                // single utterance. Q17 always requires an explicit self-report.
                if (matchesAny(clause, patterns) ||
                    (clauses.length === 1 && rule.number !== 17 && matchesAny(`saya ${clause}`, patterns)))
                    candidates.push({ questionNumber: rule.number, answer });
            }
        }
        if (candidates.length === 1 ||
            // Explicit fear AND worry names two symptoms rather than one overlap.
            /^(?:saya|aku) (?:merasa )?takut dan khawatir$/.test(clause)) {
            for (const candidate of candidates) record(candidate.questionNumber, candidate.answer, clause);
        } else if (candidates.length > 1) {
            unresolved.push({ questionNumbers: candidates.map(item => item.questionNumber), evidence: clause, reason: "ambiguous_overlap" });
        }
        if (/^(?:(?:saya|aku) (?:merasa )?)?(?:capek|lelah|lemas)$/.test(clause))
            unresolved.push({ questionNumbers: [18, 20], evidence: clause, reason: "ambiguous_overlap" });
        if (/^(?:saya|aku) (?:merasa )?(?:perut (?:saya )?melilit|malas (?:ngapa ngapain|semua))$/.test(clause))
            unresolved.push({ questionNumbers: clause.includes("perut") ? [7, 19] : [11, 15], evidence: clause, reason: "ambiguous_overlap" });
        if (!candidates.length && /^(?:saya|aku)\b/.test(clause) &&
            /\b(?:bunuh diri|mengakhiri hidup|ingin mati|mau mati|capek hidup|nyerah|tidak mau hidup)\b/.test(clause)) {
            safetyReview = true;
            unresolved.push({ questionNumbers: [17], evidence: clause, reason: "uncertain_statement" });
        }
    }

    const matches = [...evidence.entries()]
        .sort(([left], [right]) => left - right)
        .map(([questionNumber, item]): SrqSpeechMatch => {
            const conflicting =
                item.positive.length > 0 && item.negative.length > 0;
            return {
                questionNumber,
                status: conflicting ? "conflicting" : "matched",
                answer: conflicting ? undefined : item.positive.length > 0,
                evidence: [...item.positive, ...item.negative],
                safetyReview: questionNumber === 17 && conflicting,
            };
        });

    return {
        normalizedTranscript,
        matches,
        unresolved,
        requiresSafetyReview: safetyReview || matches.some((match) => match.safetyReview),
    };
}

export function selectSrqSpeechAnswerUpdates(
    interpretation: SrqTranscriptInterpretation,
    currentAnswers: Readonly<SrqAnswers>,
    sttOwnedAnswers: ReadonlySet<number>,
    manualOverrides: ReadonlySet<number>,
): { accepted: SrqSpeechAnswerUpdate[]; protectedQuestionNumbers: number[] } {
    const accepted: SrqSpeechAnswerUpdate[] = [];
    const protectedQuestionNumbers: number[] = [];

    for (const match of interpretation.matches) {
        if (match.status !== "matched" || typeof match.answer !== "boolean")
            continue;
        const canUpdate =
            !manualOverrides.has(match.questionNumber) &&
            (currentAnswers[match.questionNumber] === undefined ||
                currentAnswers[match.questionNumber] === "UNANSWERED" ||
                (typeof currentAnswers[match.questionNumber] === "boolean" &&
                    sttOwnedAnswers.has(match.questionNumber)));
        if (canUpdate)
            accepted.push({
                questionNumber: match.questionNumber,
                answer: match.answer,
            });
        else protectedQuestionNumbers.push(match.questionNumber);
    }

    return { accepted, protectedQuestionNumbers };
}
