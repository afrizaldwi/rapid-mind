export const RISK_WEIGHTS: Record<string, number> = {
  R1: 2, // Kehilangan berat
  R2: 2, // Trauma langsung
  R3: 1, // Kelompok rentan
  R4: 2, // Riwayat gangguan jiwa
  R5: 1, // Terputus obat kronis
};

export class RiskCalculator {
  calculate(indicators: Record<string, boolean>): number {
    let score = 0;
    for (const [key, weight] of Object.entries(RISK_WEIGHTS)) {
      if (indicators[key] === true) {
        score += weight;
      }
    }
    return score;
  }
}
