<?php

declare(strict_types=1);

namespace Tests\Unit\Triage;

use App\Domain\Triage\FunctionCalculator;
use App\Domain\Triage\RedFlagDetector;
use App\Domain\Triage\RiskCalculator;
use App\Domain\Triage\SrqCalculator;
use App\Domain\Triage\TriageCalculator;
use App\Enums\TriageCategory;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class TriageCalculatorTest extends TestCase
{
    private TriageCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->calculator = new TriageCalculator(
            new SrqCalculator(),
            new RiskCalculator(),
            new FunctionCalculator(),
            new RedFlagDetector(),
        );
    }

    // ──────────────────────────────────────────────
    // T0 Red Flag Override
    // ──────────────────────────────────────────────

    #[Test]
    public function t0_triggered_by_q17_yes(): void
    {
        $srq = array_fill(1, 20, false);
        $srq[17] = true; // Ideasi bunuh diri

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T0_SUSPECT, $result->recommendation);
        $this->assertTrue($result->isRedFlagOverride);
        $this->assertSame('SRQ_Q17', $result->redFlagSource);
        $this->assertSame(1, $result->srqScore);
    }

    #[Test]
    public function t0_triggered_by_manual_red_flag(): void
    {
        $srq = array_fill(1, 20, false);

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
            manualRedFlag: true,
        );

        $this->assertSame(TriageCategory::T0_SUSPECT, $result->recommendation);
        $this->assertTrue($result->isRedFlagOverride);
        $this->assertSame('MANUAL_RED_FLAG', $result->redFlagSource);
    }

    #[Test]
    public function t0_manual_takes_precedence_over_q17(): void
    {
        $srq = array_fill(1, 20, false);
        $srq[17] = true;

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
            manualRedFlag: true,
        );

        $this->assertSame(TriageCategory::T0_SUSPECT, $result->recommendation);
        $this->assertSame('MANUAL_RED_FLAG', $result->redFlagSource);
    }

    // ──────────────────────────────────────────────
    // T1: Total ≥ 15 OR Function ≥ 6
    // ──────────────────────────────────────────────

    #[Test]
    public function t1_by_high_total_score(): void
    {
        // SRQ: 10 YES = 10, Risk: R1+R2+R4 = 6, Function: F1=0 = 0 → Total = 16
        $srq = array_fill(1, 20, false);
        for ($i = 1; $i <= 10; $i++) {
            $srq[$i] = true;
        }

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => true, 'R3' => false, 'R4' => true, 'R5' => false],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T1, $result->recommendation);
        $this->assertSame(16, $result->totalScore);
        $this->assertFalse($result->isRedFlagOverride);
    }

    #[Test]
    public function t1_by_exact_boundary_15(): void
    {
        // SRQ: 8 YES = 8, Risk: R1+R2+R3 = 5, Function: F1=1+F2=1 = 2 → Total = 15
        $srq = array_fill(1, 20, false);
        for ($i = 1; $i <= 8; $i++) {
            $srq[$i] = true;
        }

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => true, 'R3' => true, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 1, 'F2' => 1, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T1, $result->recommendation);
        $this->assertSame(15, $result->totalScore);
    }

    #[Test]
    public function t1_by_functional_override(): void
    {
        // Low total but function ≥ 6: SRQ=0, Risk=0, Function=F1:3+F2:3+F3:0=6
        $srq = array_fill(1, 20, false);

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 3, 'F2' => 3, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T1, $result->recommendation);
        $this->assertSame(6, $result->totalScore);
        $this->assertSame(6, $result->functionScore);
    }

    #[Test]
    public function t1_by_functional_override_max_function(): void
    {
        // Function = 9 (all domains lumpuh), total = 9
        $srq = array_fill(1, 20, false);

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 3, 'F2' => 3, 'F3' => 3],
        );

        $this->assertSame(TriageCategory::T1, $result->recommendation);
        $this->assertSame(9, $result->functionScore);
    }

    // ──────────────────────────────────────────────
    // T2: Total 7–14
    // ──────────────────────────────────────────────

    #[Test]
    public function t2_at_lower_boundary(): void
    {
        // SRQ: 5 YES = 5, Risk: R3=1, R5=1 = 2, Function: 0 → Total = 7
        $srq = array_fill(1, 20, false);
        for ($i = 1; $i <= 5; $i++) {
            $srq[$i] = true;
        }

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => true, 'R4' => false, 'R5' => true],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T2, $result->recommendation);
        $this->assertSame(7, $result->totalScore);
    }

    #[Test]
    public function t2_at_upper_boundary(): void
    {
        // SRQ: 6 = 6, Risk: R1+R2+R4 = 6, Function: F1=1+F2=1 = 2 → Total = 14
        $srq = array_fill(1, 20, false);
        for ($i = 1; $i <= 6; $i++) {
            $srq[$i] = true;
        }

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => true, 'R3' => false, 'R4' => true, 'R5' => false],
            functionDomains: ['F1' => 1, 'F2' => 1, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T2, $result->recommendation);
        $this->assertSame(14, $result->totalScore);
    }

    // ──────────────────────────────────────────────
    // T3: Total 0–6
    // ──────────────────────────────────────────────

    #[Test]
    public function t3_zero_score(): void
    {
        $srq = array_fill(1, 20, false);

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 0, 'F2' => 0, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T3, $result->recommendation);
        $this->assertSame(0, $result->totalScore);
        $this->assertFalse($result->isRedFlagOverride);
        $this->assertNull($result->redFlagSource);
    }

    #[Test]
    public function t3_at_upper_boundary(): void
    {
        // SRQ: 4 = 4, Risk: R3=1 = 1, Function: F1=1 = 1 → Total = 6
        $srq = array_fill(1, 20, false);
        for ($i = 1; $i <= 4; $i++) {
            $srq[$i] = true;
        }

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => false, 'R2' => false, 'R3' => true, 'R4' => false, 'R5' => false],
            functionDomains: ['F1' => 1, 'F2' => 0, 'F3' => 0],
        );

        $this->assertSame(TriageCategory::T3, $result->recommendation);
        $this->assertSame(6, $result->totalScore);
    }

    // ──────────────────────────────────────────────
    // Score breakdown verification
    // ──────────────────────────────────────────────

    #[Test]
    public function score_breakdown_is_correct(): void
    {
        $srq = array_fill(1, 20, false);
        $srq[1] = true;
        $srq[2] = true;
        $srq[3] = true;  // SRQ = 3

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => false, 'R3' => false, 'R4' => true, 'R5' => true],
            functionDomains: ['F1' => 1, 'F2' => 3, 'F3' => 0],
        );

        $this->assertSame(3, $result->srqScore);
        $this->assertSame(5, $result->riskScore);   // R1=2 + R4=2 + R5=1
        $this->assertSame(4, $result->functionScore); // F1=1 + F2=3
        $this->assertSame(12, $result->totalScore);   // 3 + 5 + 4
        $this->assertSame(TriageCategory::T2, $result->recommendation);
    }

    #[Test]
    public function maximum_possible_score(): void
    {
        // All YES: SRQ=20, Risk=8, Function=9 → Total=37
        $srq = array_fill(1, 20, true);

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => true, 'R3' => true, 'R4' => true, 'R5' => true],
            functionDomains: ['F1' => 3, 'F2' => 3, 'F3' => 3],
        );

        // Q17 is true → T0 override
        $this->assertSame(TriageCategory::T0_SUSPECT, $result->recommendation);
        $this->assertTrue($result->isRedFlagOverride);
        $this->assertSame(37, $result->totalScore);
    }

    #[Test]
    public function maximum_score_without_q17(): void
    {
        // All YES except Q17: SRQ=19, Risk=8, Function=9 → Total=36
        $srq = array_fill(1, 20, true);
        $srq[17] = false;

        $result = $this->calculator->calculate(
            srqAnswers: $srq,
            riskIndicators: ['R1' => true, 'R2' => true, 'R3' => true, 'R4' => true, 'R5' => true],
            functionDomains: ['F1' => 3, 'F2' => 3, 'F3' => 3],
        );

        // No Q17, no manual → T1 by both total score AND functional override
        $this->assertSame(TriageCategory::T1, $result->recommendation);
        $this->assertFalse($result->isRedFlagOverride);
        $this->assertSame(36, $result->totalScore);
    }
}

