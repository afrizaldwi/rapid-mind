import { SrqCalculator } from "../domain/triage/srqCalculator.ts";
import { RiskCalculator } from "../domain/triage/riskCalculator.ts";
import { FunctionCalculator } from "../domain/triage/functionCalculator.ts";
import type { SrqAnswers } from "../domain/srq/srqAnswer.ts";

// Verify persisted evidence against the accepted calculators. Never return replacement scores.
export function validHealthcareScoringEvidence(
    triage: any,
    srq: SrqAnswers,
    risk: Record<string, boolean>,
    functions: Record<string, number>,
): boolean {
    if (!triage || typeof triage !== "object" || Array.isArray(triage))
        return false;
    const ranges: Record<string, number> = {
        srq_score: 20,
        risk_score: 8,
        function_score: 9,
        total_score: 37,
    };
    if (
        Object.entries(ranges).some(
            ([field, max]) =>
                !Number.isInteger(triage[field]) ||
                triage[field] < 0 ||
                triage[field] > max,
        )
    )
        return false;
    if (
        triage.srq_score !== new SrqCalculator().calculate(srq) ||
        triage.risk_score !== new RiskCalculator().calculate(risk) ||
        triage.function_score !==
            new FunctionCalculator().calculate(functions) ||
        triage.total_score !==
            triage.srq_score + triage.risk_score + triage.function_score
    )
        return false;

    // Laravel TriageCalculator / RedFlagDetector: clinical confirmation is never a system recommendation.
    const manual = triage.red_flag_source === "MANUAL_RED_FLAG";
    const redFlag = manual || srq[17] === true;
    if (
        triage.is_red_flag_override !== redFlag ||
        triage.red_flag_source !==
            (manual ? "MANUAL_RED_FLAG" : redFlag ? "SRQ_Q17" : null)
    )
        return false;
    if (redFlag) return triage.system_recommendation === "T0_SUSPECT";
    switch (triage.system_recommendation) {
        case "T1":
            return triage.total_score >= 15 || triage.function_score >= 6;
        case "T2":
            return (
                triage.total_score >= 7 &&
                triage.total_score < 15 &&
                triage.function_score < 6
            );
        case "T3":
            return triage.total_score < 7 && triage.function_score < 6;
        default:
            return false;
    }
}
