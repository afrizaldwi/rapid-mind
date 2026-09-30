<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\UserRole;
use App\Events\EmergencyCreated;
use App\Models\EmergencyEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

final class RelawanT0SubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
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
