<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Healthcare\DispatchWorkflow;
use App\Enums\EmergencyDispatchStatus;
use App\Models\AuditLog;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\DispatchDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DispatchDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_fixtures_are_repeatable_independent_and_do_not_overwrite_progression(): void
    {
        $this->seed(DemoSeeder::class);
        $actor = User::where('email', 'nakes@rapidmind.id')->firstOrFail();
        foreach (DispatchDemoSeeder::SCENARIOS as $index => [$name, $status, $hasReferral, $referralDone, $laterLink]) {
            $referral = Referral::find(DispatchDemoSeeder::id($index, 3));
            $dispatch = EmergencyDispatch::where('emergency_event_id', DispatchDemoSeeder::id($index))->first();
            $this->assertSame($hasReferral, $referral !== null);
            $this->assertSame($status, $dispatch?->status->value);
            if ($referral) {
                $this->assertSame($referralDone ? 'COMPLETED' : 'ACTIVE', $referral->status->value);
                $this->assertNotEmpty($referral->statusHistory);
                $this->assertSame($index === 10, $referral->emergency_event_id === null);
                $this->assertSame($index === 10, $referral->clinical_validation_id !== null);
            }
            if ($dispatch) {
                $current = null;
                $previousTime = null;
                foreach ($dispatch->history as $history) {
                    $this->assertSame($current, $history->previous_status?->value);
                    if ($current !== null && $history->event_type->value === 'STATUS_CHANGED') {
                        $this->assertTrue(EmergencyDispatchStatus::from($current)->canTransitionTo($history->status));
                    }
                    $this->assertTrue($previousTime === null || $history->created_at->greaterThanOrEqualTo($previousTime));
                    $previousTime = $history->created_at;
                    $current = $history->status->value;
                }
                $this->assertSame($status, $current);
                $this->assertSame($dispatch->history->count(), AuditLog::where('entity_id', $dispatch->id)->count());
                $this->assertSame($laterLink, $dispatch->history->contains(fn($row) => $row->event_type->value === 'REFERRAL_LINKED'));
                $this->assertSame($hasReferral ? $referral->id : null, $dispatch->referral_id);
            }
        }
        $this->assertNull(EmergencyEvent::findOrFail(DispatchDemoSeeder::id(9))->patient_id);
        $dispatch = EmergencyDispatch::where('emergency_event_id', DispatchDemoSeeder::id(2))->firstOrFail();
        app(DispatchWorkflow::class)->transition($actor, $dispatch->id, ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE']);
        $tables = ['emergency_events', 'referrals', 'emergency_dispatches', 'emergency_dispatch_history', 'referral_status_history', 'audit_logs', 'users', 'patients', 'response_units'];
        $before = [];
        foreach ($tables as $table) {
            $before[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }
        $this->seed(DispatchDemoSeeder::class);
        foreach ($tables as $table) {
            $this->assertSame($before[$table], DB::table($table)->orderBy('id')->get()->toJson(), $table);
        }
        $this->assertSame(1, ResponseUnit::where('code', 'SYNTHETIC-2DE-01')->count());
    }
}
