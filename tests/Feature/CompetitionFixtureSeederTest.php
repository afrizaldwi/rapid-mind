<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Healthcare\HealthcareCaseAccess;
use App\Domain\Triage\TriageCalculator;
use App\Events\EmergencyCreated;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\User;
use Database\Seeders\Competition\FixtureCredentials;
use Database\Seeders\Competition\FixtureDefinition;
use Database\Seeders\CompetitionFixtureSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

final class CompetitionFixtureSeederTest extends TestCase
{
    use DatabaseTransactions; // No reset; only additive DDL below, rolled back per test.

    private string $temporaryStorage;

    private string $previousStorage;

    private array $environment = [];

    protected function setUp(): void
    {
        parent::setUp(); // Tests\TestCase checks configured AND actual rapid_mind_testing.
        $this->previousStorage = storage_path();
        $this->temporaryStorage = sys_get_temp_dir().'/competition-fixture-test-'.bin2hex(random_bytes(8));
        mkdir($this->temporaryStorage, 0700);
        app()->useStoragePath($this->temporaryStorage);
        foreach (['RAPID_MIND_COMPETITION_FIXTURE' => 'ALLOW_SCRIPTED_SYNTHETIC_HISTORY_V1', 'COMPETITION_FIXTURE_DATE' => '2026-11-10'] as $key => $value) {
            $this->environment[$key] = [getenv($key), $_ENV[$key] ?? null, $_SERVER[$key] ?? null];
            $this->environment($key, $value);
        }
        config(['app.url' => 'http://localhost:8080', 'broadcasting.default' => 'null', 'queue.default' => 'sync',
            'mail.default' => 'array', 'session.driver' => 'array', 'cache.default' => 'array']);
        // Additive DDL is transactional in PostgreSQL and rolled back with each test.
        // No migration record is changed; no DROP/TRUNCATE/down() is executed.
        if (! Schema::hasColumn('healthcare_facilities', 'latitude')) {
            (require database_path('migrations/2026_11_10_000000_add_competition_facility_coordinates.php'))->up();
        }
        Mail::fake();
        Notification::fake();
        Queue::fake();
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        app()->useStoragePath($this->previousStorage);
        foreach ($this->environment as $key => [$process, $env, $server]) {
            $process === false ? putenv($key) : putenv("$key=$process");
            if ($env === null) {
                unset($_ENV[$key]);
            } else {
                $_ENV[$key] = $env;
            }
            if ($server === null) {
                unset($_SERVER[$key]);
            } else {
                $_SERVER[$key] = $server;
            }
        }
        // Only the uniquely created test directory; never production/private/browser paths.
        File::deleteDirectory($this->temporaryStorage);
        parent::tearDown();
    }

    public function test_counts_relationships_routing_and_coordinates_are_consistent(): void
    {
        $before = $this->counts();
        $this->fixture();
        foreach (['regions' => 1, 'shelters' => 3, 'healthcare_facilities' => 2, 'users' => 6, 'response_units' => 2,
            'patients' => 12, 'assessments' => 12, 'triage_results' => 5, 'emergency_events' => 5,
            'emergency_verifications' => 8, 'clinical_validations' => 2, 'referrals' => 2,
            'emergency_dispatches' => 2, 'emergency_dispatch_history' => 5, 'referral_status_history' => 2,
            'clinical_case_shares' => 3] as $table => $added) {
            $this->assertSame($before[$table] + $added, DB::table($table)->count(), $table);
        }
        $region = Region::where('name', FixtureDefinition::REGION)->firstOrFail();
        foreach (FixtureDefinition::POSKO as $point) {
            $this->assertDatabaseHas('shelters', ['name' => $point['name'], 'region_id' => $region->id]);
        }
        $this->assertTrue((bool) DB::selectOne('select ST_IsValid(geometry) as valid from regions where id=?', [$region->id])->valid);
        foreach ($region->shelters as $posko) {
            $this->assertTrue($posko->is_active);
            $this->assertNotNull($posko->primary_facility_id);
            $this->assertSame(4326, DB::selectOne('select ST_SRID(location) as srid from shelters where id=?', [$posko->id])->srid);
        }
        $this->assertCount(2, $region->shelters->pluck('primary_facility_id')->unique());
        foreach (HealthcareFacility::where('name', 'like', '[SINTETIS KOMPETISI]%')->get() as $facility) {
            $this->assertTrue($facility->is_active);
            $this->assertNotNull($facility->latitude);
            $this->assertNotNull($facility->longitude);
            $this->assertTrue(abs((float) $facility->latitude) <= 90 && abs((float) $facility->longitude) <= 180);
        }
        foreach (range(1, 12) as $n) {
            $patient = Patient::findOrFail(FixtureDefinition::id($n));
            $case = Assessment::findOrFail(FixtureDefinition::id($n, 2));
            $volunteer = $this->user('relawan-'.FixtureDefinition::posko($n));
            $this->assertNull($patient->nik);
            $this->assertSame($volunteer->id, $patient->created_by);
            $this->assertSame($volunteer->id, $case->user_id);
            $this->assertSame($volunteer->shelter_id, $patient->shelter_id);
            $this->assertSame($volunteer->shelter_id, $case->originating_shelter_id);
            $this->assertSame('ROUTED', $case->routing_status);
            $this->assertSame($this->user('healthcare-'.FixtureDefinition::facility(FixtureDefinition::posko($n)))->facility_id, $case->responsible_facility_id);
        }
        foreach (EmergencyEvent::whereIn('id', array_map(fn ($n) => FixtureDefinition::id($n, 3), range(7, 11)))->get() as $event) {
            $this->assertSame($event->assessment->responsible_facility_id, $event->responsible_facility_id);
            $this->assertSame($event->assessment->patient_id, $event->patient_id);
        }
    }

