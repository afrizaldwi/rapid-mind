<?php

namespace Tests\Feature;

use App\Domain\Healthcare\CaseAudience;
use App\Events\AssessmentUpdated;
use App\Events\EmergencyCreated;
use App\Events\EmergencyUpdated;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class HealthcareCaseRealtimeTest extends TestCase
{
    use RefreshDatabase, \Tests\Concerns\ClinicalScopeFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createScopeFixtures();
        config()->set('broadcasting.default', 'pusher');
        config()->set('broadcasting.connections.pusher', [
            'driver' => 'pusher',
            'key' => 'synthetic',
            'secret' => 'synthetic',
            'app_id' => 'synthetic',
        ]);
        require base_path('routes/channels.php');
    }

    private function channelAuth(string $channel)
    {
        return $this->postJson('/broadcasting/auth', ['channel_name' => 'private-' . $channel, 'socket_id' => '123.456']);
    }

    public function test_channel_requires_current_facility_identity_and_version_and_logout_retires_old_subscriptions(): void
    {
        $case = $this->scopeEmergency('A');
        $a = $this->medics['A']->fresh();
        $b = $this->medics['B']->fresh();
        $channel = CaseAudience::channel($a);
        $this->actingAs($a);
        $this->channelAuth($channel)->assertOk();
        $this->channelAuth(CaseAudience::channel($b))->assertForbidden();
        $this->channelAuth(str_replace("facility.$a->facility_id", "facility.$b->facility_id", $channel))->assertForbidden();
        $this->channelAuth('emergencies')->assertForbidden();
        $this->assertSame(['private-' . $channel], array_column((new EmergencyCreated($case))->broadcastOn(), 'name'));
        $this->assertSame(['emergency' => ['id' => $case->id]], (new EmergencyUpdated($case))->broadcastWith());
        $version = $a->token_version;
        $this->post('/logout')->assertRedirect('/login');
        $this->assertSame($version + 1, $a->fresh()->token_version);
        $this->assertNotContains('private-' . $channel, array_column((new EmergencyUpdated($case))->broadcastOn(), 'name'));
        $this->actingAs($a->fresh());
        $this->channelAuth($channel)->assertForbidden();
        $this->channelAuth(CaseAudience::channel($a->fresh()))->assertOk();
        $a->update(['is_active' => false]);
        $this->assertSame([], (new EmergencyUpdated($case))->broadcastOn());
    }

    public function test_assessment_invalidation_waits_for_commit_is_scoped_and_replay_emits_nothing(): void
    {
        Event::fake([AssessmentUpdated::class]);
        $this->actingAs($this->relawan['A']);
        $payload = [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Sintetis'],
            'mode' => 'VERBAL',
            'status' => 'IN_PROGRESS',
            'srq_answers' => [17 => 'UNCLEAR']
        ];
        DB::transaction(function () use ($payload) {
            $this->postJson('/relawan/sync/assessments', $payload)->assertCreated();
            Event::assertNotDispatched(AssessmentUpdated::class);
        });
        Event::assertDispatchedTimes(AssessmentUpdated::class, 1);
        $event = new AssessmentUpdated($payload['id']);
        $this->assertSame(['assessment' => ['id' => $payload['id']]], $event->broadcastWith());
        $this->assertSame(['private-' . CaseAudience::channel($this->medics['A']->fresh())], array_column($event->broadcastOn(), 'name'));
        $this->postJson('/relawan/sync/assessments', $payload)->assertOk()->assertJsonPath('replayed', true);
        Event::assertDispatchedTimes(AssessmentUpdated::class, 1);
    }

    public function test_missing_scope_schema_preserves_unrouted_fieldwork_and_reports_unknown_counts(): void
    {
        Event::fake([EmergencyCreated::class]);
        $migration = require database_path('migrations/2026_11_07_000000_add_clinical_case_facility_scope.php');
        $migration->down(); // Approved disposable testing database, inside its rollback transaction.
        $this->actingAs($this->medics['A'])->get('/healthcare/emergencies')->assertInertia(fn(Assert $page) => $page
            ->where('clinicalScopeAvailable', false)->where('pendingT0Count', null)->where('healthcareChannel', null)->has('emergencies', 0)->etc());
        $this->actingAs($this->relawan['A'])->postJson('/relawan/sync/emergencies', [
            'id' => (string) Str::uuid(),
            'red_flag_type' => 'MEDICAL_CRISIS',
        ])->assertCreated()->assertJsonPath('emergency.routing_status', 'UNRESOLVED')->assertJsonPath('realtime_delivered', false);
        $this->assertDatabaseCount('emergency_events', 1);
        $this->assertSame([], (new EmergencyCreated(EmergencyEvent::sole()))->broadcastOn());
        $oldId = EmergencyEvent::sole()->id;
        $migration->up();
        $this->posko['A']->update(['primary_facility_id' => $this->facilities['A']->id]);
        $this->assertNull(EmergencyEvent::findOrFail($oldId)->responsible_facility_id);
        $this->assertSame('UNRESOLVED', EmergencyEvent::findOrFail($oldId)->routing_status);
    }

    public function test_validation_previous_history_and_linked_assessment_ids_do_not_cross_scope(): void
    {
        $patient = $this->scopePatient();
        $olderA = $this->scopeAssessment('A', $patient);
        $olderA->update(['completed_at' => now()->subDays(2)]);
        $olderB = $this->scopeAssessment('B', $patient);
        $olderB->update(['completed_at' => now()->subDay()]);
        $current = $this->scopeAssessment('A', $patient);
        $case = $this->scopeEmergency('A', $patient, $olderB);
        $this->actingAs($this->medics['A'])->get("/healthcare/validations/$current->id")->assertInertia(fn(Assert $page) => $page
            ->has('previousAssessments', 1)->where('previousAssessments.0.id', $olderA->id)->etc());
        $this->get("/healthcare/emergencies/$case->id")->assertInertia(fn(Assert $page) => $page
            ->where('emergency.assessment_id', null)->where('emergency.assessment', null)->etc());
        $this->get('/healthcare/patients')->assertInertia(fn(Assert $page) => $page
            ->where('patients.0.emergency_events.0.assessment_id', null)->etc());
    }
}
