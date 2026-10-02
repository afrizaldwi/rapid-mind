<?php

declare(strict_types=1);

namespace App\Domain\Assessment;

use App\Models\Assessment;
use Illuminate\Support\Collection;

final class AssessmentResume
{
    public function attach(Assessment $assessment): Assessment
    {
        $assessment->loadMissing(['srqResponses', 'riskAssessment', 'functionAssessment']);

        $stage = match (true) {
            !$this->completeSet($assessment->srqResponses, range(1, 20), 'question_number', 'answer', [true, false]) => 'srq',
            !$this->completeSet($assessment->riskAssessment, ['R1', 'R2', 'R3', 'R4', 'R5'], 'indicator', 'answer', [true, false]) => 'risk',
            !$this->completeSet($assessment->functionAssessment, ['F1', 'F2', 'F3'], 'domain', 'level', [0, 1, 3]) => 'function',
            default => 'review',
        };

        $assessment->setAttribute('resume_stage', $stage);
        $assessment->setAttribute('resume_url', "/relawan/assessment/{$assessment->id}/{$stage}");
        $assessment->setAttribute('resume_label', match ($stage) {
            'srq' => 'Lanjutkan SRQ-20',
            'risk' => 'Lanjutkan Faktor Risiko',
            'function' => 'Lanjutkan Fungsi Harian',
            'review' => 'Tinjau Asesmen',
        });

        return $assessment;
    }

    private function completeSet(Collection $responses, array $expectedKeys, string $key, string $value, array $allowedValues): bool
    {
        $actualKeys = $responses->pluck($key)->all();
        sort($actualKeys);
        sort($expectedKeys);

        return $actualKeys === $expectedKeys
            && $responses->every(fn ($response) => in_array($response->{$value}, $allowedValues, true));
    }
}
