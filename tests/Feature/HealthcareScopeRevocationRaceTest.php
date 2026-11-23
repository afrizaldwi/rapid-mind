<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\EmergencyEvent;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

final class HealthcareScopeRevocationRaceTest extends TestCase
{
    use DatabaseMigrations, \Tests\Concerns\ClinicalScopeFixtures;

    public function test_facility_change_while_clinical_request_waits_for_lock_revokes_mutation_authority(): void
    {
        $this->createScopeFixtures();
        $case = $this->scopeEmergency('A');
        $name = 'scope-race-' . Str::uuid();
        $worker = new Process([
            PHP_BINARY,
            base_path('tests/Support/healthcare_scope_worker.php'),
            $name,
            (string) $this->medics['A']->id,
            $case->id
        ], base_path(), [
            'APP_ENV' => 'testing',
            'DB_DATABASE' => 'rapid_mind_testing',
            'DB_URL' => '',
            'RAPID_MIND_TEST_CONNECTION' => json_encode(config('database.connections.pgsql'), JSON_THROW_ON_ERROR),
        ]);
        $worker->setTimeout(20);
        DB::beginTransaction();
        try {
            EmergencyEvent::whereKey($case->id)->lockForUpdate()->firstOrFail();
            $worker->start();
            $waiting = false;
            $deadline = microtime(true) + 10;
            do {
                DB::selectOne('select pg_stat_clear_snapshot()');
                $waiting = (int) DB::selectOne("select count(*) as n from pg_stat_activity where application_name = ? and wait_event_type = 'Lock'", [$name])->n === 1;
                if ($waiting || !$worker->isRunning()) break;
                usleep(20_000);
            } while (microtime(true) < $deadline);
            $this->assertTrue($waiting, 'Independent request must first wait on the emergency row lock.');
            $this->medics['A']->update(['facility_id' => $this->facilities['B']->id]);
            DB::commit();
            $this->assertSame(0, $worker->wait(), $worker->getErrorOutput());
            $this->assertSame(['status' => 404], json_decode($worker->getOutput(), true, flags: JSON_THROW_ON_ERROR));
            $this->assertSame('PENDING', $case->fresh()->status->value);
            $this->assertSame(0, AuditLog::where('action', 'EMERGENCY_ACKNOWLEDGED')->count());
        } finally {
            if (DB::transactionLevel() > 0) DB::rollBack();
            if ($worker->isRunning()) $worker->stop();
        }
    }
}
