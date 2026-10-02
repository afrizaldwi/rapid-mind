<?php

declare(strict_types=1);

namespace App\Domain\Triage;

final class FunctionCalculator
{
    /**
     * Function domains as defined in workflow.md:
     *
     * F1 — Perawatan Diri (Self-Care):     0 (mandiri), 1 (terganggu), 3 (lumpuh)
     * F2 — Fungsi Peran & Sosial:           0 (mandiri), 1 (terganggu), 3 (lumpuh)
     * F3 — Akses Kebutuhan (Daily Tasks):   0 (mandiri), 1 (terganggu), 3 (lumpuh)
     *
     * Maximum: 9 points
     */
    private const VALID_LEVELS = [0, 1, 3];
    private const DOMAINS = ['F1', 'F2', 'F3'];

    /**
     * Calculate the function score from domain levels.
     *
     * @param array<string, int> $domains Keyed by domain (F1–F3), value is 0, 1, or 3
     * @return int Score from 0 to 9
     */
    public function calculate(array $domains): int
    {
        $score = 0;

        foreach (self::DOMAINS as $domain) {
            if (isset($domains[$domain])) {
                $level = $domains[$domain];

                if (in_array($level, self::VALID_LEVELS, true)) {
                    $score += $level;
                }
            }
        }

        return $score;
    }
}

