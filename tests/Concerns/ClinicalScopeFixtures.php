<?php

namespace Tests\Concerns;

use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;

trait ClinicalScopeFixtures
{
    private array $facilities = [], $posko = [], $relawan = [], $medics = [];

    private function createScopeFixtures(): void
    {
        $region = Region::create(['name' => 'Wilayah sintetis C2']);
        foreach (['A', 'B'] as $key) {
            $this->facilities[$key] = HealthcareFacility::create(['name' => "Faskes sintetis $key", 'type' => 'RS', 'is_active' => true]);
            $this->posko[$key] = Shelter::create([
                'name' => "Posko sintetis $key",
                'region_id' => $region->id,
                'is_active' => true,
                'primary_facility_id' => $this->facilities[$key]->id
            ]);
            $this->relawan[$key] = User::factory()->create(['role' => 'RELAWAN', 'is_active' => true, 'shelter_id' => $this->posko[$key]->id]);
            $this->medics[$key] = User::factory()->create(['role' => 'HEALTHCARE', 'is_active' => true, 'facility_id' => $this->facilities[$key]->id]);
        }
    }

    private function scopePatient(string $key = 'A'): Patient
    {
        return Patient::create(['name' => 'Penyintas sintetis C2', 'created_by' => $this->relawan[$key]->id, 'shelter_id' => $this->posko[$key]->id]);
    }

    private function scopeAssessment(string $key, Patient $patient): Assessment
    {
        $case = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $this->relawan[$key]->id,
            'status' => 'COMPLETED',
            'mode' => 'VERBAL',
            'completed_at' => now()
        ]);
        // Nineteen affirmative answers, with Q17 explicitly NO: canonical T1.
        foreach (range(1, 20) as $n) $case->srqResponses()->create(['question_number' => $n, 'answer' => $n !== 17]);
        foreach (['R1' => 2, 'R2' => 2, 'R3' => 1, 'R4' => 2, 'R5' => 1] as $key => $weight)
            $case->riskAssessment()->create(['indicator' => $key, 'answer' => false, 'weight' => $weight]);
        foreach (['F1', 'F2', 'F3'] as $key) $case->functionAssessment()->create(['domain' => $key, 'level' => 0]);
        $case->triageResult()->create(['srq_score' => 19, 'total_score' => 19, 'system_recommendation' => 'T1']);
        return $case;
    }

    private function scopeEmergency(string $key, ?Patient $patient = null, ?Assessment $assessment = null): EmergencyEvent
    {
        return EmergencyEvent::create([
            'patient_id' => $patient?->id,
            'assessment_id' => $assessment?->id,
            'user_id' => $this->relawan[$key]->id,
            'shelter_id' => $this->posko[$key]->id,
            'red_flag_type' => 'MEDICAL_CRISIS',
            'status' => 'PENDING'
        ]);
    }
}
