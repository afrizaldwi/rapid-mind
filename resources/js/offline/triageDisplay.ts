import type { TriageCategory } from '@/domain/triage/triageResult';
export interface DisplayTriage {
    srq_score: number;
    risk_score: number;
    function_score: number;
    total_score: number;
    system_recommendation: TriageCategory;
}
export function normalizeTriage(value: unknown): DisplayTriage | null {
    if (!value || typeof value !== 'object') return null;
    const result = value as Record<string, unknown>;
    const category = result.system_recommendation ?? result.recommendation;
    if (!['T0_SUSPECT', 'T0_CONFIRMED', 'T1', 'T2', 'T3'].includes(String(category))) return null;
    const scores = [result.srq_score ?? result.srqScore, result.risk_score ?? result.riskScore, result.function_score ?? result.functionScore, result.total_score ?? result.totalScore];
    if (!scores.every(score => typeof score === 'number' && Number.isFinite(score))) return null;
    return { srq_score: scores[0] as number, risk_score: scores[1] as number, function_score: scores[2] as number, total_score: scores[3] as number, system_recommendation: category as TriageCategory };
}