    public function test_scoring_ambiguity_confirmation_and_histories_use_supported_states(): void
    {
        $this->fixture();
        foreach ([1 => 'T3', 2 => 'T1', 3 => 'T1', 5 => 'T2', 12 => 'T1'] as $n => $category) {
            $case = Assessment::findOrFail(FixtureDefinition::id($n, 2));
            $data = FixtureDefinition::payload($n);
            $expected = app(TriageCalculator::class)->calculate($data['srq_answers'], $data['risk_indicators'], $data['function_domains']);
            $this->assertSame($expected->totalScore, $case->triageResult->total_score);
            $this->assertSame($category, $case->triageResult->system_recommendation->value);
            $this->assertFalse($case->srqResponses->firstWhere('question_number', 17)->answer);
        }
        foreach ([4, 6, 7, 8, 9, 10, 11] as $n) {
            $case = Assessment::findOrFail(FixtureDefinition::id($n, 2));
            $this->assertSame('IN_PROGRESS', $case->status->value);
            $this->assertNull($case->triageResult);
        }
        $ambiguous = Assessment::findOrFail(FixtureDefinition::id(4, 2))->srqResponses;
        $this->assertSame('UNCLEAR', $ambiguous->firstWhere('question_number', 3)->responseValue());
        $this->assertSame('UNANSWERED', $ambiguous->firstWhere('question_number', 17)->responseValue());
        $this->assertSame(['NOT_SPEAKING', 'OTHER'], Assessment::findOrFail(FixtureDefinition::id(5, 2))->non_verbal_reasons);
        foreach ([7 => 'PENDING', 8 => 'CONFIRMED', 9 => 'CONFIRMED', 10 => 'DOWNGRADED', 11 => 'CONFIRMED'] as $n => $status) {
            $case = EmergencyEvent::findOrFail(FixtureDefinition::id($n, 3));
            $this->assertSame($status, $case->status->value);
            $this->assertSame($n === 7 ? 0 : 2, $case->verifications()->count());
            if ($n !== 7) {
                $this->assertSame($n === 10 ? 'T3' : 'T0_CONFIRMED', $case->verifications()->whereNotNull('clinical_result')->firstOrFail()->clinical_result->value);
                foreach (['EMERGENCY_ACKNOWLEDGED', 'EMERGENCY_VERIFIED', 'EMERGENCY_CLASSIFIED'] as $action) {
                    $this->assertTrue(AuditLog::where('action', $action)->where('entity_id', $case->id)->exists());
                }
            }
        }
        foreach (ClinicalValidation::all() as $validation) {
            $this->assertTrue($validation->created_at->greaterThanOrEqualTo($validation->assessment->completed_at));
        }
        $marker = AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->firstOrFail();
        $this->assertTrue($marker->created_at->greaterThanOrEqualTo(EmergencyEvent::findOrFail(FixtureDefinition::id(11, 3))->dispatch->history->last()->created_at));
        $this->assertSame(['ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED'], EmergencyEvent::findOrFail(FixtureDefinition::id(11, 3))->dispatch->history->pluck('status')->map(fn ($status) => $status->value)->all());
        $this->assertNull(EmergencyEvent::findOrFail(FixtureDefinition::id(10, 3))->dispatch);
    }

