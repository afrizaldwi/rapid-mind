<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\ClinicalReferralStatus;
use App\Enums\ReferralStatus;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

final class ClinicalReferralWorkflow
{
    /** Called by the existing source-specific creation transactions. */
    public function recordCreated(Referral $referral, User $actor, string $notes): void
    {
        HealthcareWorkflowAccess::authorize($actor);
        ReferralStatusHistory::create([
            'referral_id' => $referral->id, 'previous_status' => null,
            'status' => ReferralStatus::ACTIVE, 'changed_by' => $actor->id, 'notes' => $notes,
        ]);
        AuditLog::create([
            'actor_id' => $actor->id, 'action' => 'REFERRAL_CREATED',
            'entity_type' => 'Referral', 'entity_id' => $referral->id,
            'old_values' => ['status' => null],
            'new_values' => $referral->only([
                'status', 'facility_id', 'patient_id', 'emergency_event_id',
                'emergency_verification_id', 'clinical_validation_id', 'notes',
            ]),
        ]);
        HealthcareWorkflowEvents::changed($referral);
    }

    public function complete(User $actor, string $referralId, array $input): WorkflowResult
    {
        HealthcareWorkflowAccess::authorize($actor);
        $data = Validator::make($input, [
            'expected_status' => ['required', Rule::enum(ClinicalReferralStatus::class)],
            'notes' => ['nullable', 'string', 'max:500'],
        ])->validate();
        $notes = trim($data['notes'] ?? '');
        $notes = $notes === '' ? null : $notes;

        return DB::transaction(function () use ($actor, $referralId, $data, $notes): WorkflowResult {
            $source = Referral::findOrFail($referralId);
            if ($source->emergency_event_id) {
                EmergencyEvent::whereKey($source->emergency_event_id)->lockForUpdate()->firstOrFail();
            } elseif ($source->clinical_validation_id) {
                $assessmentId = $source->clinicalValidation->assessment_id;
                Assessment::whereKey($assessmentId)->lockForUpdate()->firstOrFail();
            }
            $referral = Referral::whereKey($referralId)->lockForUpdate()->firstOrFail();
            $current = ClinicalReferralStatus::tryFrom($referral->status->value);
            if ($current === ClinicalReferralStatus::COMPLETED) {
                $history = $referral->statusHistory()->where('previous_status', ReferralStatus::ACTIVE)
                    ->where('status', ReferralStatus::COMPLETED)->first();
                if ($data['expected_status'] === ClinicalReferralStatus::ACTIVE->value && $history && $history->notes === $notes) {
                    return new WorkflowResult($referral, true);
                }
            } elseif ($current === ClinicalReferralStatus::ACTIVE && $data['expected_status'] === $current->value) {
                $referral->update(['status' => ReferralStatus::COMPLETED]);
                ReferralStatusHistory::create([
                    'referral_id' => $referral->id, 'previous_status' => ReferralStatus::ACTIVE,
                    'status' => ReferralStatus::COMPLETED, 'changed_by' => $actor->id, 'notes' => $notes,
                ]);
                AuditLog::create([
                    'actor_id' => $actor->id, 'action' => 'REFERRAL_COMPLETED',
                    'entity_type' => 'Referral', 'entity_id' => $referral->id,
                    'old_values' => ['status' => ClinicalReferralStatus::ACTIVE->value],
                    'new_values' => ['status' => ClinicalReferralStatus::COMPLETED->value, 'notes' => $notes],
                ]);

                HealthcareWorkflowEvents::changed($referral);

                return new WorkflowResult($referral);
            }

            throw new WorkflowConflict('Status rujukan telah berubah. Muat data terbaru atau lanjutkan alur rujukan yang berlaku.', [
                'current_status' => $referral->status->value,
            ]);
        }, 3);
    }
}
