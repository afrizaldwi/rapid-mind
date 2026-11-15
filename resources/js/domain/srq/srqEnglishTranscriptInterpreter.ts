import { srqEnglishSpeechRules } from "./srqEnglishSpeechRules.ts";
import {
    markEnglishSrqQuestions,
    normalizeEnglishSrqTranscript,
} from "./srqEnglishSpeechContext.ts";
import type {
    SrqTranscriptInterpretation,
    SrqSpeechMatch,
    SrqSpeechUnresolved,
} from "./srqTranscriptInterpreter.ts";

const concern =
    /\b(?:die|ending my life|end my life|kill myself|live anymore|giving up|tired of living|suicidal thoughts|wish i (?:were|was) dead|thought of suicide|suicide)\b/;
const uncertain =
    /\b(?:might|may|could|maybe|perhaps|possibly|unsure|uncertain|not sure|do not know|not not|not that i do not)\b/;

function statementMatches(text: string) {
    return srqEnglishSpeechRules.flatMap((rule) =>
        ([true, false] as const).flatMap((answer) =>
            (answer ? rule.positivePatterns : rule.negativePatterns).some(
                (pattern) => pattern.test(text),
            )
                ? [{ questionNumber: rule.number, answer }]
                : [],
        ),
    );
}

function clausesFor(text: string): string[] {
    return markEnglishSrqQuestions(text)
        .replace(/\?/g, " srqinterrogative;")
        .replace(
            /\b(yes|no)\s+(?=(?:do|does|are|is|have|has) you(?:r)?\b)/g,
            "$1; ",
        )
        .split(/[!.;]+/)
        .flatMap((part) => {
            if (!/^\s*(?:i|my)\b/.test(part)) return [part];
            const corrected = part.replace(
                /,?\s+but (?:actually )?(?!(?:i|my)\b)/g,
                "; i ",
            );
            return corrected.split(";").flatMap((segment) => {
                let start = 0;
                return segment
                    .replace(
                        /(?:,\s*|\s+(?:but |and )?)(?=(?:i|my)\s)/g,
                        (separator: string, offset: number) => {
                            if (
                                !statementMatches(
                                    segment.slice(start, offset).trim(),
                                ).length
                            )
                                return separator;
                            start = offset + separator.length;
                            return "; ";
                        },
                    )
                    .split(";");
            });
        })
        .map((clause) => clause.trim())
        .filter(Boolean);
}