    public function test_facility_isolation_read_only_shares_and_admin_boundary(): void
    {
        $this->fixture();
        $a = $this->user('healthcare-a');
        $b = $this->user('healthcare-b');
        $aCase = FixtureDefinition::id(2, 2);
        $bCase = FixtureDefinition::id(11, 2);
        $this->assertFalse(HealthcareCaseAccess::cases(Assessment::query(), $b)->whereKey($aCase)->exists());
        $this->assertFalse(HealthcareCaseAccess::cases(Assessment::query(), $a)->whereKey($bCase)->exists());
        $this->assertTrue(HealthcareCaseAccess::cases(Assessment::query(), $a)->whereKey(FixtureDefinition::id(12, 2))->exists());
        $this->assertFalse(HealthcareCaseAccess::cases(Assessment::query(), $a, true)->whereKey(FixtureDefinition::id(12, 2))->exists());
        $this->actingAs($a)->get('/healthcare/patients/'.FixtureDefinition::id(11))->assertNotFound();
        $this->actingAs($b)->get('/healthcare/validations/'.$aCase)->assertNotFound();
        $this->actingAs($a)->postJson('/healthcare/emergencies/'.FixtureDefinition::id(9, 3).'/acknowledge')->assertNotFound();
        $this->actingAs($this->user('admin'))->getJson('/healthcare/emergencies/'.FixtureDefinition::id(8, 3))->assertForbidden();
    }

    public function test_rerun_preserves_manual_progress_credentials_and_all_record_bytes(): void
    {
        $this->fixture();
        $case = Assessment::findOrFail(FixtureDefinition::id(4, 2));
        $case->update(['mode' => 'NON_VERBAL', 'non_verbal_reasons' => ['UNKNOWN']]);
        $before = $this->fingerprints();
        $file = storage_path('app/private/competition-fixture/credentials.json');
        $hash = hash_file('sha256', $file);
        $this->fixture();
        $this->assertSame($before, $this->fingerprints());
        $this->assertSame($hash, hash_file('sha256', $file));
        $this->assertSame(0600, fileperms($file) & 0777);
        $this->assertSame(0700, fileperms(dirname($file)) & 0777);
        foreach (FixtureCredentials::load(false) as $alias => $account) {
            $this->assertTrue(Hash::check($account['password'], $this->user($alias)->password));
            $this->assertNull($this->user($alias)->phone_number);
        }
    }

    public function test_transports_are_inert_and_no_notification_or_job_leaves_the_fixture(): void
    {
        $notifications = 0;
        Event::listen(EmergencyCreated::class, function () use (&$notifications) {
            $notifications++;
        });
        $this->fixture();
        $this->assertSame(0, $notifications);
        Mail::assertNothingSent();
        Notification::assertNothingSent();
        Queue::assertNothingPushed();
        Http::assertNothingSent();
        $this->assertSame(0, DB::table('jobs')->count());
    }

    public function test_guards_reject_missing_optin_wrong_environment_target_url_and_live_transports_before_writes(): void
    {
        $before = $this->fingerprints();
        foreach (['optin', 'production', 'database', 'url', 'broadcast', 'mail', 'date'] as $scenario) {
            $original = config()->all();
            if ($scenario === 'optin') {
                $this->environment('RAPID_MIND_COMPETITION_FIXTURE', '');
            }
            if ($scenario === 'production') {
                app()->detectEnvironment(fn () => 'production');
            }
            if ($scenario === 'database') {
                config(['database.connections.pgsql.database' => 'rapid_mind']);
            }
            if ($scenario === 'url') {
                config(['app.url' => 'https://example.invalid']);
            }
            if ($scenario === 'broadcast') {
                config(['broadcasting.default' => 'reverb']);
            }
            if ($scenario === 'date') {
                $this->environment('COMPETITION_FIXTURE_DATE', '2026-02-30');
            }
            if ($scenario === 'mail') {
                config(['mail.default' => 'smtp']);
            }
            try {
                $this->fixture();
                $this->fail('Unsafe fixture context accepted.');
            } catch (RuntimeException $e) {
                $this->assertMatchesRegularExpression('/blocked|valid COMPETITION_FIXTURE_DATE/', $e->getMessage());
            } finally {
                foreach ($original as $key => $value) {
                    config([$key => $value]);
                }
                app()->detectEnvironment(fn () => 'testing');
                $this->environment('RAPID_MIND_COMPETITION_FIXTURE', 'ALLOW_SCRIPTED_SYNTHETIC_HISTORY_V1');
                $this->environment('COMPETITION_FIXTURE_DATE', '2026-11-10');
            }
        }
        $this->assertSame($before, $this->fingerprints());
        $this->assertFileDoesNotExist(storage_path('app/private/competition-fixture/credentials.json'));
    }

