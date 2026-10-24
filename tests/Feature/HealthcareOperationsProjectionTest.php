<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\DispatchDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class HealthcareOperationsProjectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]));
    }

    public function test_queue_retains_unassigned_and_unfinished_work_independently(): void
    {
        $noWork = EmergencyEvent::factory()->confirmed()->create();
        $completedReferral = Referral::factory()->create(['status' => 'COMPLETED']);
        $activeDispatch = EmergencyDispatch::factory()->create(['emergency_event_id' => $completedReferral->emergency_event_id]);
        $openReferral = Referral::factory()->create();

        EmergencyDispatch::factory()->create(
            ['emergency_event_id' => $openReferral->emergency_event_id, 'status' => 'COMPLETED']
        );
        $done = Referral::factory()->create(['status' => 'COMPLETED']);
        EmergencyDispatch::factory()->create(['emergency_event_id' => $done->emergency_event_id, 'status' => 'COMPLETED']);
        $dispatchOnlyDone = EmergencyDispatch::factory()->create(['status' => 'COMPLETED']);
        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('operationsAvailable', true)
            ->where('emergencies', fn($rows) => $rows->pluck('id')->sort()->values()->all() === collect([
                $noWork->id,
                $activeDispatch->emergency_event_id,
                $openReferral->emergency_event_id,
            ])->sort()->values()->all()));
    }

    public function test_projection_supports_unidentified_patient_snapshots_and_only_active_unit_options(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create(['patient_id' => null]);
        $unit = ResponseUnit::factory()->create();
        ResponseUnit::factory()->create(['is_active' => false]);
        $dispatch = EmergencyDispatch::factory()->create(['emergency_event_id' => $emergency->id, 'response_unit_id' => $unit->id]);
        $this->get("/healthcare/emergencies/{$emergency->id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->has('responseUnits', 1)->where('responseUnits.0.id', $unit->id)
            ->where('emergency.operations.dispatch.id', $dispatch->id)
            ->where('emergency.operations.dispatch.response_unit.name', $unit->name)
            ->where('emergency.operations.dispatch.next_statuses', ['EN_ROUTE'])
            ->where('emergency.operations.dispatch.referral_id', null)
            ->missing('emergency.dispatch')->missing('emergency.operations.dispatch.history.0.metadata'));
    }

    public function test_missing_additive_schema_is_explicit_and_keeps_existing_pages_available(): void
    {
        $referral = Referral::factory()->create(['status' => 'COMPLETED']);
        Schema::shouldReceive('hasTable')->with('emergency_dispatches')->andReturn(false);
        $this->get('/healthcare/emergencies')->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('operationsAvailable', false)->has('responseUnits', 0)
            ->where('emergencies.0.id', $referral->emergency_event_id)
            ->where('emergencies.0.operations.available', false)
            ->missing('emergencies.0.operations.dispatch'));
        $this->get('/healthcare/referrals')->assertOk()->assertInertia(fn(Assert $page) => $page->where('operationsAvailable', false));
    }

    public function test_projections_are_not_available_to_other_roles(): void
    {
        foreach ([UserRole::ADMIN, UserRole::RELAWAN] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role, 'is_active' => true]));
            $this->getJson('/healthcare/emergencies')->assertForbidden();
            $this->getJson('/healthcare/referrals')->assertForbidden();
        }
    }

    public function test_patient_projection_has_persisted_dispatch_history_and_referral_provenance(): void
    {
        $this->seed(DemoSeeder::class);
        $emergency = EmergencyEvent::findOrFail(DispatchDemoSeeder::id(8));
        $this->get("/healthcare/patients/{$emergency->patient_id}")->assertOk()->assertInertia(fn(Assert $page) => $page
            ->where('patient.emergency_events.0.operations.dispatch.status', 'COMPLETED')
            ->has('patient.emergency_events.0.operations.dispatch.history', 5)
            ->where('patient.emergency_events.0.operations.dispatch.history.0.event_type', 'ASSIGNED')
            ->where('patient.emergency_events.0.operations.dispatch.history.2.event_type', 'REFERRAL_LINKED')
            ->where('patient.emergency_events.0.operations.dispatch.history.4.previous_status', 'ON_SITE')
            ->where('patient.emergency_events.0.operations.referrals.0.source', 'T0_CONFIRMED')
            ->where('patient.emergency_events.0.operations.referrals.0.history.1.status', 'COMPLETED')
            ->where('patient.emergency_events.0.operations.dispatch.history.0.actor.name', User::where('email', 'nakes@rapidmind.id')->firstOrFail()->name)
            ->missing('patient.emergency_events.0.dispatch'));
    }
}