export function interpretEnglishSrqTranscript(
    transcript: string,
): SrqTranscriptInterpretation {
    const normalizedTranscript = normalizeEnglishSrqTranscript(transcript);
    const unresolved: SrqSpeechUnresolved[] = [];
    const evidence = new Map<
        number,
        { positive: string[]; negative: string[] }
    >();
    let requiresSafetyReview = false;
    let lastStatementQuestions: number[] = [];
    const qualifiedQuestions = new Set<number>();
    const record = (number: number, answer: boolean, text: string) => {
        const entry = evidence.get(number) ?? { positive: [], negative: [] };
        (answer ? entry.positive : entry.negative).push(text);
        evidence.set(number, entry);
        lastStatementQuestions = [number];
    };
    const reported =
        /["“”]|['‘]i\b/i.test(transcript) ||
        /\b(?:said|says|told|asked|quoted|example|sentence|according to)\b/.test(
            normalizedTranscript,
        ) ||
        /^(?:he|she|they|my (?:mother|father|friend|child))\b/.test(
            normalizedTranscript,
        );
    if (reported)
        return {
            normalizedTranscript,
            matches: [],
            unresolved: [
                {
                    questionNumbers: concern.test(normalizedTranscript)
                        ? [17]
                        : [],
                    evidence: normalizedTranscript,
                    reason: "uncertain_statement",
                },
            ],
            requiresSafetyReview: concern.test(normalizedTranscript),
        };

    const clauses = clausesFor(normalizedTranscript);
    for (let index = 0; index < clauses.length; index++) {
        const clause = clauses[index];
        const anchor = clause.match(/^srqcontext(\d+)(review|concern)?$/);
        if (anchor) {
            const number = Number(anchor[1]);
            const response = clauses[index + 1];
            if (response === "yes" || response === "no") {
                if (
                    anchor[2] === "concern" ||
                    (anchor[2] === "review" && response === "yes")
                ) {
                    requiresSafetyReview ||= response === "yes";
                    unresolved.push({
                        questionNumbers: [17],
                        evidence: clause,
                        reason: "uncertain_statement",
                    });
                } else
                    record(
                        number,
                        response === "yes",
                        `${clause}? ${response}`,
                    );
                index++;
            } else
                unresolved.push({
                    questionNumbers: [number],
                    evidence: clause,
                    reason: "question_without_response",
                });
            continue;
        }
        if (clause === "yes" || clause === "no") {
            unresolved.push({
                questionNumbers: [],
                evidence: clause,
                reason: "unanchored_response",
            });
            continue;
        }
        const questionOnly =
            /\b(?:srqinterrogative)\b/.test(clause) ||
            /^(?:do|does|are|is|have|has|can|would)\b/.test(clause);
        if (questionOnly || uncertain.test(clause)) {
            // These rewrites identify only the question being qualified. They
            // never supply an answer or turn uncertainty into affirmative evidence.
            const unqualified = clause
                .replace(/^i (?:might|may|could) not be /, "i am not ")
                .replace(/^i (?:might|may|could) be /, "i am ")
                .replace(/^i (?:might|may|could) not /, "i do not ")
                .replace(/^i (?:might|may|could) /, "i ");
            const explicitTargets = statementMatches(unqualified).map(
                (item) => item.questionNumber,
            );
            const targets = concern.test(clause)
                ? [17]
                : explicitTargets.length
                  ? explicitTargets
                  : lastStatementQuestions;
            if (!questionOnly) {
                for (const number of targets) qualifiedQuestions.add(number);
                requiresSafetyReview ||= targets.includes(17);
            }
            unresolved.push({
                questionNumbers: targets,
                evidence: clause,
                reason: "uncertain_statement",
            });
            if (questionOnly) lastStatementQuestions = [];
            continue;
        }
        const candidates = statementMatches(clause);
        if (candidates.length === 1)
            record(candidates[0].questionNumber, candidates[0].answer, clause);
        else if (candidates.length > 1)
            unresolved.push({
                questionNumbers: candidates.map((item) => item.questionNumber),
                evidence: clause,
                reason: "ambiguous_overlap",
            });
        else {
            const overlap = /^(?:i (?:am|feel) tired)$/.test(clause)
                ? [18, 20]
                : /^my stomach (?:cramps|feels crampy)$/.test(clause)
                  ? [7, 19]
                  : /^i do not feel like doing anything$/.test(clause)
                    ? [11, 15]
                    : [];
            unresolved.push({
                questionNumbers: overlap,
                evidence: clause,
                reason: overlap.length
                    ? "ambiguous_overlap"
                    : "uncertain_statement",
            });
            if (
                /^i\b/.test(clause) &&
                concern.test(clause) &&
                !/^i (?:am|feel) afraid (?:of|to) (?:die|dying)$/.test(clause)
            )
                requiresSafetyReview = true;
        }
    }
    const matches: SrqSpeechMatch[] = [...evidence.entries()]
        .filter(([number]) => !qualifiedQuestions.has(number))
        .sort(([a], [b]) => a - b)
        .map(([questionNumber, item]) => {
            const conflicting =
                !!item.positive.length && !!item.negative.length;
            return {
                questionNumber,
                status: conflicting ? "conflicting" : "matched",
                answer: conflicting ? undefined : !!item.positive.length,
                evidence: [...item.positive, ...item.negative],
                safetyReview: questionNumber === 17 && conflicting,
            };
        });
    return {
        normalizedTranscript,
        matches,
        unresolved,
        requiresSafetyReview:
            requiresSafetyReview || matches.some((match) => match.safetyReview),
    };
}