    public function test_collision_and_partial_failure_never_rewrite_existing_data(): void
    {
        $unrelated = Region::create(['name' => FixtureDefinition::REGION]);
        $before = $this->fingerprints();
        try {
            $this->fixture();
            $this->fail('Collision accepted');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('collision', $e->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
        $unrelated->delete();
        $before = $this->fingerprints();
        Event::listen('eloquent.creating: '.ClinicalValidation::class, fn () => throw new RuntimeException('Injected synthetic failure'));
        try {
            $this->fixture();
            $this->fail('Injected failure ignored');
        } catch (RuntimeException $e) {
            $this->assertSame('Injected synthetic failure', $e->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
        $this->assertFalse(AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->exists());
    }

    public function test_missing_private_credentials_and_deleted_roots_fail_without_rotation_or_repair(): void
    {
        $this->fixture();
        $path = storage_path('app/private/competition-fixture/credentials.json');
        $bytes = file_get_contents($path);
        unlink($path);
        $before = $this->fingerprints();
        try {
            $this->fixture();
            $this->fail('Missing credentials regenerated');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('missing', $e->getMessage());
        }
        $this->assertFileDoesNotExist($path);
        $this->assertSame($before, $this->fingerprints());
        file_put_contents($path, $bytes);
        chmod($path, 0600);
        // Individual test-only deletion, not a reset; the outer transaction rolls it back.
        EmergencyEvent::findOrFail(FixtureDefinition::id(7, 3))->delete();
        $before = $this->fingerprints();
        try {
            $this->fixture();
            $this->fail('Partial fixture silently repaired');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('missing', $e->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
    }

    public function test_unsafe_credential_permissions_are_refused_before_record_creation(): void
    {
        FixtureCredentials::load();
        $path = storage_path('app/private/competition-fixture/credentials.json');
        chmod($path, 0644);
        $before = $this->fingerprints();
        try {
            $this->fixture();
            $this->fail('Publicly readable credentials accepted');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('permissions unsafe', $e->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
    }

    public function test_database_error_output_never_contains_sensitive_bindings(): void
    {
        $before = $this->fingerprints();
        Event::listen('eloquent.creating: '.User::class, fn () => throw new QueryException(
            'pgsql', 'insert into users (password) values (?)', ['SENSITIVE_TEST_SENTINEL_NOT_A_CREDENTIAL'], new \PDOException('Injected database failure'),
        ));
        try {
            $this->fixture();
            $this->fail('Database failure ignored');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('database operation failed', $e->getMessage());
            $this->assertStringNotContainsString('SENSITIVE_TEST_SENTINEL', (string) $e);
            $this->assertNull($e->getPrevious());
        }
        $this->assertSame($before, $this->fingerprints());
    }

    public function test_unrelated_patient_blocks_first_installation_without_credentials(): void
    {
        Patient::forceCreate([
            'id' => 'e0f10000-2026-4000-8000-000000000001',
            'name' => '[SINTETIS] Unrelated test patient', 'age' => 30, 'gender' => 'Laki-laki',
            'created_by' => User::factory()->create(['email' => 'patient-creator@example.invalid'])->id,
        ]);
        $this->assertFirstInstallationRefused('empty application-data tables');
    }

    public function test_unrelated_user_blocks_first_installation_without_credentials(): void
    {
        User::factory()->create(['name' => '[SINTETIS] Unrelated test user', 'email' => 'unrelated@example.invalid']);
        $this->assertFirstInstallationRefused('empty application-data tables');
    }

    public function test_operational_cache_state_blocks_first_installation(): void
    {
        DB::table('cache')->insert(['key' => 'synthetic-test', 'value' => 'synthetic', 'expiration' => 1]);
        $this->assertFirstInstallationRefused('empty application-data tables');
    }

    public function test_unexpected_table_blocks_first_installation(): void
    {
        DB::statement('CREATE TABLE public.competition_unexpected_test (id integer)');
        $this->assertFirstInstallationRefused('unexpected application table or dependency');
    }

    public function test_unexpected_view_dependency_blocks_first_installation(): void
    {
        DB::statement('CREATE VIEW public.competition_unexpected_view AS SELECT id FROM public.patients');
        $this->assertFirstInstallationRefused('unexpected application table or dependency');
    }

    public function test_unexpected_cross_schema_dependency_blocks_first_installation(): void
    {
        DB::statement('CREATE SCHEMA competition_unexpected_schema');
        DB::statement('CREATE TABLE competition_unexpected_schema.records (user_id bigint REFERENCES public.users(id))');
        $this->assertFirstInstallationRefused('unexpected application table or dependency');
    }

    private function assertFirstInstallationRefused(string $message): void
    {
        $before = $this->fingerprints();
        try {
            $this->fixture();
            $this->fail('Unsafe first installation accepted.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString($message, $e->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
        $this->assertSame(0, AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->count());
        $this->assertSame(0, User::whereIn('email', array_column(FixtureDefinition::IDENTITIES, 1))->count());
        $this->assertFileDoesNotExist(storage_path('app/private/competition-fixture/credentials.json'));
    }

    public function test_geography_update_preserves_clinical_data_accounts_and_reruns(): void
    {
        $this->fixture();
        $marker = AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->sole()->new_values;
        DB::table('regions')->where('id', $marker['region_id'])->update(['name' => FixtureDefinition::LEGACY_REGION]);
        foreach ($marker['shelter_ids'] as $n => $id) {
            DB::table('shelters')->where('id', $id)->update(['name' => '[SINTETIS KOMPETISI] Posko '.$n]);
        }
        $before = $this->fingerprints();
        app(\Database\Seeders\CompetitionKarhutlaGeographySeeder::class)->run();
        $after = $this->fingerprints();
        foreach ($before as $table => $hash) {
            if (! in_array($table, ['regions', 'shelters', 'healthcare_facilities', 'emergency_events', 'audit_logs'], true)) {
                $this->assertSame($hash, $after[$table], $table.' must remain byte-identical');
            }
        }
        foreach (FixtureDefinition::POSKO as $n => $point) {
            $row = DB::selectOne('SELECT name, ST_X(location) AS lon, ST_Y(location) AS lat FROM shelters WHERE id=?', [$marker['shelter_ids'][$n]]);
            $this->assertSame($point['name'], $row->name);
            $this->assertEquals($point['longitude'], $row->lon);
            $this->assertEquals($point['latitude'], $row->lat);
        }
        $this->assertCount(6, \Database\Seeders\Competition\FixtureAccountRoster::read());
        $this->assertSame(1, AuditLog::where('action', 'COMPETITION_GEOGRAPHY_UPDATED')->count());
        app(\Database\Seeders\CompetitionKarhutlaGeographySeeder::class)->run();
        $this->assertSame($after, $this->fingerprints());
    }

    public function test_geography_update_rolls_back_on_unexpected_case_assignment(): void
    {
        $this->fixture();
        DB::table('emergency_events')->where('id', FixtureDefinition::id(7, 3))->update(['shelter_id' => null]);
        $before = $this->fingerprints();
        try {
            app(\Database\Seeders\CompetitionKarhutlaGeographySeeder::class)->run();
            $this->fail('Unexpected case ownership must reject the update.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('ownership inconsistent', $error->getMessage());
        }
        $this->assertSame($before, $this->fingerprints());
    }

    private function fixture(): void
    {
        app(CompetitionFixtureSeeder::class)->run();
    }

    private function user(string $alias): User
    {
        return User::where('email', FixtureDefinition::email($alias))->firstOrFail();
    }

    private function environment(string $key, string $value): void
    {
        putenv("$key=$value");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    private function counts(): array
    {
        return collect(Schema::getTableListing(schema: 'public', schemaQualified: false))->mapWithKeys(fn ($table) => [$table => DB::table($table)->count()])->all();
    }

    private function fingerprints(): array
    {
        return collect(Schema::getTableListing(schema: 'public', schemaQualified: false))->mapWithKeys(function ($table) {
            $quoted = DB::connection()->getQueryGrammar()->wrapTable($table);

            return [$table => DB::selectOne("select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from $quoted t")->hash];
        })->all();
    }
}
