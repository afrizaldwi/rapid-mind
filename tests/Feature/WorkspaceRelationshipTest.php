<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class WorkspaceRelationshipTest extends TestCase
{
    use RefreshDatabase;

    private function shelter(): Shelter
    {
        $region = Region::create(['name' => 'Wilayah Demo']);

        return Shelter::create(['region_id' => $region->id, 'name' => 'Posko Demo']);
    }

    public function test_admin_summary_counts_only_assigned_relawan_as_volunteers(): void
    {
        $shelter = $this->shelter();
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        User::factory()->count(2)->create([
            'role' => UserRole::RELAWAN,
            'shelter_id' => $shelter->id,
        ]);
        User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'shelter_id' => $shelter->id,
        ]);
        User::factory()->create(['role' => UserRole::RELAWAN]);
        Patient::create(['name' => 'Pasien Demo', 'created_by' => $admin->id, 'shelter_id' => $shelter->id]);

        $this->actingAs($admin)->get('/admin/summary')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Summary', false)
            ->where('shelters.0.id', $shelter->id)
            ->where('shelters.0.patients_count', 1)
            ->where('shelters.0.volunteers_count', 2)
            ->missing('pendingT0Count')
            ->etc());
    }

    private function validatedAssessment(): array
    {
        $shelter = $this->shelter();
        $relawan = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'shelter_id' => $shelter->id,
        ]);
        $validator = User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'is_active' => true,
        ]);
        $patient = Patient::create([
            'name' => 'Pasien Validasi Demo',
            'created_by' => $relawan->id,
            'shelter_id' => $shelter->id,
        ]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $relawan->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        $validation = ClinicalValidation::create([
            'assessment_id' => $assessment->id,
            'validated_by' => $validator->id,
            'clinical_result' => TriageCategory::T2,
            'referral_required' => false,
        ]);

        $this->actingAs($validator);

        return [$patient, $assessment, $validation, $validator];
    }

    public function test_healthcare_validation_listing_includes_validation_and_validator(): void
    {
        [, $assessment, $validation, $validator] = $this->validatedAssessment();
        TriageResult::create([
            'assessment_id' => $assessment->id, 'system_recommendation' => TriageCategory::T2,
        ]);

        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Validations/Index', false)
            ->where('completedAssessments.0.id', $assessment->id)
            ->where('completedAssessments.0.clinical_validation.id', $validation->id)
            ->where('completedAssessments.0.clinical_validation.validator.id', $validator->id)
            ->etc());
    }

    public function test_healthcare_validation_payload_serializes_triage_result_and_score(): void
    {
        [, $assessment] = $this->validatedAssessment();
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'srq_score' => 6,
            'risk_score' => 3,
            'function_score' => 2,
            'total_score' => 11,
            'system_recommendation' => TriageCategory::T2,
        ]);

        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Validations/Index', false)
            ->where('completedAssessments.0.triage_result.system_recommendation', TriageCategory::T2->value)
            ->where('completedAssessments.0.triage_result.total_score', 11)
            ->missing('completedAssessments.0.triageResult')
            ->etc());
    }

    public function test_healthcare_pending_badge_counts_only_unacknowledged_emergencies(): void
    {
        $relawan = User::factory()->create(['role' => UserRole::RELAWAN]);
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);

        foreach ([EmergencyStatus::PENDING, EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED,
            EmergencyStatus::REVIEWING, EmergencyStatus::CONFIRMED, EmergencyStatus::DOWNGRADED] as $status) {
            EmergencyEvent::create([
                'user_id' => $relawan->id,
                'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
                'status' => $status,
            ]);
        }

        $this->actingAs($healthcare)->get('/healthcare/emergencies')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Emergencies/Index', false)
            ->where('pendingT0Count', 2)
            ->has('emergencies', 6)
            ->etc());

        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Validations/Index', false)
            ->where('pendingT0Count', 2)
            ->etc());

        $pending = EmergencyEvent::where('status', EmergencyStatus::PENDING)->firstOrFail();
        $this->postJson("/healthcare/emergencies/{$pending->id}/acknowledge")->assertOk();
        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Emergencies/Index', false)
            ->where('pendingT0Count', 1)
            ->etc());
    }

    public function test_healthcare_emergency_payload_uses_linked_assessment_and_snake_case_relations(): void
    {
        $shelter = $this->shelter();
        $relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'shelter_id' => $shelter->id]);
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $patient = Patient::create(['name' => 'Pasien Darurat', 'created_by' => $relawan->id, 'shelter_id' => $shelter->id]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $relawan->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'srq_score' => 1,
            'risk_score' => 3,
            'function_score' => 4,
            'total_score' => 8,
            'system_recommendation' => TriageCategory::T0_SUSPECT,
        ]);
        foreach (range(1, 20) as $questionNumber) {
            $assessment->srqResponses()->create(['question_number' => $questionNumber, 'answer' => $questionNumber === 17]);
        }
        foreach (range(1, 5) as $indicator) {
            $assessment->riskAssessment()->create([
                'indicator' => "R{$indicator}",
                'answer' => in_array($indicator, [1, 3], true),
                'weight' => in_array($indicator, [3, 5], true) ? 1 : 2,
            ]);
        }
        foreach ([0, 1, 3] as $index => $level) {
            $assessment->functionAssessment()->create(['domain' => 'F'.($index + 1), 'level' => $level]);
        }
        $emergency = EmergencyEvent::create([
            'patient_id' => $patient->id,
            'assessment_id' => $assessment->id,
            'user_id' => $relawan->id,
            'shelter_id' => $shelter->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);

        $this->actingAs($healthcare)->get('/healthcare/emergencies')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Emergencies/Index', false)
            ->where('emergencies.0.id', $emergency->id)
            ->where('emergencies.0.assessment.id', $assessment->id)
            ->where('emergencies.0.assessment.triage_result.system_recommendation', TriageCategory::T0_SUSPECT->value)
            ->has('emergencies.0.assessment.srq_responses', 20)
            ->has('emergencies.0.assessment.risk_assessment', 5)
            ->has('emergencies.0.assessment.function_assessment', 3)
            ->missing('emergencies.0.assessment.triageResult')
            ->etc());
    }

    public function test_healthcare_emergency_workspace_accepts_unidentified_emergency(): void
    {
        $relawan = User::factory()->create(['role' => UserRole::RELAWAN]);
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $emergency = EmergencyEvent::create([
            'user_id' => $relawan->id,
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS,
            'status' => EmergencyStatus::PENDING,
        ]);

        $this->actingAs($healthcare)->get('/healthcare/emergencies')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('emergencies.0.id', $emergency->id)
            ->where('emergencies.0.patient', null)
            ->where('emergencies.0.assessment', null)
            ->etc());
    }

    public function test_admin_summary_and_map_share_the_active_t0_status_set(): void
    {
        $shelter = $this->shelter();
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        $relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'shelter_id' => $shelter->id]);
        foreach ([EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING, EmergencyStatus::CONFIRMED, EmergencyStatus::DOWNGRADED] as $status) {
            EmergencyEvent::create([
                'user_id' => $relawan->id,
                'shelter_id' => $shelter->id,
                'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
                'status' => $status,
            ]);
        }

        $this->actingAs($admin)->get('/admin/summary')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('kpis.countT0', 4)
            ->where('shelters.0.t0_count', 4)
            ->where('mapShelters.0.t0_count', 4)
            ->has('t0Emergencies', 4)
            ->etc());

        $this->get('/admin/map')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('shelters.0.t0_count', 4)
            ->etc());
    }

    public function test_healthcare_patient_detail_includes_assessment_validation_and_validator(): void
    {
        [$patient, $assessment, $validation, $validator] = $this->validatedAssessment();

        $this->get("/healthcare/patients/{$patient->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Patients/Show', false)
            ->where('patient.id', $patient->id)
            ->where('patient.assessments.0.id', $assessment->id)
            ->where('patient.assessments.0.clinical_validation.id', $validation->id)
            ->where('patient.assessments.0.clinical_validation.validator.id', $validator->id)
            ->etc());
    }
}
