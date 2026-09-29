<?php

declare(strict_types=1);

namespace App\Domain\Triage;

use App\Enums\TriageCategory;

final class TriageCalculator
{
    public function __construct(
        private readonly SrqCalculator $srqCalculator,
        private readonly RiskCalculator $riskCalculator,
        private readonly FunctionCalculator $functionCalculator,
        private readonly RedFlagDetector $redFlagDetector,
    ) {}

    /**
     * Calculate the integrated triage result.
     *
     * Thresholds from workflow.md:
     *   T0 = Red Flag override (Q17 = YES or manual trigger) — bypasses score
     *   T1 = Total ≥ 15 OR Function Score ≥ 6
     *   T2 = Total 7–14
     *   T3 = Total 0–6
     *
     * @param array<int, bool> $srqAnswers SRQ-20 answers (keyed 1–20)
     * @param array<string, bool> $riskIndicators Risk indicators (keyed R1–R5)
     * @param array<string, int> $functionDomains Function domains (keyed F1–F3, values 0|1|3)
     * @param bool $manualRedFlag Whether the floating Red Flag button was pressed
     */
    public function calculate(
        array $srqAnswers,
        array $riskIndicators,
        array $functionDomains,
        bool $manualRedFlag = false,
    ): TriageResultValue {
        // Calculate individual scores
        $srqScore = $this->srqCalculator->calculate($srqAnswers);
        $riskScore = $this->riskCalculator->calculate($riskIndicators);
        $functionScore = $this->functionCalculator->calculate($functionDomains);
        $totalScore = $srqScore + $riskScore + $functionScore;

        // Check Red Flag override — bypasses all score thresholds
        $redFlag = $this->redFlagDetector->detect($srqAnswers, $manualRedFlag);

        if ($redFlag['detected']) {
            return new TriageResultValue(
                srqScore: $srqScore,
                riskScore: $riskScore,
                functionScore: $functionScore,
                totalScore: $totalScore,
                recommendation: TriageCategory::T0_SUSPECT,
                isRedFlagOverride: true,
                redFlagSource: $redFlag['source'],
            );
        }

        // Determine triage category by score thresholds
        $recommendation = $this->categorize($totalScore, $functionScore);

        return new TriageResultValue(
            srqScore: $srqScore,
            riskScore: $riskScore,
            functionScore: $functionScore,
            totalScore: $totalScore,
            recommendation: $recommendation,
            isRedFlagOverride: false,
            redFlagSource: null,
        );
    }

    /**
     * Determine triage category from scores.
     *
     * T1 = Total ≥ 15 OR Function ≥ 6
     * T2 = Total 7–14
     * T3 = Total 0–6
     */
    private function categorize(int $totalScore, int $functionScore): TriageCategory
    {
        // T1: severe distress/impairment
        if ($totalScore >= 15 || $functionScore >= 6) {
            return TriageCategory::T1;
        }

        // T2: moderate distress
        if ($totalScore >= 7) {
            return TriageCategory::T2;
        }

        // T3: mild/resilient
        return TriageCategory::T3;
    }
}

