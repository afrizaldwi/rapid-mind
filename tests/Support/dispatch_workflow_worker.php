<?php

declare(strict_types=1);

use App\Domain\Healthcare\DispatchWorkflow;
use App\Domain\Healthcare\WorkflowConflict;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

// The worker never accepts a database other than the guarded test connection.
$connection = json_decode(getenv('RAPID_MIND_TEST_CONNECTION'), true, flags: JSON_THROW_ON_ERROR);
TestCase::assertTestingDatabase($connection['database'] ?? null);
if (($connection['driver'] ?? null) !== 'pgsql' || ! empty($connection['url'])) {
    throw new RuntimeException('The concurrency worker requires the explicit PostgreSQL test connection.');
}
config(['database.default' => 'pgsql', 'database.connections.pgsql' => $connection]);
DB::purge('pgsql');
TestCase::assertTestingDatabase(DB::connection()->getDatabaseName());
TestCase::assertTestingDatabase(DB::selectOne('select current_database() as name')->name);
$request = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
DB::selectOne("select set_config('application_name', ?, false)", [$request['worker_name']]);

try {
    $service = $app->make(DispatchWorkflow::class);
    $actor = User::findOrFail($request['actor_id']);
    $result = match ($request['operation']) {
        'assign' => $service->assign($actor, $request['resource_id'], $request['payload']),
        'transition' => $service->transition($actor, $request['resource_id'], $request['payload']),
    };
    echo json_encode(['status' => 200, 'id' => $result->record->id, 'replayed' => $result->replayed], JSON_THROW_ON_ERROR);
} catch (WorkflowConflict $exception) {
    echo json_encode(['status' => 409, 'context' => $exception->context], JSON_THROW_ON_ERROR);
}
