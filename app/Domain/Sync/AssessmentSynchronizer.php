<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Assessment\SrqAnswer;
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
            if ($assessment) {
                if ($data['status'] === $assessment->status->value && $this->matches($assessment, $data, true)) {
                    return ['assessment' => $this->canonical($assessment), 'replayed' => true, 'created' => false];
                }
                $current = $this->canonical($assessment);
                // Emergency-first sync may have created a same-mode empty shell.
                // Its first fill cannot overwrite evidence; later writes need CAS.
                $emptyShell = $current['mode'] === $data['mode']
                    && !$current['srq_answers'] && !$current['risk_indicators'] && !$current['function_domains']
                    && !$current['non_verbal_reasons'] && $current['non_verbal_other_note'] === null;
                if (isset($data['base_version'])
                    ? !hash_equals($current['server_version'], $data['base_version'])
                    : !$emptyShell) {
                    throw new ConflictHttpException('Asesmen server telah berubah. Draf lokal tetap disimpan; tinjau konflik sebelum mengirim ulang.');
                }
            } elseif (isset($data['base_version'])) {
                throw new ConflictHttpException('Versi asesmen server tidak ditemukan. Draf lokal tetap disimpan.');
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
            if (array_key_exists('non_verbal_reasons', $data)) {
                $assessment->update([
                    'non_verbal_reasons' => $data['non_verbal_reasons'],
                    'non_verbal_other_note' => $data['non_verbal_other_note'] ?? null,
                ]);
            }

            foreach ($data['srq_answers'] ?? [] as $question => $answer) {
                SrqResponse::updateOrCreate(['assessment_id' => $assessment->id, 'question_number' => (int) $question], SrqAnswer::storage($answer));
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
                    SrqAnswer::definitive($data['srq_answers']),
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
            \App\Events\AssessmentUpdated::afterCommit($assessment->id);
            return ['assessment' => $this->canonical($assessment), 'replayed' => false, 'created' => $created];
        });
    }

    private function matches(Assessment $assessment, array $data, bool $partial = false): bool
    {
        if ($assessment->mode->value !== $data['mode']) return false;
        $actual = $this->canonical($assessment);
        // Omitted metadata is a compatibility-preserving no-op; an explicit
        // empty list is a conflicting edit once the assessment is completed.
        if (array_key_exists('non_verbal_reasons', $data)
            && ($actual['non_verbal_reasons'] !== $data['non_verbal_reasons']
                || $actual['non_verbal_other_note'] !== ($data['non_verbal_other_note'] ?? null))) {
            return false;
        }
        foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
            if ($partial && !array_key_exists($field, $data)) continue;
            $expected = $data[$field] ?? [];
            if ($field === 'srq_answers') $expected = array_map(SrqAnswer::normalize(...), $expected);
            $stored = $actual[$field];
            if ($partial) {
                foreach ($expected as $key => $value) {
                    if (!array_key_exists($key, $stored) || $stored[$key] !== $value) return false;
                }
                continue;
            }
            ksort($expected);
            ksort($stored);
            if ($expected !== $stored) return false;
        }
        return true;
    }

    public function canonical(Assessment $assessment): array
    {
        $assessment->load(['patient', 'srqResponses', 'riskAssessment', 'functionAssessment', 'triageResult']);
        $canonical = [
            'id' => $assessment->id,
            'patient' => $assessment->patient->only(['id', 'nik', 'name', 'age', 'gender', 'shelter_id']),
            'mode' => $assessment->mode->value,
            'status' => $assessment->status->value,
            'routing_status' => $assessment->routing_status ?? 'UNRESOLVED',
            'non_verbal_reasons' => $assessment->non_verbal_reasons ?? [],
            'non_verbal_other_note' => $assessment->non_verbal_other_note,
            'srq_answers' => $assessment->srqResponses->mapWithKeys(fn (SrqResponse $response) => [$response->question_number => $response->responseValue()])->all(),
            'risk_indicators' => $assessment->riskAssessment->pluck('answer', 'indicator')->all(),
            'function_domains' => $assessment->functionAssessment->pluck('level', 'domain')->all(),
            'triage_result' => $assessment->triageResult?->only(['srq_score', 'risk_score', 'function_score', 'total_score', 'system_recommendation', 'is_red_flag_override', 'red_flag_source']),
            'started_at' => $assessment->started_at?->toIso8601String(),
            'completed_at' => $assessment->completed_at?->toIso8601String(),
            'updated_at' => $assessment->updated_at?->toIso8601String(),
        ];
        $canonical['server_version'] = AssessmentVersion::of($canonical);
        return $canonical;
    }
}
