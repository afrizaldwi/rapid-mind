import { SrqCalculator } from "./srqCalculator.ts";
import { definitiveSrqAnswers } from "../srq/srqAnswer.ts";
import { RiskCalculator } from "./riskCalculator.ts";
import { FunctionCalculator } from "./functionCalculator.ts";
import { RedFlagDetector } from "./redFlagDetector.ts";
import type { TriageCategory, TriageResult } from "./triageResult";

export class TriageCalculator {
    constructor(
        private readonly srqCalculator = new SrqCalculator(),
        private readonly riskCalculator = new RiskCalculator(),
        private readonly functionCalculator = new FunctionCalculator(),
        private readonly redFlagDetector = new RedFlagDetector(),
    ) {}

    calculate(
        srqAnswers: import("../srq/srqAnswer").SrqAnswers,
        riskIndicators: Record<string, boolean>,
        functionDomains: Record<string, number>,
        manualRedFlag = false,
    ): TriageResult {
        const normalizedSrq = definitiveSrqAnswers(srqAnswers);
        const srqScore = this.srqCalculator.calculate(normalizedSrq);
        const riskScore = this.riskCalculator.calculate(riskIndicators);
        const functionScore =
            this.functionCalculator.calculate(functionDomains);
        const totalScore = srqScore + riskScore + functionScore;

        const redFlag = this.redFlagDetector.detect(
            normalizedSrq,
            manualRedFlag,
        );

        if (redFlag.detected) {
            return {
                srqScore,
                riskScore,
                functionScore,
                totalScore,
                recommendation: "T0_SUSPECT",
                isRedFlagOverride: true,
                redFlagSource: redFlag.source,
            };
        }

        const recommendation = this.categorize(totalScore, functionScore);

        return {
            srqScore,
            riskScore,
            functionScore,
            totalScore,
            recommendation,
            isRedFlagOverride: false,
            redFlagSource: null,
        };
    }

    private categorize(
        totalScore: number,
        functionScore: number,
    ): TriageCategory {
        if (totalScore >= 15 || functionScore >= 6) {
            return "T1";
        }
        if (totalScore >= 7) {
            return "T2";
        }
        return "T3";
    }
}
