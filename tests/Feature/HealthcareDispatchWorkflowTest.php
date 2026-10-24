<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Healthcare\ClinicalReferralWorkflow;
use App\Domain\Healthcare\DispatchWorkflow;
use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyDispatchStatus;
use App\Enums\EmergencyStatus;
use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Events\EmergencyUpdated;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyDispatchHistory;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\Region;
use App\Models\ResponseUnit;
use App\Models\Shelter;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

final class HealthcareDispatchWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $actor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actor = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $this->actingAs($this->actor);
    }

    private function assign(?EmergencyEvent $emergency = null, array $input = []): EmergencyDispatch
    {
        $emergency ??= EmergencyEvent::factory()->confirmed()->create();
        $input += ['response_unit_id' => ResponseUnit::factory()->create()->id];
        $response = $this->postJson("/healthcare/emergencies/{$emergency->id}/dispatches", $input)
            ->assertOk()->assertJsonPath('replayed', false)->assertJsonPath('dispatch.status', 'ASSIGNED');

        return EmergencyDispatch::findOrFail($response->json('dispatch.id'));
    }

    private function assessment(): Assessment
    {
        $patient = Patient::create(['name' => 'Penyintas Asesmen Sintetis', 'created_by' => $this->actor->id]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id, 'user_id' => $this->actor->id,
            'mode' => AssessmentMode::VERBAL, 'status' => AssessmentStatus::COMPLETED, 'completed_at' => now(),
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id, 'system_recommendation' => TriageCategory::T1, 'total_score' => 15,
        ]);

        return $assessment;
    }

    public function test_assignment_without_referral_persists_internal_action_and_audit_only(): void
    {
        Event::fake([EmergencyUpdated::class]);
        $dispatch = $this->assign();
        $history = $dispatch->history->sole();
        $audit = AuditLog::where('entity_id', $dispatch->id)->sole();

        $this->assertNull($dispatch->referral_id);
        $this->assertSame($this->actor->id, $dispatch->assigned_by);
        $this->assertSame('ASSIGNED', $history->event_type->value);
        $this->assertNull($history->previous_status);
        $this->assertSame($this->actor->id, $history->changed_by);
        $this->assertSame('GPS', $history->metadata['target']['target_source']);
        $this->assertSame('DISPATCH_ASSIGNED', $audit->action);
        $this->assertSame('ASSIGNED', $audit->new_values['status']);
        $this->assertSame(EmergencyStatus::CONFIRMED, $dispatch->emergencyEvent->status);
        $this->assertSame(0, Referral::count());
        Event::assertNotDispatched(EmergencyUpdated::class);
    }

    public function test_assignment_supports_unidentified_patients_and_zero_coordinates(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create(['patient_id' => null, 'latitude' => 0, 'longitude' => 0]);
        $dispatch = $this->assign($emergency);

        $this->assertNull($dispatch->emergencyEvent->patient_id);
        $this->assertSame('0.00000000', $dispatch->target_latitude);
        $this->assertSame('0.00000000', $dispatch->target_longitude);
    }

    public function test_assignment_with_referral_and_later_linking_have_independent_histories(): void
    {
        $referral = Referral::factory()->create();
        $dispatch = $this->assign($referral->emergencyEvent, ['referral_id' => $referral->id]);
        $this->assertSame($referral->id, $dispatch->referral_id);

        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $before = $this->assign($emergency);
        $this->postJson("/healthcare/emergencies/{$emergency->id}/referrals", ['facility_id' => $referral->facility_id])->assertOk();
        $later = $emergency->referrals()->sole();
        $payload = ['expected_referral_id' => null, 'referral_id' => $later->id, 'notes' => 'Hubungan tindak lanjut'];
        $url = "/healthcare/dispatches/{$before->id}/referral";
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', false);
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', true);

        $this->assertSame($later->id, $before->fresh()->referral_id);
        $link = $before->history()->where('event_type', 'REFERRAL_LINKED')->sole();
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $link->previous_status);
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $link->status);
        $this->assertSame($this->actor->id, $link->changed_by);
        $this->assertSame(1, AuditLog::where('entity_id', $before->id)->where('action', 'DISPATCH_REFERRAL_LINKED')->count());
        $this->assertSame(ReferralStatus::ACTIVE, $later->fresh()->status);
        $this->assertSame($later->emergency_event_id, $later->emergencyVerification->emergency_event_id);
    }

    public function test_assignment_replay_uses_initial_request_after_location_link_and_unit_changes(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $unit = ResponseUnit::factory()->create();
        $payload = ['response_unit_id' => $unit->id, 'notes' => 'Koordinasi internal'];
        $dispatch = $this->assign($emergency, $payload);
        $original = $dispatch->only(['assigned_at', 'assigned_by', 'target_latitude', 'target_longitude', 'target_description']);
        $referral = Referral::factory()->for($emergency)->create();
        $this->postJson("/healthcare/dispatches/{$dispatch->id}/referral", ['expected_referral_id' => null, 'referral_id' => $referral->id])->assertOk();
        $emergency->update(['latitude' => -6, 'longitude' => 100]);
        $unit->update(['is_active' => false]);
        $other = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $url = "/healthcare/emergencies/{$emergency->id}/dispatches";
        $this->actingAs($other)->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', true);

        $this->assertEquals($original, $dispatch->fresh()->only(array_keys($original)));
        $this->assertSame($referral->id, $dispatch->fresh()->referral_id);
        $this->assertSame(1, EmergencyDispatch::count());
        $this->assertSame(1, $dispatch->history()->where('event_type', 'ASSIGNED')->count());
        $this->assertSame(1, AuditLog::where('action', 'DISPATCH_ASSIGNED')->count());
        $this->postJson($url, [...$payload, 'notes' => 'Berubah'])->assertConflict();
        $this->postJson($url, [...$payload, 'response_unit_id' => ResponseUnit::factory()->create()->id])->assertConflict();
    }

    public function test_eligibility_and_active_unit_are_validated_without_creating_records(): void
    {
        $unit = ResponseUnit::factory()->create();
        foreach (EmergencyStatus::cases() as $status) {
            if ($status === EmergencyStatus::CONFIRMED) {
                continue;
            }
            $emergency = EmergencyEvent::factory()->create(['status' => $status]);
            $this->postJson("/healthcare/emergencies/{$emergency->id}/dispatches", ['response_unit_id' => $unit->id])->assertConflict();
        }
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $unit->update(['is_active' => false]);
        foreach ([$unit->id, 2147483647] as $id) {
            $this->postJson("/healthcare/emergencies/{$emergency->id}/dispatches", ['response_unit_id' => $id])
                ->assertUnprocessable()->assertJsonValidationErrors('response_unit_id');
        }
        $this->assertSame(0, EmergencyDispatch::count());
        $this->assertSame(0, EmergencyDispatchHistory::count());
        $this->assertSame(0, AuditLog::count());
    }

    public function test_shelter_fallback_and_manual_target_selection_are_snapshotted(): void
    {
        $shelter = Shelter::create([
            'region_id' => Region::create(['name' => 'Wilayah Sintetis'])->id,
            'name' => 'Posko Sintetis', 'address' => 'Alamat awal',
        ]);
        $emergency = EmergencyEvent::factory()->confirmed()->create(['latitude' => null, 'longitude' => null, 'shelter_id' => $shelter->id]);
        $dispatch = $this->assign($emergency);
        $snapshot = $dispatch->target_description;
        $shelter->update(['address' => 'Alamat baru']);
        $this->assertSame('SHELTER', $dispatch->target_source->value);
        $this->assertSame($snapshot, $dispatch->fresh()->target_description);
        $this->assertSame($shelter->id, $dispatch->target_shelter_id);

        $manual = $this->assign(null, ['target_source' => 'MANUAL', 'target_description' => 'Tenda sintetis sebelah barat']);
        $this->assertNull($manual->target_latitude);
        $this->assertSame('Tenda sintetis sebelah barat', $manual->target_description);
        $zeroLabel = $this->assign(null, ['target_source' => 'MANUAL', 'target_description' => '0']);
        $this->assertSame('0', $zeroLabel->target_description);
    }

    public function test_invalid_or_missing_target_is_a_validation_error(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create(['latitude' => null, 'longitude' => null]);
        $url = "/healthcare/emergencies/{$emergency->id}/dispatches";
        $payload = ['response_unit_id' => ResponseUnit::factory()->create()->id];
        $this->postJson($url, $payload)->assertUnprocessable()->assertJsonValidationErrors('target_description');
        foreach (['GPS', 'SHELTER', 'UNKNOWN'] as $source) {
            $this->postJson($url, [...$payload, 'target_source' => $source])->assertUnprocessable()->assertJsonValidationErrors('target_source');
        }
        $this->postJson($url, [...$payload, 'target_source' => 'MANUAL', 'target_description' => '   '])->assertUnprocessable();
        $this->assertSame(0, EmergencyDispatch::count());
        $this->assign($emergency, [...$payload, 'target_description' => 'Lokasi manual sintetis']);
    }

    /** @return array<string, array{list<string>}> */
    public static function forwardPaths(): array
    {
        return [
            'transport' => [['ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'TRANSPORT', 'COMPLETED']],
            'scene completion' => [['ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED']],
        ];
    }

    #[DataProvider('forwardPaths')]
    public function test_every_allowed_transition_is_atomic_attributable_and_replayable(array $path): void
    {
        $dispatch = $this->assign();
        $url = "/healthcare/dispatches/{$dispatch->id}/status";
        foreach (array_slice($path, 1) as $i => $next) {
            $payload = ['expected_status' => $path[$i], 'status' => $next, 'notes' => 'Catatan sintetis '.$next];
            $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', false)->assertJsonPath('dispatch.status', $next);
            $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', true);
            $history = $dispatch->history()->where('event_type', 'STATUS_CHANGED')->where('status', $next)->sole();
            $this->assertSame($path[$i], $history->previous_status->value);
            $this->assertSame($this->actor->id, $history->changed_by);
            $audit = AuditLog::where('entity_id', $dispatch->id)->where('action', 'DISPATCH_STATUS_CHANGED')
                ->where('new_values->status', $next)->sole();
            $this->assertSame($path[$i], $audit->old_values['status']);
            $this->assertSame($next, $audit->new_values['status']);
        }
        $this->assertSame(count($path), $dispatch->history()->count());
        $this->assertSame(count($path), AuditLog::where('entity_id', $dispatch->id)->count());
        $this->assertSame(EmergencyStatus::CONFIRMED, $dispatch->emergencyEvent->fresh()->status);
    }

    public function test_invalid_backward_terminal_and_stale_requests_preserve_state(): void
    {
        foreach ([['ASSIGNED', 'ON_SITE'], ['EN_ROUTE', 'TRANSPORT'], ['ON_SITE', 'ASSIGNED'], ['TRANSPORT', 'ON_SITE'], ['COMPLETED', 'EN_ROUTE']] as [$from, $next]) {
            $dispatch = EmergencyDispatch::factory()->create(['status' => $from]);
            $this->postJson("/healthcare/dispatches/{$dispatch->id}/status", ['expected_status' => $from, 'status' => $next])->assertUnprocessable();
            $this->assertSame($from, $dispatch->fresh()->status->value);
            $this->assertSame(0, $dispatch->history()->count());
        }
        $dispatch = $this->assign();
        $url = "/healthcare/dispatches/{$dispatch->id}/status";
        $payload = ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE'];
        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, [...$payload, 'notes' => 'Berbeda'])->assertConflict();
        $this->postJson($url, ['expected_status' => 'ASSIGNED', 'status' => 'ON_SITE'])->assertConflict()->assertJsonPath('current_status', 'EN_ROUTE');
        $this->postJson($url, ['expected_status' => 'EN_ROUTE', 'status' => 'ON_SITE'])->assertOk();
        $this->postJson($url, $payload)->assertConflict();
        $this->assertSame(3, $dispatch->history()->count());
    }

    public function test_snapshot_cannot_be_overwritten_by_status_payload(): void
    {
        $dispatch = $this->assign();
        $this->postJson("/healthcare/dispatches/{$dispatch->id}/status", [
            'expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE',
            'target_latitude' => 88, 'target_description' => 'Penggantian', 'response_unit_id' => 999,
        ])->assertOk();
        $this->assertSame($dispatch->target_latitude, $dispatch->fresh()->target_latitude);
        $this->assertNull($dispatch->fresh()->target_description);
        $this->assertSame($dispatch->response_unit_id, $dispatch->fresh()->response_unit_id);
    }

    public function test_linking_rejects_mismatched_patient_source_stale_expectation_and_reassignment(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $dispatch = $this->assign($emergency);
        $url = "/healthcare/dispatches/{$dispatch->id}/referral";
        $differentSource = Referral::factory()->create();
        $wrongPatient = Referral::factory()->for($emergency)->create(['patient_id' => $differentSource->patient_id]);
        foreach ([$differentSource->id, $wrongPatient->id, (string) Str::uuid()] as $id) {
            $this->postJson($url, ['expected_referral_id' => null, 'referral_id' => $id])->assertUnprocessable()->assertJsonValidationErrors('referral_id');
        }
        $valid = Referral::factory()->for($emergency)->create();
        $this->postJson($url, ['expected_referral_id' => $valid->id, 'referral_id' => $valid->id])->assertConflict();
        $this->postJson($url, ['referral_id' => $valid->id])->assertUnprocessable();
        $this->postJson($url, ['expected_referral_id' => null, 'referral_id' => $valid->id])->assertOk();
        $another = Referral::factory()->for($emergency)->create();
        $this->postJson($url, ['expected_referral_id' => $valid->id, 'referral_id' => $another->id])->assertConflict();
        $this->postJson($url, ['expected_referral_id' => $valid->id, 'referral_id' => $differentSource->id])->assertConflict();
        $this->assertSame($valid->id, $dispatch->fresh()->referral_id);
        $this->assertSame(2, $dispatch->history()->count());

        $completed = EmergencyDispatch::factory()->for($emergency = EmergencyEvent::factory()->confirmed()->create())->create(['status' => 'COMPLETED']);
        $referral = Referral::factory()->for($emergency)->create();
        $this->postJson("/healthcare/dispatches/{$completed->id}/referral", ['expected_referral_id' => null, 'referral_id' => $referral->id])->assertConflict();
    }

    public function test_assignment_and_linking_reject_inconsistent_clinical_provenance(): void
    {
        $referral = Referral::factory()->create();
        $other = Referral::factory()->create();
        $referral->update(['emergency_verification_id' => $other->emergency_verification_id]);
        $unit = ResponseUnit::factory()->create();
        $this->postJson("/healthcare/emergencies/{$referral->emergency_event_id}/dispatches", [
            'response_unit_id' => $unit->id, 'referral_id' => $referral->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('referral_id');
        $dispatch = $this->assign($referral->emergencyEvent);
        $this->postJson("/healthcare/dispatches/{$dispatch->id}/referral", [
            'expected_referral_id' => null, 'referral_id' => $referral->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('referral_id');
        $this->assertNull($dispatch->fresh()->referral_id);
        $this->assertSame(1, $dispatch->history()->count());
    }

    public function test_new_endpoints_return_not_found_for_missing_or_malformed_resources(): void
    {
        foreach ([(string) Str::uuid(), 'not-a-uuid'] as $id) {
            $this->postJson("/healthcare/emergencies/{$id}/dispatches", ['response_unit_id' => 1])->assertNotFound();
            $this->postJson("/healthcare/dispatches/{$id}/status", ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE'])->assertNotFound();
            $this->postJson("/healthcare/dispatches/{$id}/referral", ['expected_referral_id' => null, 'referral_id' => (string) Str::uuid()])->assertNotFound();
            $this->postJson("/healthcare/referrals/{$id}/complete", ['expected_status' => 'ACTIVE'])->assertNotFound();
        }
    }

    public function test_new_completion_rejects_changed_replays_terminal_and_legacy_input(): void
    {
        $referral = Referral::factory()->create();
        $url = "/healthcare/referrals/{$referral->id}/complete";
        $payload = ['expected_status' => 'ACTIVE', 'notes' => '0'];
        $this->postJson($url, ['expected_status' => 'EN_ROUTE'])->assertUnprocessable();
        $this->postJson($url, ['expected_status' => 'COMPLETED'])->assertConflict();
        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->postJson($url, [...$payload, 'notes' => 'Changed'])->assertConflict();
        $this->postJson($url, ['expected_status' => 'COMPLETED'])->assertConflict();
        $this->assertSame('0', $referral->statusHistory()->sole()->notes);
        $this->assertSame(1, AuditLog::where('action', 'REFERRAL_COMPLETED')->count());
    }

    public static function referralCreationSources(): array
    {
        return ['T0' => [true], 'assessment' => [false]];
    }

    #[DataProvider('referralCreationSources')]
    public function test_creation_audit_failure_rolls_back_existing_referral_sources_and_retries_once(bool $t0): void
    {
        $fixture = Referral::factory()->create();
        $fixture->delete();
        $source = $t0 ? $fixture->emergencyEvent : $this->assessment();
        $url = $t0 ? "/healthcare/emergencies/{$source->id}/referrals" : "/healthcare/validations/{$source->id}";
        $payload = ['facility_id' => $fixture->facility_id];
        if (! $t0) {
            $payload += ['clinical_result' => 'T1', 'referral_required' => true];
        }
        AuditLog::creating(fn () => throw new RuntimeException('Synthetic audit failure'));
        try {
            $this->postJson($url, $payload)->assertStatus(500);
        } finally {
            AuditLog::flushEventListeners();
        }
        $this->assertSame(0, Referral::count());
        $this->assertSame(0, ReferralStatusHistory::count());
        if (! $t0) {
            $this->assertNull($source->fresh()->clinicalValidation);
        }
        $this->postJson($url, $payload)->assertOk();
        $this->postJson($url, $payload)->assertOk();
        $this->assertSame(1, Referral::count());
        $this->assertSame(1, ReferralStatusHistory::count());
        $this->assertSame(1, AuditLog::where('action', 'REFERRAL_CREATED')->count());
    }

    /** @return array<string, array{string, string}> */
    public static function failures(): array
    {
        return [
            'assignment history' => ['assign', EmergencyDispatchHistory::class],
            'assignment audit' => ['assign', AuditLog::class],
            'transition history' => ['transition', EmergencyDispatchHistory::class],
            'transition audit' => ['transition', AuditLog::class],
            'link history' => ['link', EmergencyDispatchHistory::class],
            'link audit' => ['link', AuditLog::class],
            'completion history' => ['complete', ReferralStatusHistory::class],
            'completion audit' => ['complete', AuditLog::class],
        ];
    }

    #[DataProvider('failures')]
    public function test_history_or_audit_failure_rolls_back_and_retry_writes_once(string $operation, string $failingModel): void
    {
        $referral = Referral::factory()->create();
        $dispatch = $operation === 'assign' ? null : $this->assign($referral->emergencyEvent);
        [$url, $payload] = match ($operation) {
            'assign' => ["/healthcare/emergencies/{$referral->emergency_event_id}/dispatches", ['response_unit_id' => ResponseUnit::factory()->create()->id]],
            'transition' => ["/healthcare/dispatches/{$dispatch->id}/status", ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE']],
            'link' => ["/healthcare/dispatches/{$dispatch->id}/referral", ['expected_referral_id' => null, 'referral_id' => $referral->id]],
            'complete' => ["/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE']],
        };
        $before = [EmergencyDispatch::count(), EmergencyDispatchHistory::count(), ReferralStatusHistory::count(), AuditLog::count()];
        $failingModel::creating(fn () => throw new RuntimeException('Synthetic required-write failure'));
        try {
            $this->postJson($url, $payload)->assertStatus(500);
        } finally {
            $failingModel::flushEventListeners();
        }
        $this->assertSame($before, [EmergencyDispatch::count(), EmergencyDispatchHistory::count(), ReferralStatusHistory::count(), AuditLog::count()]);
        $this->assertSame(ReferralStatus::ACTIVE, $referral->fresh()->status);
        if ($dispatch) {
            $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $dispatch->fresh()->status);
            $this->assertNull($dispatch->fresh()->referral_id);
        }
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', false);
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertSame($before[3] + 1, AuditLog::count());
    }

    public function test_clinical_completion_is_independent_and_legacy_movement_endpoint_stays_available(): void
    {
        $referral = Referral::factory()->create();
        $dispatch = $this->assign($referral->emergencyEvent, ['referral_id' => $referral->id]);
        $this->postJson("/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE', 'notes' => 'Tindak lanjut selesai'])->assertOk();
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $dispatch->fresh()->status);
        foreach (['ASSIGNED' => 'EN_ROUTE', 'EN_ROUTE' => 'ON_SITE', 'ON_SITE' => 'COMPLETED'] as $from => $to) {
            $this->postJson("/healthcare/dispatches/{$dispatch->id}/status", ['expected_status' => $from, 'status' => $to])->assertOk();
        }
        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame(EmergencyStatus::CONFIRMED, $dispatch->emergencyEvent->fresh()->status);

        $other = Referral::factory()->create();
        $otherDispatch = $this->assign($other->emergencyEvent, ['referral_id' => $other->id]);
        foreach (['ASSIGNED' => 'EN_ROUTE', 'EN_ROUTE' => 'ON_SITE', 'ON_SITE' => 'COMPLETED'] as $from => $to) {
            $this->postJson("/healthcare/dispatches/{$otherDispatch->id}/status", ['expected_status' => $from, 'status' => $to])->assertOk();
        }
        $this->assertSame(ReferralStatus::ACTIVE, $other->fresh()->status);
        $this->postJson("/healthcare/referrals/{$other->id}/status", ['expected_status' => 'ACTIVE', 'status' => 'EN_ROUTE'])->assertOk();
        $this->postJson("/healthcare/referrals/{$other->id}/complete", ['expected_status' => 'ACTIVE'])->assertConflict();
        $this->assertSame(ReferralStatus::EN_ROUTE, $other->fresh()->status);
    }

    public function test_non_t0_creation_completion_and_immutable_validation_remain_supported(): void
    {
        $assessment = $this->assessment();
        $facility = Referral::factory()->create()->facility;
        $payload = ['clinical_result' => 'T2', 'referral_required' => true, 'facility_id' => $facility->id];
        $url = "/healthcare/validations/{$assessment->id}";
        $this->postJson($url, $payload)->assertOk();
        $referral = $assessment->clinicalValidation()->sole()->referral;
        $this->postJson($url, [...$payload, 'clinical_result' => 'T3', 'referral_required' => false])->assertOk();
        $this->assertSame(TriageCategory::T2, $assessment->clinicalValidation()->sole()->clinical_result);
        $this->postJson("/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE'])->assertOk();
        $this->postJson("/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE'])->assertOk()->assertJsonPath('replayed', true);
        $this->assertNull($referral->fresh()->emergency_event_id);
        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame(0, EmergencyDispatch::count());
        $this->assertSame(2, $referral->statusHistory()->count());
        $this->assertSame(1, AuditLog::where('entity_id', $referral->id)->where('action', 'REFERRAL_CREATED')->count());
        $this->assertSame(1, AuditLog::where('entity_id', $referral->id)->where('action', 'REFERRAL_COMPLETED')->count());
    }

    public function test_json_inertia_conflicts_and_failure_responses_are_truthful(): void
    {
        $dispatch = $this->assign();
        $url = "/healthcare/dispatches/{$dispatch->id}/status";
        $this->from('/healthcare/emergencies')->post($url, ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE'])
            ->assertRedirect('/healthcare/emergencies')->assertSessionHas('message');
        $this->from('/healthcare/emergencies')->post($url, ['expected_status' => 'ASSIGNED', 'status' => 'ON_SITE'])
            ->assertRedirect('/healthcare/emergencies')->assertSessionHasErrors('conflict');
        EmergencyDispatchHistory::creating(fn () => throw new RuntimeException('Synthetic history failure'));
        try {
            $this->from('/healthcare/emergencies')->post($url, ['expected_status' => 'EN_ROUTE', 'status' => 'ON_SITE'])
                ->assertRedirect('/healthcare/emergencies')->assertSessionHasErrors('form');
        } finally {
            EmergencyDispatchHistory::flushEventListeners();
        }
        $this->assertSame(EmergencyDispatchStatus::EN_ROUTE, $dispatch->fresh()->status);
    }

    public function test_role_and_active_account_restrictions_cover_all_new_endpoints(): void
    {
        $referral = Referral::factory()->create();
        $dispatch = EmergencyDispatch::factory()->for($referral->emergencyEvent)->create();
        $requests = [
            ["/healthcare/emergencies/{$referral->emergency_event_id}/dispatches", ['response_unit_id' => $dispatch->response_unit_id]],
            ["/healthcare/dispatches/{$dispatch->id}/status", ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE']],
            ["/healthcare/dispatches/{$dispatch->id}/referral", ['expected_referral_id' => null, 'referral_id' => $referral->id]],
            ["/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE']],
        ];
        foreach ([UserRole::ADMIN, UserRole::RELAWAN] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role, 'is_active' => true]));
            foreach ($requests as [$url, $payload]) {
                $this->postJson($url, $payload)->assertForbidden();
            }
        }
        $this->actingAs(User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => false]));
        foreach ($requests as [$url, $payload]) {
            $this->postJson($url, $payload)->assertUnauthorized();
        }
        $this->app['auth']->forgetGuards();
        foreach ($requests as [$url, $payload]) {
            $this->postJson($url, $payload)->assertUnauthorized();
        }
        $this->assertSame(0, EmergencyDispatchHistory::count());
        $this->assertSame(0, AuditLog::count());
    }

    public function test_direct_service_calls_also_require_active_healthcare_authority(): void
    {
        $actor = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        foreach ([
            fn () => app(DispatchWorkflow::class)->assign($actor, (string) Str::uuid(), []),
            fn () => app(DispatchWorkflow::class)->transition($actor, (string) Str::uuid(), []),
            fn () => app(DispatchWorkflow::class)->linkReferral($actor, (string) Str::uuid(), []),
            fn () => app(ClinicalReferralWorkflow::class)->complete($actor, (string) Str::uuid(), []),
        ] as $operation) {
            try {
                $operation();
                $this->fail('Expected Healthcare authorization.');
            } catch (AuthorizationException $exception) {
                $this->assertNotEmpty($exception->getMessage());
            }
        }
    }
}
