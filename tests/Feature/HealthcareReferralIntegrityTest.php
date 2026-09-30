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
        return Assessment::create([
            'patient_id' => $this->patient->id,
            'user_id' => $this->healthcare->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => now(),
        ]);
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
}
