<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Triage\TriageCalculator;
use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Models\Assessment;
use App\Models\FunctionResponse;
use App\Models\RiskResponse;
use App\Models\SrqResponse;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class AssessmentSynchronizer
{
    public function __construct(private PatientReconciler $patients, private TriageCalculator $calculator) {}

    public function synchronize(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            SyncIdentityLock::acquire([['patient', $data['patient']['id']], ['assessment', $data['id']]]);
            $assessment = Assessment::whereKey($data['id'])->lockForUpdate()->first();
            if ($assessment && ($assessment->user_id !== $user->id || $assessment->patient_id !== $data['patient']['id'])) {
                throw new ConflictHttpException('Identitas atau pemilik asesmen bertentangan.');
            }
            if ($assessment && $assessment->mode->value !== $data['mode'] && $assessment->status === AssessmentStatus::COMPLETED) {
                throw new ConflictHttpException('Mode asesmen selesai tidak dapat diubah.');
            }
            // Check completed replays before any dependency mutation.
            if ($assessment?->status === AssessmentStatus::COMPLETED) {
                if ($data['status'] !== AssessmentStatus::COMPLETED->value || !$this->matches($assessment, $data)) {
                    throw new ConflictHttpException('Isi asesmen selesai bertentangan dengan rekaman server.');
                }
                return ['assessment' => $this->canonical($assessment), 'replayed' => true, 'created' => false];
            }

            $patient = $this->patients->reconcile($data['patient'], $user);
            $created = !$assessment;
            if (!$assessment) {
                $assessment = new Assessment([
                    'patient_id' => $patient->id,
                    'user_id' => $user->id,
                    'status' => AssessmentStatus::IN_PROGRESS,
                    'mode' => AssessmentMode::from($data['mode']),
                    'started_at' => $data['started_at'] ?? now(),
                ]);
                $assessment->id = $data['id'];
                $assessment->save();
            } else {
                $assessment->mode = AssessmentMode::from($data['mode']);
                $assessment->save();
            }

            foreach ($data['srq_answers'] ?? [] as $question => $answer) {
                SrqResponse::updateOrCreate(['assessment_id' => $assessment->id, 'question_number' => (int) $question], ['answer' => $answer]);
            }
            $weights = ['R1' => 2, 'R2' => 2, 'R3' => 1, 'R4' => 2, 'R5' => 1];
            foreach ($data['risk_indicators'] ?? [] as $indicator => $answer) {
                RiskResponse::updateOrCreate(['assessment_id' => $assessment->id, 'indicator' => $indicator], ['answer' => $answer, 'weight' => $weights[$indicator]]);
            }
            foreach ($data['function_domains'] ?? [] as $domain => $level) {
                FunctionResponse::updateOrCreate(['assessment_id' => $assessment->id, 'domain' => $domain], ['level' => $level]);
            }

            if ($data['status'] === AssessmentStatus::COMPLETED->value) {
                $result = $this->calculator->calculate(
                    array_map('boolval', $data['srq_answers']),
                    $data['risk_indicators'],
                    $data['function_domains'],
                );
                TriageResult::updateOrCreate(['assessment_id' => $assessment->id], [
                    'srq_score' => $result->srqScore,
                    'risk_score' => $result->riskScore,
                    'function_score' => $result->functionScore,
                    'total_score' => $result->totalScore,
                    'system_recommendation' => $result->recommendation,
                    'is_red_flag_override' => $result->isRedFlagOverride,
                    'red_flag_source' => $result->redFlagSource,
                ]);
                $assessment->status = AssessmentStatus::COMPLETED;
                $assessment->completed_at = $data['completed_at'] ?? now();
                $assessment->save();
            }
            return ['assessment' => $this->canonical($assessment), 'replayed' => false, 'created' => $created];
        });
    }

    private function matches(Assessment $assessment, array $data): bool
    {
        if ($assessment->mode->value !== $data['mode']) return false;
        $actual = $this->canonical($assessment);
        foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
            $expected = $data[$field] ?? [];
            $stored = $actual[$field];
            ksort($expected);
            ksort($stored);
            if ($expected !== $stored) return false;
        }
        return true;
    }

    public function canonical(Assessment $assessment): array
    {
        $assessment->load(['patient', 'srqResponses', 'riskAssessment', 'functionAssessment', 'triageResult']);
        return [
            'id' => $assessment->id,
            'patient' => $assessment->patient->only(['id', 'nik', 'name', 'age', 'gender', 'shelter_id']),
            'mode' => $assessment->mode->value,
            'status' => $assessment->status->value,
            'srq_answers' => $assessment->srqResponses->pluck('answer', 'question_number')->all(),
            'risk_indicators' => $assessment->riskAssessment->pluck('answer', 'indicator')->all(),
            'function_domains' => $assessment->functionAssessment->pluck('level', 'domain')->all(),
            'triage_result' => $assessment->triageResult?->only(['srq_score', 'risk_score', 'function_score', 'total_score', 'system_recommendation', 'is_red_flag_override', 'red_flag_source']),
            'started_at' => $assessment->started_at?->toIso8601String(),
            'completed_at' => $assessment->completed_at?->toIso8601String(),
            'updated_at' => $assessment->updated_at?->toIso8601String(),
        ];
    }
}
