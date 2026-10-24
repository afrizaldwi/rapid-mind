<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Healthcare\ClinicalReferralWorkflow;
use App\Domain\Healthcare\DispatchWorkflow;
use App\Events\DispatchUpdated;
use App\Events\ReferralUpdated;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\DispatchDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\TestCase;

final class HealthcareWorkflowRealtimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_dispatch_events_wait_for_commit_and_replays_emit_nothing(): void
    {
        Event::fake([DispatchUpdated::class]);
        $actor = User::factory()->create(['role' => 'HEALTHCARE', 'is_active' => true]);
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $input = ['response_unit_id' => ResponseUnit::factory()->create()->id];
        $workflow = app(DispatchWorkflow::class);
        DB::transaction(function () use ($workflow, $actor, $emergency, $input): void {
            $workflow->assign($actor, $emergency->id, $input);
            Event::assertNotDispatched(DispatchUpdated::class);
        });
        Event::assertDispatchedTimes(DispatchUpdated::class, 1);
        $workflow->assign($actor, $emergency->id, $input);
        Event::assertDispatchedTimes(DispatchUpdated::class, 1);
        $dispatch = $emergency->dispatch()->firstOrFail();
        $this->assertSame(
            ['dispatch' => ['id' => $dispatch->id], 'emergency' => ['id' => $emergency->id]],
            (new DispatchUpdated($dispatch->id, $emergency->id))->broadcastWith()
        );
        $this->assertSame('private-emergencies', (new DispatchUpdated($dispatch->id, $emergency->id))->broadcastOn()->name);
    }

    public function test_rollback_discards_notification_and_database_changes(): void
    {
        Event::fake([DispatchUpdated::class]);
        $actor = User::factory()->create(['role' => 'HEALTHCARE', 'is_active' => true]);
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        try {
            DB::transaction(function () use ($actor, $emergency): void {
                app(DispatchWorkflow::class)->assign($actor, $emergency->id, ['response_unit_id' => ResponseUnit::factory()->create()->id]);
                throw new RuntimeException('Synthetic rollback');
            });
        } catch (RuntimeException) {
        }
        $this->assertSame(0, EmergencyDispatch::count());
        Event::assertNotDispatched(DispatchUpdated::class);
    }

    public function test_broadcast_failure_does_not_fail_a_committed_http_mutation(): void
    {
        Event::listen(DispatchUpdated::class, static function (): void {
            throw new RuntimeException('Synthetic broadcast failure');
        });
        $actor = User::factory()->create(['role' => 'HEALTHCARE', 'is_active' => true]);
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $this->actingAs($actor)->postJson("/healthcare/emergencies/{$emergency->id}/dispatches", ['response_unit_id' => ResponseUnit::factory()->create()->id])
            ->assertOk()->assertJsonPath('replayed', false);
        $this->assertSame(1, EmergencyDispatch::count());
    }

    public function test_referral_completion_notifies_once_without_completing_dispatch(): void
    {
        Event::fake([ReferralUpdated::class]);
        $referral = Referral::factory()->create();
        $actor = $referral->referrer;
        $dispatch = app(DispatchWorkflow::class)->assign($actor, $referral->emergency_event_id, ['response_unit_id' => ResponseUnit::factory()->create()->id, 'referral_id' => $referral->id])->record;
        $workflow = app(ClinicalReferralWorkflow::class);
        $workflow->complete($actor, $referral->id, ['expected_status' => 'ACTIVE']);
        $workflow->complete($actor, $referral->id, ['expected_status' => 'ACTIVE']);
        Event::assertDispatchedTimes(ReferralUpdated::class, 1);
        $this->assertSame('ASSIGNED', $dispatch->fresh()->status->value);
    }

    public function test_non_t0_completion_emits_minimal_referral_notification(): void
    {
        $this->seed(DemoSeeder::class);
        Event::fake([ReferralUpdated::class]);
        $referral = Referral::findOrFail(DispatchDemoSeeder::id(10, 3));
        $this->actingAs($referral->referrer)->postJson("/healthcare/referrals/{$referral->id}/complete", ['expected_status' => 'ACTIVE'])->assertOk();
        Event::assertDispatched(ReferralUpdated::class, fn($event) => $event->broadcastWith() === [
            'referral' => ['id' => $referral->id],
            'emergency' => ['id' => null],
        ]);
        $this->assertNull($referral->fresh()->dispatch);
    }
}
