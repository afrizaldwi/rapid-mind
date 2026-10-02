<?php

declare(strict_types=1);

namespace App\Domain\Triage;

final class RedFlagDetector
{
    /**
     * Check if SRQ-20 answers contain a Red Flag trigger.
     *
     * Per workflow.md: Q17 ("Apakah Sdr memiliki pemikiran untuk mengakhiri hidup?")
     * answered YES triggers T0-Suspect regardless of total score.
     *
     * @param array<int, bool> $srqAnswers Keyed by question number (1–20)
     * @return bool True if a Red Flag is detected
     */
    public function detectFromSrq(array $srqAnswers): bool
    {
        return isset($srqAnswers[17]) && $srqAnswers[17] === true;
    }

    /**
     * Check if a manual Red Flag trigger was activated.
     *
     * @param bool $manualTrigger Whether the floating Red Flag button was pressed
     * @return bool
     */
    public function detectManual(bool $manualTrigger): bool
    {
        return $manualTrigger;
    }

    /**
     * Check any Red Flag source.
     *
     * @param array<int, bool> $srqAnswers SRQ-20 answers
     * @param bool $manualTrigger Manual button press
     * @return array{detected: bool, source: string|null}
     */
    public function detect(array $srqAnswers, bool $manualTrigger = false): array
    {
        if ($manualTrigger) {
            return ['detected' => true, 'source' => 'MANUAL_RED_FLAG'];
        }

        if ($this->detectFromSrq($srqAnswers)) {
            return ['detected' => true, 'source' => 'SRQ_Q17'];
        }

        return ['detected' => false, 'source' => null];
    }
}

