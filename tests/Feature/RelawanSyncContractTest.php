<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\RedFlagType;
use App\Enums\UserRole;
use App\Events\EmergencyCreated;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

final class RelawanSyncContractTest extends TestCase
{
    use RefreshDatabase;

    private User $relawan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($this->relawan);
    }

    private function patient(): array
    {
        return ['id' => (string) Str::uuid(), 'name' => 'Penyintas Sintetis', 'age' => 27, 'gender' => 'Perempuan'];
    }

    private function assessment(?array $patient = null): array
    {
        return [
            'id' => (string) Str::uuid(),
            'patient' => $patient ?? $this->patient(),
            'mode' => 'VERBAL',
            'status' => 'COMPLETED',
            'srq_answers' => array_fill_keys(range(1, 20), false),
            'risk_indicators' => array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false),
            'function_domains' => ['F1' => 0, 'F2' => 1, 'F3' => 3],
            'client_triage' => ['total_score' => 999, 'system_recommendation' => 'T0_SUSPECT'],
        ];
    }

    private function emergency(array $changes = []): array
    {
        return array_replace([
            'id' => (string) Str::uuid(),
            'red_flag_type' => RedFlagType::PSYCHOSIS->value,
            'notes' => 'Catatan sintetis',
        ], $changes);
    }

    public function test_completed_assessment_uses_stable_ids_canonical_triage_and_exact_replay(): void
    {
        $payload = $this->assessment();
        $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()
            ->assertJsonPath('assessment.id', $payload['id'])
            ->assertJsonPath('assessment.patient.id', $payload['patient']['id'])
            ->assertJsonPath('assessment.triage_result.total_score', 4);
        $this->assertSame(1, Patient::count());
        $this->assertSame(1, Assessment::count());
        $assessment = Assessment::findOrFail($payload['id']);
        $this->assertSame(20, $assessment->srqResponses()->count());
        $this->assertSame(5, $assessment->riskAssessment()->count());
        $this->assertSame(3, $assessment->functionAssessment()->count());
        $this->assertSame(1, $assessment->triageResult()->count());
        $this->assertSame(4, $assessment->triageResult->total_score);
        $this->postJson('/relawan/sync/assessments', $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertSame(1, Patient::count());
        $this->assertSame(1, Assessment::count());
        $this->assertSame(20, $assessment->srqResponses()->count());
        $this->assertSame(5, $assessment->riskAssessment()->count());
        $this->assertSame(3, $assessment->functionAssessment()->count());
        $this->assertSame(1, $assessment->triageResult()->count());
    }

    public function test_completed_collision_rejects_changed_answers_patient_mode_and_owner_without_mutation(): void
    {
        $payload = $this->assessment();
        $this->postJson('/relawan/sync/assessments', $payload)->assertCreated();
        $changed = $payload;
        $changed['srq_answers'][1] = true;
        $this->postJson('/relawan/sync/assessments', $changed)->assertStatus(409);
        $changed = $payload;
        $changed['patient'] = $this->patient();
        $this->postJson('/relawan/sync/assessments', $changed)->assertStatus(409);
        $changed = $payload;
        $changed['mode'] = 'NON_VERBAL';
        $this->postJson('/relawan/sync/assessments', $changed)->assertStatus(409);
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $this->postJson('/relawan/sync/assessments', $payload)->assertStatus(409);
        $assessment = Assessment::findOrFail($payload['id']);
        $this->assertFalse($assessment->srqResponses()->where('question_number', 1)->firstOrFail()->answer);
        $this->assertSame(4, $assessment->triageResult->total_score);
        $this->assertSame(1, Patient::count());
    }

    public function test_in_progress_shell_can_be_filled_and_completed_without_duplicate(): void
    {
        $patient = $this->patient();
        $payload = $this->assessment($patient);
        $shell = $payload;
        $shell['status'] = 'IN_PROGRESS';
        unset($shell['srq_answers'], $shell['risk_indicators'], $shell['function_domains']);
        $this->postJson('/relawan/sync/assessments', $shell)->assertCreated()
            ->assertJsonPath('assessment.triage_result', null);
        $this->postJson('/relawan/sync/assessments', $payload)->assertOk()
            ->assertJsonPath('assessment.status', 'COMPLETED');
        $this->assertSame(1, Assessment::count());
        $this->assertSame(1, Patient::count());
    }

    public function test_invalid_complete_payload_is_422_without_partial_patient_or_response_change(): void
    {
        $payload = $this->assessment();
        unset($payload['srq_answers'][20]);
        $this->postJson('/relawan/sync/assessments', $payload)->assertUnprocessable();
        $this->assertSame(0, Patient::count());
        $this->assertSame(0, Assessment::count());
        $valid = $this->assessment();
        $this->postJson('/relawan/sync/assessments', $valid)->assertCreated();
        $valid['risk_indicators']['R1'] = 'false';
        $this->postJson('/relawan/sync/assessments', $valid)->assertUnprocessable();
        $this->assertFalse(Assessment::findOrFail($valid['id'])->riskAssessment()->where('indicator', 'R1')->firstOrFail()->answer);
    }

    public function test_emergency_unidentified_create_replay_and_collision_dispatch_once(): void
    {
        Event::fake([EmergencyCreated::class]);
        $payload = $this->emergency();
        $this->postJson('/relawan/sync/emergencies', $payload)->assertCreated()
            ->assertJsonPath('emergency.id', $payload['id'])
            ->assertJsonPath('emergency.patient_id', null);
        $this->postJson('/relawan/sync/emergencies', $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertSame(1, EmergencyEvent::count());
        Event::assertDispatched(EmergencyCreated::class, 1);
        $changed = $payload;
        $changed['red_flag_type'] = RedFlagType::MEDICAL_CRISIS->value;
        $this->postJson('/relawan/sync/emergencies', $changed)->assertStatus(409);
        $this->assertSame(RedFlagType::PSYCHOSIS, EmergencyEvent::sole()->red_flag_type);
    }

    public function test_emergency_reconciles_local_patient_and_minimal_assessment_before_later_complete_sync(): void
    {
        Event::fake([EmergencyCreated::class]);
        $patient = $this->patient();
        $assessment = $this->assessment($patient);
        $emergency = $this->emergency([
            'patient' => $patient,
            'assessment_id' => $assessment['id'],
            'assessment_mode' => 'VERBAL',
        ]);
        $this->postJson('/relawan/sync/emergencies', $emergency)->assertCreated()
            ->assertJsonPath('emergency.assessment_id', $assessment['id']);
        $shell = Assessment::findOrFail($assessment['id']);
        $this->assertSame(AssessmentStatus::IN_PROGRESS, $shell->status);
        $this->assertSame($this->relawan->id, Patient::findOrFail($patient['id'])->created_by);
        $this->assertSame(0, $shell->srqResponses()->count());
        $this->assertSame(0, $shell->riskAssessment()->count());
        $this->assertSame(0, $shell->functionAssessment()->count());
        $this->assertSame(0, $shell->triageResult()->count());
        $this->postJson('/relawan/sync/emergencies', $emergency)->assertOk();
        Event::assertDispatched(EmergencyCreated::class, 1);
        $this->postJson('/relawan/sync/assessments', $assessment)->assertOk()
            ->assertJsonPath('assessment.status', 'COMPLETED');
        $this->assertSame(1, Assessment::count());
        $this->assertSame(1, Patient::count());
        $this->assertSame(1, EmergencyEvent::count());
    }

    public function test_emergency_replay_survives_later_assessment_mode_change(): void
    {
        Event::fake([EmergencyCreated::class]);
        $patient = $this->patient();
        $assessment = $this->assessment($patient);
        $emergency = $this->emergency([
            'patient' => $patient,
            'assessment_id' => $assessment['id'],
            'assessment_mode' => 'VERBAL',
        ]);

        $this->postJson('/relawan/sync/emergencies', $emergency)->assertCreated();
        $shell = Assessment::findOrFail($assessment['id']);
        $this->assertSame(AssessmentStatus::IN_PROGRESS, $shell->status);
        $this->assertSame(AssessmentMode::VERBAL, $shell->mode);

        $assessment['mode'] = 'NON_VERBAL';
        $this->postJson('/relawan/sync/assessments', $assessment)->assertOk()
            ->assertJsonPath('assessment.status', 'COMPLETED')
            ->assertJsonPath('assessment.mode', 'NON_VERBAL');

        $this->postJson('/relawan/sync/emergencies', $emergency)->assertOk()
            ->assertJsonPath('replayed', true)
            ->assertJsonPath('emergency.id', $emergency['id']);
        $this->assertSame(1, EmergencyEvent::count());
        $this->assertSame(1, Assessment::count());
        Event::assertDispatched(EmergencyCreated::class, 1);
    }

    public function test_existing_patient_context_is_allowed_but_foreign_assessment_and_relation_conflicts_are_rejected(): void
    {
        Event::fake([EmergencyCreated::class]);
        $patient = Patient::create(['name' => 'Penyintas Server', 'created_by' => $this->relawan->id]);
        $payload = $this->emergency(['patient' => ['id' => $patient->id]]);
        $this->postJson('/relawan/sync/emergencies', $payload)->assertCreated()
            ->assertJsonPath('emergency.patient_id', $patient->id);
        $other = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $foreignPatient = Patient::create(['name' => 'Lain', 'created_by' => $other->id]);
        $foreign = Assessment::create([
            'patient_id' => $foreignPatient->id,
            'user_id' => $other->id,
            'mode' => AssessmentMode::VERBAL,
            'status' => AssessmentStatus::IN_PROGRESS
        ]);
        $this->postJson('/relawan/sync/emergencies', $this->emergency([
            'patient' => ['id' => $foreignPatient->id],
            'assessment_id' => $foreign->id,
            'assessment_mode' => 'VERBAL',
        ]))->assertUnprocessable();
        $this->postJson('/relawan/sync/emergencies', $this->emergency([
            'patient' => ['id' => $patient->id],
            'assessment_id' => $foreign->id,
            'assessment_mode' => 'VERBAL',
        ]))->assertUnprocessable();
        $this->assertSame(1, EmergencyEvent::count());
    }

    public function test_emergency_invalid_dependency_rolls_back_and_owner_collision_is_409(): void
    {
        Event::fake([EmergencyCreated::class]);
        $payload = $this->emergency([
            'patient' => $this->patient(),
            'assessment_id' => (string) Str::uuid(),
            'assessment_mode' => 'VERBAL'
        ]);
        $bad = $payload;
        unset($bad['patient']['name']);
        $this->postJson('/relawan/sync/emergencies', $bad)->assertUnprocessable();
        $this->assertSame(0, Patient::count());
        $this->assertSame(0, Assessment::count());
        $this->postJson('/relawan/sync/emergencies', $payload)->assertCreated();
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $this->postJson('/relawan/sync/emergencies', $payload)->assertStatus(409);
        $this->assertSame(1, EmergencyEvent::count());
    }

    public function test_broadcast_failure_keeps_one_emergency_and_replay_never_dispatches_again(): void
    {
        $attempts = 0;
        Event::listen(EmergencyCreated::class, function () use (&$attempts) {
            $attempts++;
            throw new RuntimeException('Simulated broadcast failure');
        });
        $payload = $this->emergency();
        $this->postJson('/relawan/sync/emergencies', $payload)->assertCreated()
            ->assertJsonPath('realtime_delivered', false)->assertJsonStructure(['warning']);
        $this->postJson('/relawan/sync/emergencies', $payload)->assertOk()
            ->assertJsonPath('replayed', true);
        $this->assertSame(1, $attempts);
        $this->assertSame(1, EmergencyEvent::count());
    }
    public function test_existing_same_shelter_patient_is_available_and_inaccessible_uuid_is_not_overwritten(): void
    {
        $region = Region::create(['name' => 'Wilayah Sintetis']);
        $shelter = Shelter::create(['region_id' => $region->id, 'name' => 'Posko Sintetis']);
        $this->relawan->update(['shelter_id' => $shelter->id]);
        $other = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $shared = Patient::create(['name' => 'Nama Server', 'created_by' => $other->id, 'shelter_id' => $shelter->id]);
        $payload = $this->assessment(['id' => $shared->id, 'name' => 'Nama Klien']);
        $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()
            ->assertJsonPath('assessment.patient.name', 'Nama Server');
        $this->assertSame(1, Patient::count());
        $private = Patient::create(['name' => 'Privat', 'created_by' => $other->id]);
        $bad = $this->assessment(['id' => $private->id, 'name' => 'Pengambilalihan']);
        $this->postJson('/relawan/sync/assessments', $bad)->assertUnprocessable();
        $this->assertSame('Privat', $private->fresh()->name);
        $this->assertSame(1, Assessment::count());
    }

    public function test_partial_group_uses_valid_keys_and_never_calculates_final_triage(): void
    {
        $payload = $this->assessment();
        $payload['status'] = 'IN_PROGRESS';
        $payload['srq_answers'] = ['1' => true, '2' => false];
        unset($payload['risk_indicators'], $payload['function_domains']);
        $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()
            ->assertJsonPath('assessment.triage_result', null);
        $this->assertSame(2, Assessment::findOrFail($payload['id'])->srqResponses()->count());
        $bad = $payload;
        $bad['srq_answers']['21'] = true;
        $this->postJson('/relawan/sync/assessments', $bad)->assertUnprocessable();
        $this->assertSame(2, Assessment::findOrFail($payload['id'])->srqResponses()->count());
    }

    public function test_non_relawan_cannot_use_sync_endpoints(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]));
        $this->postJson('/relawan/sync/assessments', $this->assessment())->assertForbidden();
        $this->postJson('/relawan/sync/emergencies', $this->emergency())->assertForbidden();
        $this->assertSame(0, Assessment::count());
        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_emergency_existing_assessment_rejects_mismatched_patient_without_partial_mutation(): void
    {
        $payload = $this->assessment();
        $payload['status'] = 'IN_PROGRESS';
        unset($payload['srq_answers'], $payload['risk_indicators'], $payload['function_domains']);
        $this->postJson('/relawan/sync/assessments', $payload)->assertCreated();
        $bad = $this->emergency([
            'patient' => $this->patient(),
            'assessment_id' => $payload['id'],
            'assessment_mode' => 'VERBAL'
        ]);
        $this->postJson('/relawan/sync/emergencies', $bad)->assertStatus(409);
        $this->assertSame(1, Patient::count());
        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_emergency_replay_rejects_changed_patient_assessment_and_notes_without_mutation(): void
    {
        Event::fake([EmergencyCreated::class]);
        $patient = $this->patient();
        $assessment = $this->assessment($patient);
        $payload = $this->emergency([
            'patient' => $patient,
            'assessment_id' => $assessment['id'],
            'assessment_mode' => 'VERBAL'
        ]);
        $this->postJson('/relawan/sync/emergencies', $payload)->assertCreated();
        $changed = $payload;
        $changed['patient'] = $this->patient();
        $this->postJson('/relawan/sync/emergencies', $changed)->assertStatus(409);
        $changed = $payload;
        $changed['assessment_id'] = (string) Str::uuid();
        $this->postJson('/relawan/sync/emergencies', $changed)->assertStatus(409);
        $changed = $payload;
        $changed['notes'] = 'Catatan berbeda';
        $this->postJson('/relawan/sync/emergencies', $changed)->assertStatus(409);
        $this->assertSame(1, EmergencyEvent::count());
        $this->assertSame(1, Assessment::count());
        $this->assertSame(1, Patient::count());
        $this->assertSame($payload['notes'], EmergencyEvent::sole()->notes);
        Event::assertDispatched(EmergencyCreated::class, 1);
    }
}
