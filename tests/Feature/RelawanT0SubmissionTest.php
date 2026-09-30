<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\UserRole;
use App\Events\EmergencyCreated;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

final class RelawanT0SubmissionTest extends TestCase
{
    use RefreshDatabase;

    private User $relawan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($this->relawan);
    }

    private function assessmentFor(User $owner): Assessment
    {
        $patient = Patient::create(['name' => 'Pasien Uji T0', 'created_by' => $owner->id]);

        return Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $owner->id,
            'status' => AssessmentStatus::IN_PROGRESS,
            'mode' => AssessmentMode::VERBAL,
        ]);
    }

    public function test_owned_assessment_and_matching_patient_are_saved_together(): void
    {
        Event::fake([EmergencyCreated::class]);
        $assessment = $this->assessmentFor($this->relawan);

        $this->postJson('/relawan/emergencies', [
            'red_flag_type' => RedFlagType::PSYCHOSIS->value,
            'assessment_id' => $assessment->id,
            'patient_id' => $assessment->patient_id,
        ])->assertCreated();

        $emergency = EmergencyEvent::sole();
        $this->assertSame($assessment->id, $emergency->assessment_id);
        $this->assertSame($assessment->patient_id, $emergency->patient_id);
        $this->assertSame($this->relawan->id, $emergency->user_id);
    }

    public function test_owned_assessment_derives_patient_when_patient_id_is_omitted(): void
    {
        Event::fake([EmergencyCreated::class]);
        $assessment = $this->assessmentFor($this->relawan);

        $this->postJson('/relawan/emergencies', [
            'red_flag_type' => RedFlagType::PSYCHOSIS->value,
            'assessment_id' => $assessment->id,
        ])->assertCreated();

        $emergency = EmergencyEvent::sole();
        $this->assertSame($assessment->id, $emergency->assessment_id);
        $this->assertSame($assessment->patient_id, $emergency->patient_id);
    }

    public function test_conflicting_patient_and_assessment_are_rejected(): void
    {
        $assessment = $this->assessmentFor($this->relawan);
        $otherPatient = Patient::create(['name' => 'Pasien Lain Uji T0', 'created_by' => $this->relawan->id]);

        $this->postJson('/relawan/emergencies', [
            'red_flag_type' => RedFlagType::PSYCHOSIS->value,
            'assessment_id' => $assessment->id,
            'patient_id' => $otherPatient->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('patient_id');

        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_foreign_relawan_assessment_is_rejected(): void
    {
        $otherRelawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $assessment = $this->assessmentFor($otherRelawan);

        $this->postJson('/relawan/emergencies', [
            'red_flag_type' => RedFlagType::PSYCHOSIS->value,
            'assessment_id' => $assessment->id,
            'patient_id' => $assessment->patient_id,
        ])->assertUnprocessable()->assertJsonValidationErrors('assessment_id');

        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_generic_unidentified_emergency_keeps_nullable_context(): void
    {
        Event::fake([EmergencyCreated::class]);

        $this->postJson('/relawan/emergencies', [
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS->value,
            'patient_id' => null,
            'assessment_id' => null,
        ])->assertCreated();

        $emergency = EmergencyEvent::sole();
        $this->assertNull($emergency->patient_id);
        $this->assertNull($emergency->assessment_id);
    }

    public function test_invalid_red_flag_is_rejected_without_creating_an_emergency(): void
    {
        $this->postJson('/relawan/emergencies', ['red_flag_type' => 'NOT_A_REAL_RED_FLAG'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('red_flag_type');

        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_valid_emergency_is_persisted_and_reports_successful_broadcast_dispatch(): void
    {
        Event::fake([EmergencyCreated::class]);

        $response = $this->postJson('/relawan/emergencies', ['red_flag_type' => RedFlagType::PSYCHOSIS->value])
            ->assertCreated()
            ->assertJsonPath('realtime_delivered', true)
            ->assertJsonMissingPath('warning');

        $emergency = EmergencyEvent::sole();
        $this->assertSame($emergency->id, $response->json('emergency_id'));
        $this->assertSame(RedFlagType::PSYCHOSIS, $emergency->red_flag_type);
        $this->assertSame(EmergencyStatus::PENDING, $emergency->status);
        Event::assertDispatched(EmergencyCreated::class, 1);
    }

    public function test_broadcast_failure_keeps_one_emergency_and_returns_json_warning(): void
    {
        Event::listen(EmergencyCreated::class, fn () => throw new RuntimeException('Simulated broadcast failure'));

        $response = $this->postJson('/relawan/emergencies', ['red_flag_type' => RedFlagType::MEDICAL_CRISIS->value])
            ->assertCreated()
            ->assertJsonPath('realtime_delivered', false)
            ->assertJsonStructure(['warning']);

        $this->assertStringContainsString('tersimpan di server', $response->json('message'));
        $this->assertStringContainsString('belum dapat dikonfirmasi', $response->json('warning'));
        $this->assertSame(1, EmergencyEvent::count());
        $emergency = EmergencyEvent::sole();
        $this->assertSame($emergency->id, $response->json('emergency_id'));
        $this->assertSame(EmergencyStatus::PENDING, $emergency->status);
    }

    public function test_broadcast_failure_redirects_to_saved_emergency_with_visible_flash_warning(): void
    {
        Event::listen(EmergencyCreated::class, fn () => throw new RuntimeException('Simulated broadcast failure'));

        $response = $this->post('/relawan/emergencies', ['red_flag_type' => RedFlagType::SEVERE_AGITATION->value]);

        $emergency = EmergencyEvent::sole();
        $response->assertRedirect("/relawan/emergencies/{$emergency->id}")
            ->assertSessionHas('error');
        $this->assertSame(EmergencyStatus::PENDING, $emergency->status);
        $this->get("/relawan/emergencies/{$emergency->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('Relawan/Emergency', false)
                ->where('emergency.id', $emergency->id)
                ->where('flash.error', fn ($warning) => str_contains($warning, 'belum dapat dikonfirmasi')));
    }
}
