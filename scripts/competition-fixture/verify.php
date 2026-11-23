<?php

declare(strict_types=1);
use App\Domain\Triage\TriageCalculator;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use Database\Seeders\Competition\FixtureAccountRoster;
use Database\Seeders\Competition\FixtureCredentials;
use Database\Seeders\Competition\FixtureDefinition;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

// Initial post-reset verification only; no fixture execution or clinical writes.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = DB::connection();
$expected = match (app()->environment()) {
    'local' => 'rapid_mind', 'testing' => 'rapid_mind_testing', default => null
};
if (! $expected || config('database.default') !== 'pgsql' || $db->getDatabaseName() !== $expected) {
    throw new RuntimeException('Verification target refused.');
}
$db->beginTransaction();
try {
    $db->statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    if ($db->selectOne('select current_database() as name')->name !== $expected) {
        throw new RuntimeException('Actual database mismatch.');
    }
    $require = static function (bool $valid): void {
        if (! $valid) {
            throw new RuntimeException('Competition initial-state verification failed; stop, do not repair/reset automatically.');
        }
    };
    $counts = [];
    foreach (['regions' => 1, 'shelters' => 3, 'healthcare_facilities' => 2, 'users' => 6, 'response_units' => 2,
        'patients' => 12, 'assessments' => 12, 'triage_results' => 5, 'emergency_events' => 5,
        'clinical_validations' => 2, 'emergency_verifications' => 8, 'referrals' => 2,
        'emergency_dispatches' => 2, 'emergency_dispatch_history' => 5, 'clinical_case_shares' => 3,
        'referral_status_history' => 2] as $table => $count) {
        $counts[$table] = $db->table($table)->count();
        $require($counts[$table] === $count);
    }
    $require($db->table('patients')->whereNotNull('nik')->count() === 0);
    $require($db->table('users')->whereNotNull('phone_number')->count() === 0);
    $require($db->table('users')->where('is_active', false)->count() === 0);
    $require($db->table('healthcare_facilities')->whereNull('latitude')->orWhereNull('longitude')->count() === 0);
    $require($db->table('shelters')->whereNull('primary_facility_id')->orWhereNull('location')->count() === 0);
    $require((int) $db->selectOne('SELECT count(*) AS n FROM assessments a JOIN users u ON u.id=a.user_id JOIN shelters s ON s.id=u.shelter_id WHERE a.responsible_facility_id IS DISTINCT FROM s.primary_facility_id OR a.originating_shelter_id IS DISTINCT FROM s.id')->n === 0);
    $require($db->table('audit_logs')->where('action', 'COMPETITION_FIXTURE_COMPLETED')->where('entity_id', 'competition-v1')->count() === 1);
    foreach (range(1, 12) as $n) {
        $case = Assessment::findOrFail(FixtureDefinition::id($n, 2));
        $require($case->patient_id === FixtureDefinition::id($n));
        $input = FixtureDefinition::payload($n);
        $require($case->status->value === $input['status']);
        if ($case->status->value === 'COMPLETED') {
            $result = app(TriageCalculator::class)->calculate($input['srq_answers'], $input['risk_indicators'], $input['function_domains']);
            $require($case->triageResult->total_score === $result->totalScore && $case->triageResult->system_recommendation === $result->recommendation);
            $require($case->srqResponses->firstWhere('question_number', 17)->answer === false);
        } else {
            $require($case->triageResult === null);
        }
    }
    foreach ([7 => 'PENDING', 8 => 'CONFIRMED', 9 => 'CONFIRMED', 10 => 'DOWNGRADED', 11 => 'CONFIRMED'] as $n => $status) {
        $case = EmergencyEvent::findOrFail(FixtureDefinition::id($n, 3));
        $require($case->status->value === $status && $case->routing_status === 'ROUTED');
    }
    $credentials = FixtureCredentials::load(false);
    foreach (FixtureAccountRoster::read() as $alias => $user) {
        $require(Hash::check($credentials[$alias]['password'], $user->password));
    }
    echo json_encode(['database' => $expected, 'initial_fixture_verified' => true, 'account_credentials_verified' => true, 'counts' => $counts,
        'browser_encryption_or_human_acceptance_claimed' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), "\n";
} finally {
    $db->rollBack();
}
