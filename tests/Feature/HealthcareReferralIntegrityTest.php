<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

final class HealthcareReferralIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $healthcare;
    private Patient $patient;
    private HealthcareFacility $facility;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facility = HealthcareFacility::create(['name' => 'Faskes Demo', 'type' => 'HOSPITAL', 'is_active' => true]);
        $this->healthcare = User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'is_active' => true,
            'facility_id' => $this->facility->id,
        ]);
        $this->actingAs($this->healthcare);
        $this->patient = Patient::create(['name' => 'Pasien Demo', 'created_by' => $this->healthcare->id]);
    }

    private function emergency(): EmergencyEvent
    {
        return EmergencyEvent::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::REVIEWING,
        ]);
    }

    private function assessment(): Assessment
    {
        $assessment = Assessment::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'total_score' => 15,
            'system_recommendation' => TriageCategory::T1,
        ]);

        return $assessment;
    }

    public function test_history_uses_the_migrated_table(): void
    {
        $referral = Referral::create([
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => ReferralStatus::ACTIVE,
        ]);

        $history = ReferralStatusHistory::create([
            'referral_id' => $referral->id,
            'status' => ReferralStatus::ACTIVE,
            'changed_by' => $this->healthcare->id,
        ]);

        $this->assertSame('referral_status_history', $history->getTable());
        $this->assertSame($history->id, $referral->statusHistory()->firstOrFail()->id);
    }

    public function test_emergency_classification_persists_referral_history_and_audit(): void
    {
        $emergency = $this->emergency();

        $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
            'clinical_result' => 'T0_CONFIRMED',
            'facility_id' => $this->facility->id,
        ])->assertOk();

        $this->assertSame(EmergencyStatus::CONFIRMED, $emergency->fresh()->status);
        $this->assertSame(TriageCategory::T0_CONFIRMED, $emergency->verifications()->firstOrFail()->clinical_result);
        $referral = $emergency->referrals()->firstOrFail();
        $this->assertSame(ReferralStatus::ACTIVE, $referral->status);
        $this->assertSame(ReferralStatus::ACTIVE, $referral->statusHistory()->firstOrFail()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'EMERGENCY_CLASSIFIED', 'entity_id' => $emergency->id]);
    }

    public function test_completed_assessment_validation_persists_referral_history_and_audit(): void
    {
        $assessment = $this->assessment();

        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
        ])->assertOk();

        $validation = ClinicalValidation::where('assessment_id', $assessment->id)->firstOrFail();
        $this->assertSame(TriageCategory::T1, $validation->clinical_result);
        $this->assertTrue($validation->referral_required);
        $referral = Referral::where('patient_id', $this->patient->id)->firstOrFail();
        $this->assertSame(ReferralStatus::ACTIVE, $referral->statusHistory()->firstOrFail()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'ASSESSMENT_VALIDATED', 'entity_id' => $assessment->id]);
    }

    public function test_inactive_facility_is_rejected_for_new_emergency_and_assessment_referrals(): void
    {
        $emergency = $this->emergency();
        $assessment = $this->assessment();
        $this->facility->update(['is_active' => false]);

        $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
            'clinical_result' => 'T0_CONFIRMED', 'facility_id' => $this->facility->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->assertSame(EmergencyStatus::REVIEWING, $emergency->fresh()->status);

        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1', 'referral_required' => true, 'facility_id' => $this->facility->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1', 'referral_required' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->assertSame(0, Referral::count());
        $this->assertSame(0, ClinicalValidation::count());
    }

    public function test_inactive_assigned_facility_falls_back_only_to_an_active_facility(): void
    {
        $active = HealthcareFacility::create(['name' => 'Faskes Aktif', 'type' => 'RS', 'is_active' => true]);
        $this->facility->update(['is_active' => false]);
        $emergency = $this->emergency();

        $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
            'clinical_result' => 'T0_CONFIRMED',
        ])->assertOk();

        $this->assertSame($active->id, $emergency->referrals()->firstOrFail()->facility_id);
    }

    public function test_historical_referral_remains_readable_after_facility_becomes_inactive(): void
    {
        $emergency = $this->emergency();
        $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
            'clinical_result' => 'T0_CONFIRMED', 'facility_id' => $this->facility->id,
        ])->assertOk();
        $referral = $emergency->referrals()->firstOrFail();
        $this->facility->update(['is_active' => false]);

        $this->assertSame($this->facility->id, $referral->fresh()->facility_id);
        $this->get('/healthcare/referrals')->assertOk()->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Healthcare/Referrals/Index', false)
            ->where('referrals.0.facility.id', $this->facility->id)
            ->where('referrals.0.facility.is_active', false)
            ->etc());
    }

    public function test_referral_status_and_history_change_together(): void
    {
        $referral = Referral::create([
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => ReferralStatus::ACTIVE,
        ]);

        $this->postJson("/healthcare/referrals/{$referral->id}/status", [
            'status' => 'COMPLETED',
            'notes' => 'Tindak lanjut selesai.',
        ])->assertOk();

        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame(ReferralStatus::COMPLETED, $referral->statusHistory()->firstOrFail()->status);
    }

    public function test_late_history_failure_rolls_back_classification_and_retry_creates_one_referral(): void
    {
        $emergency = $this->emergency();
        $url = "/healthcare/emergencies/{$emergency->id}/classify";
        $payload = ['clinical_result' => 'T0_CONFIRMED', 'facility_id' => $this->facility->id];

        ReferralStatusHistory::creating(function (): void {
            throw new RuntimeException('Test-only history failure');
        });

        $this->withoutExceptionHandling();

        try {
            $this->postJson($url, $payload);
            $this->fail('The history write should fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Test-only history failure', $exception->getMessage());
        } finally {
            ReferralStatusHistory::flushEventListeners();
        }

        $this->assertSame(EmergencyStatus::REVIEWING, $emergency->fresh()->status);
        $this->assertSame(0, EmergencyVerification::where('emergency_event_id', $emergency->id)->count());
        $this->assertSame(0, $emergency->referrals()->count());
        $this->assertSame(0, ReferralStatusHistory::count());
        $this->assertSame(0, AuditLog::where('action', 'EMERGENCY_CLASSIFIED')->count());

        $this->postJson($url, $payload)->assertOk();
        $this->assertSame(1, $emergency->referrals()->count());
        $this->assertSame(1, $emergency->referrals()->firstOrFail()->statusHistory()->count());
    }

    public function test_successful_emergency_replay_keeps_one_referral_and_its_completed_state(): void
    {
        $emergency = $this->emergency();
        $url = "/healthcare/emergencies/{$emergency->id}/classify";
        $payload = ['clinical_result' => 'T0_CONFIRMED', 'facility_id' => $this->facility->id, 'notes' => 'Initial referral'];

        $this->postJson($url, $payload)->assertOk();
        $referral = $emergency->referrals()->firstOrFail();
        $this->postJson($url, $payload)->assertOk();

        $this->assertSame(1, $emergency->referrals()->count());
        $this->assertSame($referral->id, $emergency->referrals()->firstOrFail()->id);
        $this->assertSame(1, $referral->statusHistory()->where('status', ReferralStatus::ACTIVE)->count());

        $this->postJson("/healthcare/referrals/{$referral->id}/status", ['status' => 'COMPLETED'])->assertOk();
        $otherFacility = HealthcareFacility::create(['name' => 'Faskes Lain', 'type' => 'HOSPITAL', 'is_active' => true]);
        $this->postJson($url, ['clinical_result' => 'T0_CONFIRMED', 'facility_id' => $otherFacility->id, 'notes' => 'Replay notes'])->assertOk();

        $this->assertSame(1, $emergency->referrals()->count());
        $this->assertSame($referral->id, $emergency->referrals()->firstOrFail()->id);
        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame($this->facility->id, $referral->fresh()->facility_id);
        $this->assertSame('Initial referral', $referral->fresh()->notes);
        $this->assertSame(1, $referral->statusHistory()->where('status', ReferralStatus::ACTIVE)->count());
        $this->assertSame(2, $referral->statusHistory()->count());
    }

    public function test_successful_assessment_replay_keeps_one_validation_and_completed_referral(): void
    {
        $assessment = $this->assessment();
        $url = "/healthcare/validations/{$assessment->id}";
        $payload = [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
            'intervention_plan' => 'Initial plan',
        ];

        $this->postJson($url, $payload)->assertOk();
        $validation = $assessment->clinicalValidation()->firstOrFail();
        $referral = $validation->referral()->firstOrFail();
        $this->postJson($url, $payload)->assertOk();

        $this->assertSame(1, $assessment->clinicalValidation()->count());
        $this->assertSame($validation->id, $assessment->clinicalValidation()->firstOrFail()->id);
        $this->assertSame(1, $validation->referral()->count());
        $this->assertSame($referral->id, $validation->referral()->firstOrFail()->id);
        $this->assertSame($validation->id, $referral->fresh()->clinical_validation_id);
        $this->assertSame(1, $referral->statusHistory()->where('status', ReferralStatus::ACTIVE)->count());

        $this->postJson("/healthcare/referrals/{$referral->id}/status", ['status' => 'COMPLETED'])->assertOk();
        $otherFacility = HealthcareFacility::create(['name' => 'Faskes Lain', 'type' => 'HOSPITAL', 'is_active' => true]);
        $this->postJson($url, [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $otherFacility->id,
            'intervention_plan' => 'Replay plan',
        ])->assertOk();

        $this->assertSame(1, $assessment->clinicalValidation()->count());
        $this->assertSame(1, $validation->referral()->count());
        $this->assertSame($referral->id, $validation->referral()->firstOrFail()->id);
        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame($this->facility->id, $referral->fresh()->facility_id);
        $this->assertSame('Initial plan', $referral->fresh()->notes);
        $this->assertSame('Initial plan', $validation->fresh()->intervention_plan);
        $this->assertSame(1, AuditLog::where('action', 'ASSESSMENT_VALIDATED')->count());
        $this->assertSame(1, $referral->statusHistory()->where('status', ReferralStatus::ACTIVE)->count());
        $this->assertSame(2, $referral->statusHistory()->count());
    }

    public function test_distinct_sources_for_one_patient_have_distinct_referrals(): void
    {
        $firstEmergency = $this->emergency();
        $secondEmergency = $this->emergency();
        $assessment = $this->assessment();

        foreach ([$firstEmergency, $secondEmergency] as $emergency) {
            $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
                'clinical_result' => 'T0_CONFIRMED',
                'facility_id' => $this->facility->id,
            ])->assertOk();
        }
        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
        ])->assertOk();

        $firstReferral = $firstEmergency->referrals()->firstOrFail();
        $secondReferral = $secondEmergency->referrals()->firstOrFail();
        $validation = $assessment->clinicalValidation()->firstOrFail();
        $assessmentReferral = $validation->referral()->firstOrFail();
        $this->assertCount(3, array_unique([$firstReferral->id, $secondReferral->id, $assessmentReferral->id]));
        $this->assertSame(3, Referral::where('patient_id', $this->patient->id)->count());
        $this->assertSame(3, ReferralStatusHistory::where('status', ReferralStatus::ACTIVE)->count());
    }

    public function test_legacy_unlinked_referral_is_preserved_when_validation_creates_a_linked_one(): void
    {
        $legacy = Referral::create([
            'patient_id' => $this->patient->id,
            'referred_by' => $this->healthcare->id,
            'facility_id' => $this->facility->id,
            'status' => ReferralStatus::COMPLETED,
            'notes' => 'Legacy source unknown',
        ]);
        $assessment = $this->assessment();

        $this->postJson("/healthcare/validations/{$assessment->id}", [
            'clinical_result' => 'T1',
            'referral_required' => true,
            'facility_id' => $this->facility->id,
        ])->assertOk();

        $this->assertNull($legacy->fresh()->clinical_validation_id);
        $this->assertSame(ReferralStatus::COMPLETED, $legacy->fresh()->status);
        $this->assertSame('Legacy source unknown', $legacy->fresh()->notes);
        $this->assertNotSame($legacy->id, $assessment->clinicalValidation()->firstOrFail()->referral()->firstOrFail()->id);
        $this->assertSame(2, Referral::where('patient_id', $this->patient->id)->count());
    }
}
