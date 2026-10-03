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
use App\Models\EmergencyVerification;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\Shelter;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

final class HealthcareOperationalCompletionTest extends TestCase
{
    use RefreshDatabase;

    private User $healthcare;
    private Patient $patient;
    private HealthcareFacility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->facility = HealthcareFacility::create(['name' => 'Faskes Utama', 'type' => 'RS', 'is_active' => true]);
        $this->healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'facility_id' => $this->facility->id, 'is_active' => true]);
        $this->patient = Patient::create(['name' => 'Pasien Uji', 'created_by' => $this->healthcare->id]);
        $this->actingAs($this->healthcare);
    }

    private function assessment(TriageCategory $category, int $minutesAgo = 0): Assessment
    {
        $assessment = Assessment::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now()->subMinutes($minutesAgo),
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'srq_score' => 9,
            'risk_score' => 2,
            'function_score' => 3,
            'total_score' => 14,
            'system_recommendation' => $category,
        ]);
        $assessment->srqResponses()->create(['question_number' => 1, 'answer' => true]);
        $assessment->riskAssessment()->create(['indicator' => 'R1', 'answer' => true, 'weight' => 2]);
        $assessment->functionAssessment()->create(['domain' => 'F1', 'level' => 3]);
        return $assessment;
    }

    public function test_selected_emergency_exposes_contact_but_queue_does_not_and_missing_phone_is_safe(): void
    {
        $volunteer = User::factory()->create(['role' => UserRole::RELAWAN, 'phone_number' => '+6281234567890']);
        $emergency = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $volunteer->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);
        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->component('Healthcare/Emergencies/Index', false)
            ->missing('emergencies.0.user.phone_number')->etc());
        $this->get("/healthcare/emergencies/{$emergency->id}")
            ->assertOk()
            ->assertInertia(fn(Assert $page) => $page
                ->component('Healthcare/Emergencies/Show', false)
                ->where('emergency.user.id', $volunteer->id)
                ->where('emergency.user.name', $volunteer->name)
                ->where('emergency.user.phone_number', '+6281234567890')
                ->missing('emergency.user.email')
                ->missing('emergency.user.role')
                ->missing('emergency.user.token_version')
                ->missing('emergency.user.facility_id')
                ->missing('emergency.user.shelter_id')
                ->etc());
        $volunteer->update(['phone_number' => null]);
        $this->get("/healthcare/emergencies/{$emergency->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('emergency.user.phone_number', null)->etc());
        $this->assertSame(EmergencyStatus::PENDING, $emergency->fresh()->status);
    }

    public function test_pending_emergencies_are_oldest_first_with_deterministic_ties(): void
    {
        $old = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);
        $old->forceFill(['created_at' => now()->subHours(2)])->save();
        $new = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);
        $new->forceFill(['created_at' => now()->subHour()])->save();
        $sameTime = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
        ]);
        $sameTime->forceFill(['created_at' => $new->created_at])->save();
        $tieIds = [$new->id, $sameTime->id];
        sort($tieIds);
        $resolved = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::CONFIRMED,
        ]);

        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('emergencies.0.id', $old->id)
            ->where('emergencies.1.id', $tieIds[0])
            ->where('emergencies.2.id', $tieIds[1])
            ->where('emergencies.3.id', $resolved->id)->etc());
    }

    public function test_patient_latest_status_projection_preserves_missing_zero_and_longitudinal_recency(): void
    {
        $withoutResult = Assessment::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now()->subHours(4),
        ]);

        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.id', $this->patient->id)
            ->where('patients.0.latest_clinical_status', null)->etc());

        TriageResult::create([
            'assessment_id' => $withoutResult->id,
            'srq_score' => 0,
            'risk_score' => 0,
            'function_score' => 0,
            'total_score' => 0,
            'system_recommendation' => TriageCategory::T3,
        ]);
        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.latest_clinical_status.label', 'T3')
            ->where('patients.0.assessments.0.triage_result.total_score', 0)->etc());

        $emergency = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::DOWNGRADED,
        ]);
        $decision = EmergencyVerification::create([
            'emergency_event_id' => $emergency->id,
            'verified_by' => $this->healthcare->id,
            'clinical_result' => TriageCategory::T1,
        ]);
        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.latest_clinical_status.label', 'T1')
            ->where('patients.0.latest_clinical_status.source', 'emergency_decision')->etc());

        $decision->forceFill(['created_at' => now()->subHours(2)])->save();
        $newerAssessment = $this->assessment(TriageCategory::T2);
        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.latest_clinical_status.label', 'T2')
            ->where('patients.0.latest_clinical_status.source', 'system_recommendation')
            ->where('patients.0.assessments.0.id', $newerAssessment->id)->etc());

        $active = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS,
            'status' => EmergencyStatus::PENDING,
        ]);
        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.latest_clinical_status.label', 'T0-Suspect Aktif')
            ->where('patients.0.latest_clinical_status.source', 'active_emergency')
            ->where('patients.0.emergency_events.0.id', $active->id)->etc());
    }

    public function test_emergency_worklist_contains_only_active_operational_t0_cases(): void
    {
        foreach ([EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING] as $status) {
            EmergencyEvent::create([
                'patient_id' => $this->patient->id,
                'user_id' => $this->healthcare->id,
                'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
                'status' => $status,
            ]);
        }
        EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::DOWNGRADED,
        ]);
        EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::CONFIRMED,
        ]);
        $openReferralEmergency = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::CONFIRMED,
        ]);
        Referral::create([
            'emergency_event_id' => $openReferralEmergency->id,
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => \App\Enums\ReferralStatus::ACTIVE,
        ]);
        $completedReferralEmergency = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::CONFIRMED,
        ]);
        Referral::create([
            'emergency_event_id' => $completedReferralEmergency->id,
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => \App\Enums\ReferralStatus::COMPLETED,
        ]);

        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->has('emergencies', 5)
            ->where('emergencies', fn($emergencies) => ! $emergencies->contains('id', $completedReferralEmergency->id)
                && ! $emergencies->contains('status', EmergencyStatus::DOWNGRADED->value))
            ->etc());

        $this->get("/healthcare/patients/{$this->patient->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->has('patient.emergency_events', 7)
            ->etc());
    }

    public function test_patient_latest_status_uses_stable_id_tie_break_for_equal_timestamps(): void
    {
        $patient = Patient::create(['name' => 'Pasien Tie Break', 'created_by' => $this->healthcare->id]);
        $timestamp = now()->subHour();
        $categoriesById = [];
        foreach ([TriageCategory::T1, TriageCategory::T2] as $category) {
            $assessment = Assessment::create([
                'patient_id' => $patient->id,
                'user_id' => $this->healthcare->id,
                'status' => AssessmentStatus::COMPLETED,
                'mode' => AssessmentMode::VERBAL,
                'completed_at' => $timestamp,
            ]);
            TriageResult::create([
                'assessment_id' => $assessment->id,
                'total_score' => $category === TriageCategory::T1 ? 15 : 8,
                'system_recommendation' => $category,
            ]);
            $categoriesById[$assessment->id] = $category->value;
        }
        krsort($categoriesById, SORT_STRING);
        $expected = reset($categoriesById);

        $this->get('/healthcare/patients')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('patients', function ($patients) use ($patient, $expected): bool {
                $projected = $patients->firstWhere('id', $patient->id);

                return $projected['latest_clinical_status']['label'] === $expected
                    && $projected['latest_clinical_status']['source'] === 'system_recommendation';
            })->etc());
    }

    public function test_worklist_prioritizes_oldest_t1_then_t2_and_keeps_t3_in_patient_history(): void
    {
        $t2 = $this->assessment(TriageCategory::T2, 90);
        $newT1 = $this->assessment(TriageCategory::T1, 10);
        $oldT1 = $this->assessment(TriageCategory::T1, 120);
        $t3 = $this->assessment(TriageCategory::T3, 180);
        $validated = $this->assessment(TriageCategory::T2, 50);
        ClinicalValidation::create(['assessment_id' => $validated->id, 'validated_by' => $this->healthcare->id, 'clinical_result' => TriageCategory::T2]);

        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->component('Healthcare/Validations/Index', false)
            ->has('pendingAssessments', 3)
            ->where('pendingAssessments.0.id', $oldT1->id)
            ->where('pendingAssessments.1.id', $newT1->id)
            ->where('pendingAssessments.2.id', $t2->id)
            ->has('completedAssessments', 1)
            ->where('completedAssessments.0.id', $validated->id)->etc());
        $this->get("/healthcare/patients/{$this->patient->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->component('Healthcare/Patients/Show', false)
            ->has('patient.assessments', 5)->etc());
        $this->get("/healthcare/validations/{$t3->id}")->assertNotFound();
    }

    public function test_selected_validation_contains_assessment_evidence_history_and_active_facilities(): void
    {
        $previous = $this->assessment(TriageCategory::T2, 120);
        $current = $this->assessment(TriageCategory::T1, 60);
        $newer = $this->assessment(TriageCategory::T2, 10);
        $volunteer = User::factory()->create(['role' => UserRole::RELAWAN, 'phone_number' => '+6281234567890']);
        $current->update(['user_id' => $volunteer->id]);
        HealthcareFacility::create(['name' => 'Faskes Nonaktif', 'type' => 'RS', 'is_active' => false]);
        $this->get("/healthcare/validations/{$current->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->component('Healthcare/Validations/Show', false)
            ->where('assessment.id', $current->id)
            ->where('assessment.triage_result.system_recommendation', 'T1')
            ->has('assessment.srq_responses', 1)
            ->has('assessment.risk_assessment', 1)
            ->has('assessment.function_assessment', 1)
            ->where('assessment.user.id', $volunteer->id)
            ->where('assessment.user.name', $volunteer->name)
            ->missing('assessment.user.phone_number')
            ->missing('assessment.user.email')
            ->has('previousAssessments', 1)
            ->where('previousAssessments.0.id', $previous->id)
            ->has('facilities', 1)->etc());
        $this->assertNotSame($newer->id, $previous->id);
        $this->get('/healthcare/validations')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('pendingAssessments.0.user.id', $volunteer->id)
            ->missing('pendingAssessments.0.user.phone_number')
            ->missing('pendingAssessments.0.user.email')->etc());
    }

    public function test_validation_post_rejects_ineligible_source_assessments(): void
    {
        $t3 = $this->assessment(TriageCategory::T3);
        $t0 = $this->assessment(TriageCategory::T0_SUSPECT);
        $incomplete = $this->assessment(TriageCategory::T1);
        $incomplete->update(['status' => AssessmentStatus::IN_PROGRESS]);
        $withoutTriage = $this->assessment(TriageCategory::T1);
        $withoutTriage->triageResult()->delete();

        foreach ([$t3, $t0, $incomplete, $withoutTriage] as $assessment) {
            $this->postJson("/healthcare/validations/{$assessment->id}", [
                'clinical_result' => 'T1',
                'referral_required' => false,
            ])->assertNotFound();
        }
        $this->assertSame(0, ClinicalValidation::count());
        $this->assertSame(0, Referral::count());
    }

    public function test_eligible_t1_source_can_receive_a_t3_healthcare_result(): void
    {
        $assessment = $this->assessment(TriageCategory::T1);
        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T3',
            'referral_required' => false,
        ])->assertOk();
        $this->assertSame(TriageCategory::T3, $assessment->clinicalValidation()->firstOrFail()->clinical_result);
        $this->assertSame(TriageCategory::T1, $assessment->triageResult()->firstOrFail()->system_recommendation);
    }

    public function test_saved_validation_is_immutable_on_changed_replay(): void
    {
        $assessment = $this->assessment(TriageCategory::T1);
        $url = "/healthcare/validations/{$assessment->id}";
        $this->postJson($url, [
            'clinical_result' => 'T2',
            'diagnosis_notes' => 'Catatan awal',
            'intervention_plan' => 'Rencana awal',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
        ])->assertOk();
        $validation = $assessment->clinicalValidation()->firstOrFail();
        $referral = $validation->referral()->firstOrFail();
        $this->postJson($url, [
            'clinical_result' => 'T3',
            'diagnosis_notes' => 'Catatan berbeda',
            'intervention_plan' => 'Rencana berbeda',
            'referral_required' => false,
        ])->assertOk();
        $this->assertSame(TriageCategory::T2, $validation->fresh()->clinical_result);
        $this->assertSame('Catatan awal', $validation->fresh()->diagnosis_notes);
        $this->assertSame('Rencana awal', $validation->fresh()->intervention_plan);
        $this->assertTrue($validation->fresh()->referral_required);
        $this->assertSame(1, ClinicalValidation::count());
        $this->assertSame($referral->id, $validation->referral()->firstOrFail()->id);
        $this->assertSame(1, Referral::count());
        $this->assertSame(1, ReferralStatusHistory::count());
    }

    public function test_non_t0_referral_requires_explicit_active_destination_and_replay_keeps_history(): void
    {
        $assessment = $this->assessment(TriageCategory::T1);
        $url = "/healthcare/validations/{$assessment->id}";
        $payload = ['clinical_result' => 'T1', 'referral_required' => true];
        $this->postJson($url, $payload)->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $inactive = HealthcareFacility::create(['name' => 'Tutup', 'type' => 'RS', 'is_active' => false]);
        $this->postJson($url, $payload + ['facility_id' => $inactive->id])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->postJson($url, $payload + ['facility_id' => 999999])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->assertSame(0, ClinicalValidation::count());
        $this->assertSame(0, Referral::count());
        $this->postJson($url, $payload + ['facility_id' => $this->facility->id])->assertOk();
        $this->postJson($url, $payload + ['facility_id' => $this->facility->id])->assertOk();
        $referral = $assessment->clinicalValidation()->firstOrFail()->referral()->firstOrFail();
        $this->assertSame($this->facility->id, $referral->facility_id);
        $this->assertSame(1, Referral::count());
        $this->assertSame(1, ReferralStatusHistory::where('referral_id', $referral->id)->count());
        $this->facility->update(['is_active' => false]);
        $this->get("/healthcare/patients/{$this->patient->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patient.referrals.0.facility.id', $this->facility->id)
            ->where('patient.referrals.0.facility.is_active', false)
            ->where('patient.referrals.0.clinical_validation.assessment.id', $assessment->id)
            ->has('patient.referrals.0.status_history', 1)->etc());
    }

    public function test_failed_non_t0_referral_write_returns_form_error_and_retry_does_not_duplicate(): void
    {
        $assessment = $this->assessment(TriageCategory::T1);
        $url = "/healthcare/validations/{$assessment->id}";
        $payload = ['clinical_result' => 'T1', 'referral_required' => true, 'facility_id' => $this->facility->id];
        ReferralStatusHistory::creating(function (): void {
            throw new RuntimeException('Simulated history write failure');
        });
        try {
            $this->from($url)->post($url, $payload)->assertRedirect($url)->assertSessionHasErrors('form');
        } finally {
            ReferralStatusHistory::flushEventListeners();
        }
        $this->assertSame(0, ClinicalValidation::count());
        $this->assertSame(0, Referral::count());
        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, $payload)->assertOk();
        $this->assertSame(1, ClinicalValidation::count());
        $this->assertSame(1, Referral::count());
        $this->assertSame(1, ReferralStatusHistory::count());
    }

    public function test_patient_referrals_are_newest_first_even_if_inserted_out_of_order(): void
    {
        $newer = Referral::create([
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => \App\Enums\ReferralStatus::ACTIVE,
        ]);
        $newer->forceFill(['created_at' => now()->subDay()])->save();
        $older = Referral::create([
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => \App\Enums\ReferralStatus::COMPLETED,
        ]);
        $older->forceFill(['created_at' => now()->subDays(3)])->save();

        $this->get("/healthcare/patients/{$this->patient->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patient.referrals.0.id', $newer->id)
            ->where('patient.referrals.1.id', $older->id)->etc());
    }

    public function test_patient_history_distinguishes_t0_and_assessment_referrals(): void
    {
        $assessment = $this->assessment(TriageCategory::T1);
        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
        ])->assertOk();
        $emergency = EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::REVIEWING,
        ]);
        $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
            'clinical_result' => 'T0_CONFIRMED',
        ])->assertOk();
        $this->postJson("/healthcare/emergencies/{$emergency->id}/referrals", [
            'facility_id' => $this->facility->id,
        ])->assertOk();
        $assessment->clinicalValidation()->firstOrFail()->referral()->firstOrFail()
            ->forceFill(['created_at' => now()->subMinutes(2)])->save();
        $emergency->referrals()->firstOrFail()
            ->forceFill(['created_at' => now()->subMinute()])->save();
        $this->get("/healthcare/patients/{$this->patient->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->has('patient.referrals', 2)
            ->where('patient.referrals.0.emergency_event_id', $emergency->id)
            ->where('patient.referrals.1.clinical_validation_id', $assessment->clinicalValidation()->firstOrFail()->id)
            ->has('patient.referrals.0.status_history', 1)
            ->has('patient.referrals.1.status_history', 1)->etc());
    }
}
