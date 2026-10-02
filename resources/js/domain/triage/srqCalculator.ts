export class SrqCalculator {
  calculate(answers: Record<number, boolean>): number {
    let score = 0;
    for (let i = 1; i <= 20; i++) {
      if (answers[i] === true) {
        score++;
      }
    }
    return score;
  }
}
