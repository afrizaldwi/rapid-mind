<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Demo\CompetitionLoginAccounts;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Database\Seeders\Competition\FixtureAccountRoster;
use Database\Seeders\Competition\FixtureAccountUpdate;
use Database\Seeders\Competition\FixtureCredentials;
use Database\Seeders\Competition\FixtureDefinition as F;
use Database\Seeders\CompetitionFixtureSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

final class CompetitionDemoAccountsTest extends TestCase
{
    use DatabaseTransactions;

    private string $previousStorage;

    private string $temporaryStorage;

    private array $previousEnvironment = [];

    private string $passwordFile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousStorage = storage_path();
        $this->temporaryStorage = sys_get_temp_dir().'/competition-accounts-test-'.bin2hex(random_bytes(8));
        mkdir($this->temporaryStorage, 0700);
        app()->useStoragePath($this->temporaryStorage);
        foreach (['RAPID_MIND_COMPETITION_FIXTURE' => 'ALLOW_SCRIPTED_SYNTHETIC_HISTORY_V1',
            'COMPETITION_FIXTURE_DATE' => '2026-11-09',
            'COMPETITION_ACCOUNT_UPDATE' => 'ALLOW_LOCAL_IDENTITY_UPDATE_V1',
            'COMPETITION_FIXTURE_PASSWORD_FILE' => ''] as $key => $value) {
            $this->previousEnvironment[$key] = [getenv($key), $_ENV[$key] ?? null, $_SERVER[$key] ?? null];
            putenv($key.'='.$value);
            $_ENV[$key] = $_SERVER[$key] = $value;
        }
        config(['app.url' => 'http://localhost:8080', 'broadcasting.default' => 'null', 'queue.default' => 'sync',
            'mail.default' => 'array', 'session.driver' => 'array', 'cache.default' => 'array']);
        if (! Schema::hasColumn('healthcare_facilities', 'latitude')) {
            (require database_path('migrations/2026_11_10_000000_add_competition_facility_coordinates.php'))->up();
        }
        Http::preventStrayRequests();
        $this->passwordFile = $this->temporaryStorage.'/account-input';
        // Random private test input, never the actual local demonstration credential.
        file_put_contents($this->passwordFile, bin2hex(random_bytes(12)));
        chmod($this->passwordFile, 0600);
    }

    protected function tearDown(): void
    {
        app()->detectEnvironment(fn () => 'testing');
        app()->useStoragePath($this->previousStorage);
        foreach ($this->previousEnvironment as $key => [$process, $env, $server]) {
            $process === false ? putenv($key) : putenv($key.'='.$process);
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
        File::deleteDirectory($this->temporaryStorage);
        parent::tearDown();
    }

    public function test_update_preserves_ids_relationships_and_clinical_bytes_and_is_idempotent(): void
    {
        $old = $this->legacyFixture();
        $before = $this->clinicalFingerprints();
        $this->assertSame('updated', $this->update());
        $password = file_get_contents($this->passwordFile);
        foreach (FixtureAccountRoster::read() as $alias => $user) {
            $this->assertSame($old[$alias]->id, $user->id);
            $this->assertSame($old[$alias]->role, $user->role);
            $this->assertSame($old[$alias]->shelter_id, $user->shelter_id);
            $this->assertSame($old[$alias]->facility_id, $user->facility_id);
            $this->assertSame($old[$alias]->token_version + 1, $user->token_version);
            $this->assertSame(F::name($alias), $user->name);
            $this->assertSame(F::email($alias), $user->email);
            $this->assertTrue(Hash::check($password, $user->password));
            $this->assertNotSame($password, $user->password);
            $this->assertTrue(Hash::check(FixtureCredentials::load(false)[$alias]['password'], $user->password));
        }
        $this->assertSame($before, $this->clinicalFingerprints());
        $users = User::orderBy('id')->get()->toArray();
        $file = hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json'));
        $this->assertSame('unchanged', $this->update());
        $this->assertSame($users, User::orderBy('id')->get()->toArray());
        $this->assertSame($file, hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json')));
        app(CompetitionFixtureSeeder::class)->run();
        $this->assertSame($before, $this->clinicalFingerprints());
    }

    public function test_listing_uses_five_marker_owned_database_accounts_and_never_credentials(): void
    {
        app(CompetitionFixtureSeeder::class)->run();
        $users = FixtureAccountRoster::read();
        $users['admin']->update(['name' => '[SINTETIS] Display from database']);
        User::factory()->create(['email' => 'unrelated@example.invalid']);
        $response = $this->get('http://localhost:8080/login')->assertOk();
        $list = $response->viewData('page')['props']['demoAccounts'];
        $this->assertCount(5, $list);
        $this->assertSame(['admin', 'relawan-1', 'relawan-3', 'healthcare-a', 'healthcare-b'], array_column($list, 'id'));
        $this->assertSame(['ADMIN' => 1, 'RELAWAN' => 2, 'HEALTHCARE' => 2], array_count_values(array_column($list, 'role')));
        $this->assertSame('[SINTETIS] Display from database', $list[0]['name']);
        $facilities = [];
        foreach ($list as $account) {
            $u = $users[$account['id']]->fresh();
            $this->assertSame($u->email, $account['email']);
            $this->assertSame(['id', 'name', 'email', 'role', 'organization'], array_keys($account));
            if ($u->shelter) {
                $facilities[] = $u->shelter->primary_facility_id;
            }
        }
        $this->assertCount(2, array_unique($facilities));
        foreach (FixtureCredentials::load(false) as $credential) {
            $this->assertStringNotContainsString($credential['password'], $response->getContent());
        }
        $this->assertStringNotContainsString('credentials.json', $response->getContent());
    }

    public function test_production_other_origin_and_missing_or_invalid_fixture_have_no_shortcuts(): void
    {
        $this->get('http://localhost:8080/login')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/Login', false)->missing('demoAccounts'));
        app(CompetitionFixtureSeeder::class)->run();
        foreach (['http://127.0.0.1:8080', 'http://localhost:8081', 'https://localhost:8080'] as $origin) {
            $this->assertSame([], CompetitionLoginAccounts::forRequest(Request::create($origin.'/login')));
        }
        app()->detectEnvironment(fn () => 'production');
        $this->get('http://localhost:8080/login')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/Login', false)->missing('demoAccounts'));
        app()->detectEnvironment(fn () => 'testing');
        FixtureAccountRoster::read()['relawan-1']->update(['is_active' => false]);
        $this->assertSame([], CompetitionLoginAccounts::forRequest(Request::create('http://localhost:8080/login')));
    }

    public function test_wrong_environment_database_or_unexpected_roster_refuses_without_credentials_change(): void
    {
        $this->legacyFixture();
        $hash = hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json'));
        foreach (['environment', 'database', 'assignment', 'count'] as $case) {
            DB::beginTransaction();
            $original = config('database.connections.pgsql.database');
            try {
                if ($case === 'environment') {
                    app()->detectEnvironment(fn () => 'production');
                }
                if ($case === 'database') {
                    config(['database.connections.pgsql.database' => 'rapid_mind']);
                }
                if ($case === 'assignment') {
                    User::where('email', 'relawan-1@competition.example.invalid')->update(['shelter_id' => null]);
                }
                if ($case === 'count') {
                    User::factory()->create();
                }
                try {
                    $this->update();
                    $this->fail('Unsafe update accepted.');
                } catch (RuntimeException) {
                    $this->assertSame($hash, hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json')));
                    $this->assertFileDoesNotExist(storage_path('app/private/competition-fixture/.account-update.pending.json'));
                }
            } finally {
                config(['database.connections.pgsql.database' => $original]);
                app()->detectEnvironment(fn () => 'testing');
                DB::rollBack();
            }
        }
    }

    public function test_interrupted_database_update_rolls_back_and_leaves_explicit_pending_state(): void
    {
        $this->legacyFixture();
        $oldHash = hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json'));
        Event::listen('eloquent.updating: '.User::class, fn () => throw new RuntimeException('Injected test failure'));
        try {
            $this->update();
            $this->fail('Injected failure ignored.');
        } catch (RuntimeException) {
            $this->assertCount(6, FixtureAccountRoster::read(true));
            $this->assertSame($oldHash, hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json')));
            $this->assertFileExists(storage_path('app/private/competition-fixture/.account-update.pending.json'));
            $this->assertSame([], CompetitionLoginAccounts::forRequest(Request::create('http://localhost:8080/login')));
        }
    }

    public function test_publication_failure_keeps_new_database_old_bundle_and_pending_guard(): void
    {
        $this->legacyFixture();
        $oldHash = hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json'));
        Event::listen('eloquent.updated: '.User::class, function (User $u): void {
            if ($u->email === F::email('healthcare-b')) {
                unlink(storage_path('app/private/competition-fixture/.account-update.next.json'));
            }
        });
        try {
            $this->update();
            $this->fail('Publication failure ignored.');
        } catch (RuntimeException) {
            $this->assertCount(6, FixtureAccountRoster::read());
            $this->assertSame($oldHash, hash_file('sha256', storage_path('app/private/competition-fixture/credentials.json')));
            $this->assertFileExists(storage_path('app/private/competition-fixture/.account-update.pending.json'));
            $this->expectException(RuntimeException::class);
            FixtureCredentials::load(false);
        }
    }

    public function test_new_credentials_authenticate_all_roles_and_old_session_version_is_rejected(): void
    {
        $old = $this->legacyFixture();
        $this->actingAs($old['relawan-1']);
        $this->update();
        $this->get('http://localhost:8080/relawan/home')->assertRedirect('/login');
        $this->app['session.store']->forget('url.intended');
        $password = file_get_contents($this->passwordFile);
        foreach (['admin' => '/admin/summary', 'relawan-1' => '/relawan/home', 'relawan-2' => '/relawan/home',
            'relawan-3' => '/relawan/home', 'healthcare-a' => '/healthcare/emergencies', 'healthcare-b' => '/healthcare/emergencies'] as $alias => $path) {
            $this->post('/login', ['email' => F::email($alias), 'password' => $password])->assertRedirect($path);
            $this->assertAuthenticatedAs(User::where('email', F::email($alias))->sole());
            $this->get($path)->assertOk();
            $this->post('/logout')->assertRedirect('/login');
            $this->assertGuest();
        }
    }

    public function test_private_input_and_bundle_permissions_symlinks_and_hardlinks_are_refused(): void
    {
        $this->legacyFixture();
        chmod($this->passwordFile, 0644);
        try {
            $this->update();
            $this->fail('Unsafe input accepted');
        } catch (RuntimeException) {
            $this->assertTrue(true);
        }
        chmod($this->passwordFile, 0600);
        $file = storage_path('app/private/competition-fixture/credentials.json');
        link($file, $file.'.hardlink');
        try {
            $this->update();
            $this->fail('Hardlink accepted');
        } catch (RuntimeException) {
            $this->assertTrue(true);
        }
        unlink($file.'.hardlink');
        rename($file, $file.'.original');
        symlink($file.'.original', $file);
        try {
            $this->update();
            $this->fail('Symlink accepted');
        } catch (RuntimeException) {
            $this->assertTrue(true);
        }
    }

    public function test_explicit_private_input_is_used_for_future_fixture_creation(): void
    {
        putenv('COMPETITION_FIXTURE_PASSWORD_FILE='.$this->passwordFile);
        $_ENV['COMPETITION_FIXTURE_PASSWORD_FILE'] = $_SERVER['COMPETITION_FIXTURE_PASSWORD_FILE'] = $this->passwordFile;
        app(CompetitionFixtureSeeder::class)->run();
        foreach (FixtureCredentials::load(false) as $alias => $credential) {
            $this->assertTrue(Hash::check(file_get_contents($this->passwordFile), User::where('email', F::email($alias))->sole()->password));
            $this->assertSame(file_get_contents($this->passwordFile), $credential['password']);
        }
    }

    public function test_update_revokes_existing_refresh_family_without_deleting_auth_history(): void
    {
        $old = $this->legacyFixture();
        $family = RefreshTokenFamily::create([
            'id' => (string) Str::uuid(), 'user_id' => $old['relawan-1']->id,
            'token_version' => $old['relawan-1']->token_version, 'expires_at' => now()->addDay(),
        ]);
        $this->update();
        $this->assertSame('version_changed', $family->fresh()->revoked_reason);
        $this->assertNotNull($family->fresh()->revoked_at);
        $this->assertSame(1, RefreshTokenFamily::count());
    }

    private function legacyFixture(): array
    {
        app(CompetitionFixtureSeeder::class)->run();
        $credentials = FixtureCredentials::load(false);
        foreach (FixtureAccountRoster::read() as $alias => $u) {
            $u->update(['name' => '[SINTETIS KOMPETISI] '.$alias, 'email' => $alias.'@competition.example.invalid']);
            $credentials[$alias]['email'] = $u->email;
        }
        file_put_contents(storage_path('app/private/competition-fixture/credentials.json'), json_encode(['version' => F::VERSION, 'accounts' => $credentials]));

        return FixtureAccountRoster::read(true);
    }

    private function update(): string
    {
        return app(FixtureAccountUpdate::class)->run($this->passwordFile);
    }

    private function clinicalFingerprints(): array
    {
        $result = [];
        foreach (Schema::getTableListing(schema: 'public', schemaQualified: false) as $table) {
            if (in_array($table, ['users', 'sessions', 'cache', 'refresh_token_families'], true)) {
                continue;
            }
            $quoted = DB::connection()->getQueryGrammar()->wrapTable($table);
            $result[$table] = DB::selectOne("select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from $quoted t")->hash;
        }

        return $result;
    }
}
