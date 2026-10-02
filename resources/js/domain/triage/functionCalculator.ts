export class FunctionCalculator {
  private readonly domains = ['F1', 'F2', 'F3'];
  private readonly validLevels = [0, 1, 3];

  calculate(domains: Record<string, number>): number {
    let score = 0;
    for (const domain of this.domains) {
      const level = domains[domain];
      if (level !== undefined && this.validLevels.includes(level)) {
        score += level;
      }
    }
    return score;
  }
}
