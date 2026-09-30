<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\ClinicalValidation;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
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

        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Healthcare/Validations/Index', false)
            ->where('assessments.0.id', $assessment->id)
            ->where('assessments.0.clinical_validation.id', $validation->id)
            ->where('assessments.0.clinical_validation.validator.id', $validator->id)
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
