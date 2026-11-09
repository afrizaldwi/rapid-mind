<?php

namespace Tests\Concerns;

use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\User;

/** Explicit single-facility scope for older lifecycle fixtures, never policy tests. */
trait SingleFacilityWorkflowFixtures
{
    private function workflowValidation(User $actor, \App\Models\Patient $patient): \App\Models\ClinicalValidation
    {
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $actor->id,
            'status' => 'COMPLETED',
            'mode' => 'VERBAL',
            'completed_at' => now()
        ]);
        return \App\Models\ClinicalValidation::create([
            'assessment_id' => $assessment->id,
            'validated_by' => $actor->id,
            'clinical_result' => 'T2',
            'referral_required' => true
        ]);
    }

    private function configureWorkflowScope(User $actor): void
    {
        if (!$actor->facility_id) {
            $facility = HealthcareFacility::create(['name' => 'Faskes workflow sintetis', 'type' => 'RS', 'is_active' => true]);
            $actor->update(['facility_id' => $facility->id]);
        }
        // These suites test transitions, not routing. Declare their synthetic
        // cases assigned to this fixture facility instead of relying on role-wide access.
        new Assessment;
        new EmergencyEvent;
        $assign = function ($case) use ($actor) {
            if (!$case->responsible_facility_id)
                $case->forceFill(['responsible_facility_id' => $actor->facility_id, 'routing_status' => 'ROUTED']);
        };
        Assessment::creating($assign);
        EmergencyEvent::creating($assign);
        User::creating(function (User $user) use ($actor) {
            if ($user->role === \App\Enums\UserRole::HEALTHCARE && !$user->facility_id)
                $user->facility_id = $actor->facility_id;
        });
    }
}
