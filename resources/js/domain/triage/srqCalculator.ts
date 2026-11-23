import { definitiveSrqAnswers, type SrqAnswers } from "../srq/srqAnswer.ts";

export class SrqCalculator {
    calculate(input: SrqAnswers): number {
        const answers = definitiveSrqAnswers(input);
        let score = 0;
        for (let i = 1; i <= 20; i++) {
            if (answers[i] === true) {
                score++;
            }
        }
        return score;
    }
}
