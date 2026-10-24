<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Healthcare\DispatchWorkflow;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyDispatchHistory;
use App\Models\EmergencyEvent;
use App\Models\ResponseUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

final class HealthcareDispatchConcurrencyTest extends TestCase
{
    // Fixtures must be committed so independent worker connections can see them.
    // All migrations still run only after the existing TestCase database guard.
    use DatabaseMigrations;

    /** @return array{array, array} */
    private function contend(EmergencyEvent $emergency, string $operation, string $resourceId, array $payloads): array
    {
        $actor = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $connection = config('database.connections.pgsql');
        self::assertTestingDatabase($connection['database']);
        self::assertTestingDatabase(DB::selectOne('select current_database() as name')->name);
        $names = ['dispatch-test-'.Str::uuid(), 'dispatch-test-'.Str::uuid()];
        $workers = [];
        DB::beginTransaction();
        try {
            EmergencyEvent::whereKey($emergency->id)->lockForUpdate()->firstOrFail();
            foreach ($payloads as $index => $payload) {
                $worker = new Process([
                    PHP_BINARY, base_path('tests/Support/dispatch_workflow_worker.php'),
                    json_encode([
                        'worker_name' => $names[$index], 'actor_id' => $actor->id,
                        'operation' => $operation, 'resource_id' => $resourceId, 'payload' => $payload,
                    ], JSON_THROW_ON_ERROR),
                ], base_path(), [
                    'APP_ENV' => 'testing', 'DB_URL' => '', 'DB_DATABASE' => 'rapid_mind_testing',
                    'RAPID_MIND_TEST_CONNECTION' => json_encode($connection, JSON_THROW_ON_ERROR),
                ]);
                $worker->setTimeout(20);
                $worker->start();
                $workers[] = $worker;
            }

            $waiting = 0;
            $deadline = microtime(true) + 10;
            while (microtime(true) < $deadline) {
                DB::selectOne('select pg_stat_clear_snapshot()');
                $waiting = (int) DB::selectOne(
                    "select count(*) as count from pg_stat_activity where application_name in (?, ?) and wait_event_type = 'Lock'",
                    $names,
                )->count;
                if ($waiting === 2 || ! $workers[0]->isRunning() || ! $workers[1]->isRunning()) {
                    break;
                }
                usleep(20000);
            }
            DB::commit();
            $outputs = [];
            foreach ($workers as $worker) {
                $this->assertSame(0, $worker->wait(), $worker->getErrorOutput().$worker->getOutput());
                $outputs[] = json_decode($worker->getOutput(), true, flags: JSON_THROW_ON_ERROR);
            }
            $this->assertSame(2, $waiting, 'Both independent PostgreSQL sessions must contend on the emergency lock.');

            return $outputs;
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
        }
    }

    public function test_concurrent_identical_assignments_create_one_dispatch_history_and_audit(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $payload = ['response_unit_id' => ResponseUnit::factory()->create()->id];
        $outcomes = $this->contend($emergency, 'assign', $emergency->id, [$payload, $payload]);
        $this->assertSame([200, 200], array_column($outcomes, 'status'));
        $replayed = array_column($outcomes, 'replayed');
        sort($replayed);
        $this->assertSame([false, true], $replayed);
        $this->assertSame($outcomes[0]['id'], $outcomes[1]['id']);
        $this->assertSame(1, EmergencyDispatch::count());
        $this->assertSame(1, EmergencyDispatchHistory::count());
        $this->assertSame(1, AuditLog::where('action', 'DISPATCH_ASSIGNED')->count());
    }

    public function test_competing_assignments_return_one_success_and_one_conflict_without_reassignment(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $payloads = [
            ['response_unit_id' => ResponseUnit::factory()->create()->id],
            ['response_unit_id' => ResponseUnit::factory()->create()->id],
        ];
        $outcomes = $this->contend($emergency, 'assign', $emergency->id, $payloads);
        $statuses = array_column($outcomes, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses);
        $winner = $outcomes[0]['status'] === 200 ? 0 : 1;
        $this->assertSame($payloads[$winner]['response_unit_id'], EmergencyDispatch::sole()->response_unit_id);
        $this->assertSame(1, EmergencyDispatchHistory::count());
        $this->assertSame(1, AuditLog::where('action', 'DISPATCH_ASSIGNED')->count());
    }

    public function test_concurrent_identical_status_requests_append_one_transition(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create();
        $actor = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $dispatch = app(DispatchWorkflow::class)->assign($actor, $emergency->id, ['response_unit_id' => ResponseUnit::factory()->create()->id])->record;
        $payload = ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE'];
        $outcomes = $this->contend($emergency, 'transition', $dispatch->id, [$payload, $payload]);
        $this->assertSame([200, 200], array_column($outcomes, 'status'));
        $replayed = array_column($outcomes, 'replayed');
        sort($replayed);
        $this->assertSame([false, true], $replayed);
        $this->assertSame('EN_ROUTE', $dispatch->fresh()->status->value);
        $this->assertSame(1, EmergencyDispatchHistory::where('event_type', 'STATUS_CHANGED')->count());
        $this->assertSame(1, AuditLog::where('action', 'DISPATCH_STATUS_CHANGED')->count());
    }

    public function test_competing_forward_branches_apply_only_the_first_status_change(): void
    {
        $dispatch = EmergencyDispatch::factory()->create(['status' => 'ON_SITE']);
        $outcomes = $this->contend($dispatch->emergencyEvent, 'transition', $dispatch->id, [
            ['expected_status' => 'ON_SITE', 'status' => 'TRANSPORT'],
            ['expected_status' => 'ON_SITE', 'status' => 'COMPLETED'],
        ]);
        $statuses = array_column($outcomes, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses);
        $winnerStatus = $outcomes[0]['status'] === 200 ? 'TRANSPORT' : 'COMPLETED';
        $this->assertSame($winnerStatus, $dispatch->fresh()->status->value);
        $this->assertSame(1, EmergencyDispatchHistory::count());
        $this->assertSame(1, AuditLog::where('action', 'DISPATCH_STATUS_CHANGED')->count());
    }
}
