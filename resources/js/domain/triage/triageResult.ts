export type TriageCategory = 'T0_SUSPECT' | 'T0_CONFIRMED' | 'T1' | 'T2' | 'T3';

export interface TriageResult {
  srqScore: number;
  riskScore: number;
  functionScore: number;
  totalScore: number;
  recommendation: TriageCategory;
  isRedFlagOverride: boolean;
  redFlagSource: string | null;
}
