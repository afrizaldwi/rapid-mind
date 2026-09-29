<?php

declare(strict_types=1);

namespace App\Domain\Triage;

final class SrqCalculator
{
    /**
     * Calculate the SRQ-20 score from an array of 20 boolean answers.
     *
     * @param array<int, bool> $answers Keyed by question number (1–20), value is true for "YA"
     * @return int Score from 0 to 20
     */
    public function calculate(array $answers): int
    {
        $score = 0;

        for ($i = 1; $i <= 20; $i++) {
            if (isset($answers[$i]) && $answers[$i] === true) {
                $score++;
            }
        }

        return $score;
    }
}

