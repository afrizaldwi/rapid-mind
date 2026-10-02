<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class HealthcareEmergencyLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $healthcare;
    private Patient $patient;
    private HealthcareFacility $facility;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facility = HealthcareFacility::create([
            'name' => 'RS Aktif',
            'type' => 'RS',
            'is_active' => true,
        ]);
        $this->healthcare = User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'is_active' => true,
            'facility_id' => $this->facility->id,
        ]);
        $this->patient = Patient::create([
            'name' => 'Pasien Darurat',
            'created_by' => $this->healthcare->id,
        ]);
        $this->actingAs($this->healthcare);
    }

    private function emergency(EmergencyStatus $status = EmergencyStatus::PENDING, bool $withPatient = true): EmergencyEvent
    {
        return EmergencyEvent::create([
            'patient_id' => $withPatient ? $this->patient->id : null,
            'user_id' => $this->healthcare->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => $status,
        ]);
    }

    private function secondaryVerification(EmergencyEvent $emergency, string $notes = 'Hasil awal'): EmergencyVerification
    {
        return EmergencyVerification::create([
            'emergency_event_id' => $emergency->id,
            'verified_by' => $this->healthcare->id,
            'method' => 'PHONE',
            'notes' => $notes,
        ]);
    }

    private function clinicalDecision(EmergencyEvent $emergency, TriageCategory $result): EmergencyVerification
    {
        return EmergencyVerification::create([
            'emergency_event_id' => $emergency->id,
            'verified_by' => $this->healthcare->id,
            'clinical_result' => $result,
            'notes' => 'Keputusan awal',
        ]);
    }

    public function test_acknowledgement_transition_and_replay_create_one_audit_entry(): void
    {
        $emergency = $this->emergency();
        $url = "/healthcare/emergencies/{$emergency->id}/acknowledge";

        $this->postJson($url)->assertOk();
        $this->postJson($url)->assertOk();

        $this->assertSame(EmergencyStatus::ACKNOWLEDGED, $emergency->fresh()->status);
        $this->assertSame(1, AuditLog::where('entity_id', $emergency->id)->where('action', 'EMERGENCY_ACKNOWLEDGED')->count());
    }

    public function test_acknowledgement_rejects_advanced_states_without_moving_them_backward(): void
    {
        foreach ([EmergencyStatus::REVIEWING, EmergencyStatus::CONFIRMED, EmergencyStatus::DOWNGRADED, EmergencyStatus::RESOLVED] as $status) {
            $emergency = $this->emergency($status);

            $this->postJson("/healthcare/emergencies/{$emergency->id}/acknowledge")
                ->assertConflict()
                ->assertJsonPath('current_status', $status->value);

            $this->assertSame($status, $emergency->fresh()->status);
        }

        $this->assertSame(0, AuditLog::where('action', 'EMERGENCY_ACKNOWLEDGED')->count());
    }

    public function test_secondary_verification_requires_acknowledgement_and_exact_replay_is_a_no_op(): void
    {
        $pending = $this->emergency();
        $payload = ['method' => 'PHONE', 'notes' => 'Hasil awal'];
        $this->postJson("/healthcare/emergencies/{$pending->id}/verify", $payload)->assertConflict();
        $this->assertSame(0, $pending->verifications()->count());

        $emergency = $this->emergency(EmergencyStatus::ACKNOWLEDGED);
        $url = "/healthcare/emergencies/{$emergency->id}/verify";
        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, $payload)->assertOk();

        $this->assertSame(EmergencyStatus::REVIEWING, $emergency->fresh()->status);
        $this->assertSame(1, $emergency->verifications()->whereNotNull('method')->count());
        $this->assertSame(1, AuditLog::where('entity_id', $emergency->id)->where('action', 'EMERGENCY_VERIFIED')->count());
    }

    public function test_changed_verification_replay_and_verification_after_final_decision_are_rejected(): void
    {
        $reviewing = $this->emergency(EmergencyStatus::REVIEWING);
        $saved = $this->secondaryVerification($reviewing);

        $this->postJson("/healthcare/emergencies/{$reviewing->id}/verify", [
            'method' => 'VIDEO',
            'notes' => 'Berbeda',
        ])->assertConflict();

        $this->assertSame('PHONE', $saved->fresh()->method->value);
        $this->assertSame('Hasil awal', $saved->fresh()->notes);
        $this->assertSame(1, $reviewing->verifications()->count());

        foreach ([EmergencyStatus::CONFIRMED, EmergencyStatus::DOWNGRADED, EmergencyStatus::RESOLVED] as $status) {
            $emergency = $this->emergency($status);
            $this->postJson("/healthcare/emergencies/{$emergency->id}/verify", [
                'method' => 'PHONE',
                'notes' => 'Terlambat',
            ])->assertConflict();
            $this->assertSame($status, $emergency->fresh()->status);
            $this->assertSame(0, $emergency->verifications()->count());
        }
    }

    public function test_classification_requires_reviewing_and_supports_confirmed_and_downgraded_results(): void
    {
        foreach ([EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::RESOLVED] as $status) {
            $emergency = $this->emergency($status);
            $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
                'clinical_result' => 'T0_CONFIRMED',
            ])->assertConflict();
            $this->assertSame($status, $emergency->fresh()->status);
            $this->assertSame(0, $emergency->verifications()->count());
        }

        foreach ([
            TriageCategory::T0_CONFIRMED->value => EmergencyStatus::CONFIRMED,
            TriageCategory::T1->value => EmergencyStatus::DOWNGRADED,
            TriageCategory::T2->value => EmergencyStatus::DOWNGRADED,
        ] as $result => $expectedStatus) {
            $emergency = $this->emergency(EmergencyStatus::REVIEWING);
            $this->postJson("/healthcare/emergencies/{$emergency->id}/classify", [
                'clinical_result' => $result,
            ])->assertOk();
            $this->assertSame($expectedStatus, $emergency->fresh()->status);
        }
    }

    public function test_classification_replay_is_immutable_and_changed_result_conflicts(): void
    {
        $emergency = $this->emergency(EmergencyStatus::REVIEWING);
        $url = "/healthcare/emergencies/{$emergency->id}/classify";

        $this->postJson($url, ['clinical_result' => 'T0_CONFIRMED', 'notes' => 'Keputusan awal'])->assertOk();
        $this->postJson($url, ['clinical_result' => 'T0_CONFIRMED', 'notes' => 'Tidak boleh mengganti'])->assertOk();

        $decision = $emergency->verifications()->whereNotNull('clinical_result')->firstOrFail();
        $this->assertSame('Keputusan awal', $decision->notes);
        $this->assertSame(1, $emergency->verifications()->whereNotNull('clinical_result')->count());
        $this->assertSame(1, AuditLog::where('entity_id', $emergency->id)->where('action', 'EMERGENCY_CLASSIFIED')->count());

        $this->postJson($url, ['clinical_result' => 'T1'])->assertConflict();
        $this->assertSame(EmergencyStatus::CONFIRMED, $emergency->fresh()->status);
        $this->assertSame(TriageCategory::T0_CONFIRMED, $decision->fresh()->clinical_result);
        $this->assertSame(0, Referral::count());
    }

    public function test_explicit_referral_creation_is_idempotent_and_destination_is_immutable(): void
    {
        $emergency = $this->emergency(EmergencyStatus::CONFIRMED);
        $url = "/healthcare/emergencies/{$emergency->id}/referrals";
        $payload = ['facility_id' => $this->facility->id, 'notes' => 'Hubungi IGD'];

        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, $payload)->assertOk();

        $referral = $emergency->referrals()->firstOrFail();
        $this->assertSame(ReferralStatus::ACTIVE, $referral->status);
        $this->assertSame(1, $emergency->referrals()->count());
        $this->assertSame(1, $referral->statusHistory()->where('status', ReferralStatus::ACTIVE)->count());

        $otherFacility = HealthcareFacility::create(['name' => 'RS Lain', 'type' => 'RS', 'is_active' => true]);
        $this->postJson($url, ['facility_id' => $otherFacility->id])->assertConflict();
        $this->assertSame($this->facility->id, $referral->fresh()->facility_id);
        $this->assertSame('Hubungi IGD', $referral->fresh()->notes);
    }

    public function test_referral_creation_rejects_invalid_states_missing_patient_and_inactive_or_unknown_facility(): void
    {
        foreach ([EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING, EmergencyStatus::DOWNGRADED, EmergencyStatus::RESOLVED] as $status) {
            $emergency = $this->emergency($status);
            $this->postJson("/healthcare/emergencies/{$emergency->id}/referrals", [
                'facility_id' => $this->facility->id,
            ])->assertConflict();
            $this->assertSame($status, $emergency->fresh()->status);
            $this->assertSame(0, $emergency->referrals()->count());
        }

        $unidentified = $this->emergency(EmergencyStatus::CONFIRMED, false);
        $this->postJson("/healthcare/emergencies/{$unidentified->id}/referrals", [
            'facility_id' => $this->facility->id,
        ])->assertConflict();

        $confirmed = $this->emergency(EmergencyStatus::CONFIRMED);
        $inactive = HealthcareFacility::create(['name' => 'RS Nonaktif', 'type' => 'RS', 'is_active' => false]);
        $url = "/healthcare/emergencies/{$confirmed->id}/referrals";
        $this->postJson($url, ['facility_id' => $inactive->id])->assertUnprocessable()->assertJsonValidationErrors('facility_id');
        $this->postJson($url, ['facility_id' => 999999])->assertUnprocessable()->assertJsonValidationErrors('facility_id');

        $this->assertSame(0, Referral::count());
        $this->assertSame(0, ReferralStatusHistory::count());
    }
}
