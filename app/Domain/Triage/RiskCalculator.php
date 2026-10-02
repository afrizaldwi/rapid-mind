<?php

declare(strict_types=1);

namespace App\Domain\Triage;

final class RiskCalculator
{
    /**
     * Risk indicator weights as defined in workflow.md:
     *
     * R1 — Kehilangan Berat (Duka Cita / Kerugian Materi Akut): 2 points
     * R2 — Pengalaman Traumatik Langsung (Ancaman Nyawa Langsung): 2 points
     * R3 — Kelompok Rentan (Kerentanan Biologis/Sosial): 1 point
     * R4 — Riwayat Gangguan Jiwa (Pre-existing Condition): 2 points
     * R5 — Terputus Obat Kronis (Komorbiditas Medis): 1 point
     *
     * Maximum: 8 points
     */
    private const WEIGHTS = [
        'R1' => 2,
        'R2' => 2,
        'R3' => 1,
        'R4' => 2,
        'R5' => 1,
    ];

    /**
     * Calculate the risk score from an array of boolean indicators.
     *
     * @param array<string, bool> $indicators Keyed by indicator code (R1–R5)
     * @return int Score from 0 to 8
     */
    public function calculate(array $indicators): int
    {
        $score = 0;

        foreach (self::WEIGHTS as $indicator => $weight) {
            if (isset($indicators[$indicator]) && $indicators[$indicator] === true) {
                $score += $weight;
            }
        }

        return $score;
    }

    /**
     * Get the weight for a specific indicator.
     */
    public static function weightFor(string $indicator): int
    {
        return self::WEIGHTS[$indicator] ?? 0;
    }

    /**
     * Get all indicator weights.
     *
     * @return array<string, int>
     */
    public static function weights(): array
    {
        return self::WEIGHTS;
    }
}

