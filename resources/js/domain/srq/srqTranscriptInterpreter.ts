import { srqSpeechRules } from "./srqSpeechRules.ts";

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
        | "ambiguous_overlap";
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

const conversationalEquivalents: ReadonlyArray<[RegExp, string]> = [
    [/\b(?:nggak|enggak|gak|ga)\b/g, "tidak"],
    [/\b(?:iya|iyah|yaa+)\b/g, "ya"],
];

export function normalizeSrqTranscript(transcript: string): string {
    let normalized = transcript
        .normalize("NFKC")
        .toLocaleLowerCase("id-ID")
        .replace(/[’']/g, "")
        .replace(/[-–—]/g, " ");

    for (const [pattern, replacement] of conversationalEquivalents) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized
        .replace(/[^\p{L}\p{N}?!.,;\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function transcriptClauses(normalized: string): string[] {
    return normalized
        .replace(
            /,\s*(?=(?:saya|aku)\s+(?:sering|susah|sulit|merasa|tidak|ingin|mau|mudah|cepat|gampang|kehilangan|menangis|baru))/g,
            "; ",
        )
        .replace(
            /\s+(?=(?:saya|aku)\s+(?:sering|susah|sulit|merasa|tidak|ingin|mau|mudah|cepat|gampang|kehilangan|menangis|baru))/g,
            "; ",
        )
        .split(/\s*[?!.;]+\s*/)
        .map((clause) => clause.trim())
        .filter(Boolean);
}

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

export function interpretSrqTranscript(
    transcript: string,
): SrqTranscriptInterpretation {
    const normalizedTranscript = normalizeSrqTranscript(transcript);
    const clauses = transcriptClauses(normalizedTranscript);
    const evidence = new Map<
        number,
        { positive: string[]; negative: string[] }
    >();
    const unresolved: SrqSpeechUnresolved[] = [];

    const record = (
        questionNumber: number,
        answer: boolean,
        clause: string,
    ) => {
        const entry = evidence.get(questionNumber) ?? {
            positive: [],
            negative: [],
        };
        const target = answer ? entry.positive : entry.negative;
        if (!target.includes(clause)) target.push(clause);
        evidence.set(questionNumber, entry);
    };

    for (const clause of clauses) {
        for (const rule of srqSpeechRules) {
            if (matchesAny(clause, rule.positivePatterns))
                record(rule.number, true, clause);
            if (matchesAny(clause, rule.negativePatterns))
                record(rule.number, false, clause);
        }
    }

    for (let index = 0; index < clauses.length; index += 1) {
        const clause = clauses[index];
        const anchoredRules = srqSpeechRules.filter((rule) =>
            matchesAny(clause, rule.questionPatterns),
        );
        if (anchoredRules.length !== 1) continue;

        const response = clauses[index + 1];
        if (response === "ya" || response === "tidak") {
            record(
                anchoredRules[0].number,
                response === "ya",
                `${clause}? ${response}`,
            );
            index += 1;
        } else {
            unresolved.push({
                questionNumbers: [anchoredRules[0].number],
                evidence: clause,
                reason: "question_without_response",
            });
        }
    }

    if (
        clauses.length === 1 &&
        (clauses[0] === "ya" || clauses[0] === "tidak")
    ) {
        unresolved.push({
            questionNumbers: [],
            evidence: clauses[0],
            reason: "unanchored_response",
        });
    }

    for (const clause of clauses) {
        if (
            /\b(?:saya|aku) (?:merasa )?(?:lelah|capek)\b/.test(clause) &&
            !/\b(?:sepanjang waktu|setiap waktu|terus menerus|mudah|cepat|gampang|baru)\b/.test(
                clause,
            )
        ) {
            unresolved.push({
                questionNumbers: [18, 20],
                evidence: clause,
                reason: "ambiguous_overlap",
            });
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
        requiresSafetyReview: matches.some((match) => match.safetyReview),
    };
}

export function selectSrqSpeechAnswerUpdates(
    interpretation: SrqTranscriptInterpretation,
    currentAnswers: Readonly<Record<number, boolean>>,
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
            (typeof currentAnswers[match.questionNumber] !== "boolean" ||
                sttOwnedAnswers.has(match.questionNumber));
        if (canUpdate)
            accepted.push({
                questionNumber: match.questionNumber,
                answer: match.answer,
            });
        else protectedQuestionNumbers.push(match.questionNumber);
    }

    return { accepted, protectedQuestionNumbers };
}
