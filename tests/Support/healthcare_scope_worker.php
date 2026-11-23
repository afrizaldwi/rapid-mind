<?php

use App\Http\Controllers\Healthcare\HealthcareController;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tests\TestCase;

require dirname(__DIR__, 2) . '/vendor/autoload.php';
$app = require dirname(__DIR__, 2) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$connection = json_decode(getenv('RAPID_MIND_TEST_CONNECTION'), true, flags: JSON_THROW_ON_ERROR);
TestCase::assertTestingDatabase($connection['database'] ?? null);
if (($connection['driver'] ?? null) !== 'pgsql' || !empty($connection['url'])) throw new RuntimeException('Unsafe worker connection');
config([
    'database.default' => 'pgsql',
    'database.connections.pgsql' => $connection,
    'broadcasting.default' => 'null',
    'session.driver' => 'array',
    'cache.default' => 'array',
    'queue.default' => 'sync'
]);
DB::purge('pgsql');
TestCase::assertTestingDatabase(DB::selectOne('select current_database() as name')->name);
[$workerName, $actorId, $caseId] = array_slice($argv, 1);
DB::selectOne("select set_config('application_name', ?, false)", [$workerName]);
Auth::guard('web')->setUser(User::findOrFail($actorId));
$request = Request::create('/healthcare/emergencies/' . $caseId . '/acknowledge', 'POST', server: ['HTTP_ACCEPT' => 'application/json']);
try {
    $response = app(HealthcareController::class)->acknowledge($request, $caseId);
    echo json_encode(['status' => $response->getStatusCode()], JSON_THROW_ON_ERROR);
} catch (HttpExceptionInterface $exception) {
    echo json_encode(['status' => $exception->getStatusCode()], JSON_THROW_ON_ERROR);
}
