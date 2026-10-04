<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AssessmentLocalShellTest extends TestCase
{
    use RefreshDatabase;

    private function relawan(): User
    {
        return User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
    }

    public function test_owned_server_stages_render_and_foreign_stages_and_mutations_are_rejected(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas Uji', 'created_by' => $owner->id]);
        $assessment = Assessment::create(['patient_id' => $patient->id, 'user_id' => $owner->id, 'status' => AssessmentStatus::IN_PROGRESS, 'mode' => AssessmentMode::VERBAL]);
        $base = "/relawan/assessment/{$assessment->id}";
        $this->actingAs($owner)->get("$base/srq")->assertInertia(fn(Assert $page) => $page->component('Relawan/Assessment/Srq', false)->where('assessment.id', $assessment->id)->etc());
        $this->actingAs($other);
        foreach (['identity', 'srq', 'risk', 'function', 'review', 'result'] as $stage) {
            $this->get("$base/$stage")->assertNotFound();
        }
        foreach (['srq' => ['responses' => []], 'risk' => ['risks' => []], 'function' => ['functions' => []], 'complete' => []] as $stage => $payload) {
            $this->postJson("$base/$stage", $payload)->assertNotFound();
        }
        $this->assertSame(0, $assessment->srqResponses()->count());
        $this->assertSame(AssessmentStatus::IN_PROGRESS, $assessment->fresh()->status);
    }

    public function test_valid_unknown_uuid_renders_all_local_shell_stages_without_creating_rows(): void
    {
        $owner = $this->relawan();
        $id = (string) Str::uuid();
        $this->actingAs($owner);
        foreach (['identity', 'srq', 'risk', 'function', 'review', 'result'] as $stage) {
            $this->get("/relawan/assessment/$id/$stage")->assertInertia(fn(Assert $page) => $page
                ->component('Relawan/Assessment/' . ucfirst($stage), false)
                ->where('assessment.id', $id)
                ->where('assessment.user_id', $owner->id)
                ->etc());
        }
        $this->get('/relawan/assessment/not-a-uuid/srq')->assertNotFound();
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('patients', 0);
    }

    public function test_data_keeps_owned_server_history_without_exposing_another_relawan(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas Pemilik', 'created_by' => $owner->id]);
        $foreignPatient = Patient::create(['name' => 'Penyintas Lain', 'created_by' => $other->id]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $owner->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        Assessment::create([
            'patient_id' => $foreignPatient->id,
            'user_id' => $other->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        $emergency = EmergencyEvent::create([
            'patient_id' => $patient->id,
            'user_id' => $owner->id,
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS,
            'status' => EmergencyStatus::PENDING,
        ]);
        EmergencyEvent::create([
            'patient_id' => $foreignPatient->id,
            'user_id' => $other->id,
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS,
            'status' => EmergencyStatus::PENDING,
        ]);

        $this->actingAs($owner)->get('/relawan/data')->assertInertia(fn(Assert $page) => $page
            ->component('Relawan/Data', false)
            ->has('completed', 1)
            ->where('completed.0.id', $assessment->id)
            ->has('emergencies', 1)
            ->where('emergencies.0.id', $emergency->id)
            ->where('emergencies.0.patient.name', 'Penyintas Pemilik')
            ->etc());
    }

    public function test_t0_result_exposes_an_existing_linked_emergency_without_leaking_another_relawan_event(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas T0', 'created_by' => $owner->id]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $owner->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        EmergencyEvent::create([
            'assessment_id' => $assessment->id,
            'patient_id' => $patient->id,
            'user_id' => $other->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);
        $ownedEmergency = EmergencyEvent::create([
            'assessment_id' => $assessment->id,
            'patient_id' => $patient->id,
            'user_id' => $owner->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);

        $this->actingAs($owner)->get("/relawan/assessment/{$assessment->id}/result")
            ->assertInertia(fn(Assert $page) => $page
                ->component('Relawan/Assessment/Result', false)
                ->where('existingEmergency.id', $ownedEmergency->id)
                ->where('existingEmergency.assessment_id', $assessment->id)
                ->where('existingEmergency.status', EmergencyStatus::PENDING->value)
                ->etc());
    }

    public function test_drafts_route_only_exposes_owned_in_progress_assessments_to_relawan(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $patient = Patient::create(['name' => 'Penyintas Uji', 'created_by' => $owner->id]);
        $owned = Assessment::create(['patient_id' => $patient->id, 'user_id' => $owner->id, 'status' => AssessmentStatus::IN_PROGRESS, 'mode' => AssessmentMode::VERBAL]);
        Assessment::create(['patient_id' => $patient->id, 'user_id' => $owner->id, 'status' => AssessmentStatus::COMPLETED, 'mode' => AssessmentMode::VERBAL]);
        Assessment::create(['patient_id' => $patient->id, 'user_id' => $other->id, 'status' => AssessmentStatus::IN_PROGRESS, 'mode' => AssessmentMode::VERBAL]);

        $this->actingAs($owner)->get('/relawan/assessment/drafts')->assertInertia(fn(Assert $page) => $page
            ->component('Relawan/Assessment/Drafts', false)
            ->has('inProgressAssessments', 1)
            ->where('inProgressAssessments.0.id', $owned->id)
            ->where('inProgressAssessments.0.resume_url', "/relawan/assessment/{$owned->id}/srq")
            ->etc());
        $this->actingAs($healthcare)->getJson('/relawan/assessment/drafts')->assertForbidden();
    }

    public function test_interactive_creation_rejects_unrelated_existing_patient(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas Relawan Lain', 'created_by' => $other->id]);
        $this->actingAs($owner)->postJson('/relawan/assessment', ['patient_id' => $patient->id])->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
    }
}
