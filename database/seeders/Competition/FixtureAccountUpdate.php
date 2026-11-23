<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Throwable;

/** Explicit one-time identity rotation; never resets or seeds clinical data. */
final class FixtureAccountUpdate
{
    public function run(string $passwordFile): string
    {
        $expected = match (app()->environment()) {
            'local' => 'rapid_mind', 'testing' => 'rapid_mind_testing', default => null,
        };
        $db = DB::connection();
        if (! app()->runningInConsole() || app()->configurationIsCached() || ! $expected
            || env('COMPETITION_ACCOUNT_UPDATE') !== 'ALLOW_LOCAL_IDENTITY_UPDATE_V1'
            || config('app.url') !== 'http://localhost:8080' || config('database.default') !== 'pgsql'
            || config('database.connections.pgsql.database') !== $expected
            || $db->getDatabaseName() !== $expected || $db->getConfig('host') !== 'postgres'
            || (string) $db->getConfig('port') !== '5432'
            || $db->selectOne('select current_database() as name')->name !== $expected
            || (app()->environment('local') && $db->transactionLevel() !== 0)) {
            throw new RuntimeException('Competition account update target/opt-in refused.');
        }
        $password = FixturePasswordInput::read($passwordFile);
        $replacement = null;
        try {
            $result = $db->transaction(function () use ($password, &$replacement): string {
                DB::select("SELECT pg_advisory_xact_lock(hashtextextended('competition-fixture-v1', 0))");
                DB::statement("SET LOCAL lock_timeout = '5s'");
                DB::statement('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
                if (User::count() !== 6) {
                    throw new RuntimeException('Competition account count unexpected.');
                }
                $legacy = User::where('email', 'admin@competition.example.invalid')->exists();
                $users = FixtureAccountRoster::read($legacy);
                $this->assertClinicalOwnership($users);
                $credentials = FixtureCredentials::load(false, $legacy);
                foreach ($users as $alias => $u) {
                    if (! Hash::check($credentials[$alias]['password'], $u->password)) {
                        throw new RuntimeException('Competition credential/database mismatch.');
                    }
                }
                if (! $legacy) {
                    foreach ($users as $u) {
                        if (! Hash::check($password, $u->password)) {
                            throw new RuntimeException('Competition account update already applied with different input.');
                        }
                    }

                    return 'unchanged';
                }
                if (User::whereIn('email', array_column(FixtureDefinition::IDENTITIES, 1))->exists()) {
                    throw new RuntimeException('Competition destination identity already used.');
                }
                $new = [];
                foreach ($users as $alias => $u) {
                    $new[$alias] = ['email' => FixtureDefinition::email($alias), 'password' => $password];
                }
                $replacement = new FixtureCredentialReplacement;
                $replacement->stage($new);
                foreach ($users as $alias => $u) {
                    // Same version invariant as existing account disable/revocation paths.
                    $u->update(['name' => FixtureDefinition::name($alias), 'email' => FixtureDefinition::email($alias),
                        'password' => Hash::make($password), 'token_version' => $u->token_version + 1]);
                    RefreshTokenFamily::where('user_id', $u->id)->whereNull('revoked_at')
                        ->update(['revoked_at' => now(), 'revoked_reason' => 'version_changed']);
                }

                return 'updated';
            });
            // Database commits first; the durable pending marker prevents any unnoticed
            // inconsistent rerun if publication fails or the process stops at this boundary.
            $replacement?->publish();

            return $result;
        } catch (Throwable) {
            throw new RuntimeException('Competition account update stopped; inspect DB and protected pending state before explicit recovery.');
        }
    }

    private function assertClinicalOwnership(array $users): void
    {
        foreach (['patients' => 12, 'assessments' => 12, 'emergency_events' => 5, 'referrals' => 2,
            'emergency_dispatches' => 2] as $table => $count) {
            if (DB::table($table)->count() !== $count) {
                throw new RuntimeException('Competition clinical root counts unexpected.');
            }
        }
        foreach (range(1, 12) as $n) {
            $volunteer = $users['relawan-'.FixtureDefinition::posko($n)];
            $medic = $users['healthcare-'.FixtureDefinition::facility(FixtureDefinition::posko($n))];
            if (! DB::table('patients')->where('id', FixtureDefinition::id($n))
                ->where('created_by', $volunteer->id)->where('shelter_id', $volunteer->shelter_id)->exists()
                || ! DB::table('assessments')->where('id', FixtureDefinition::id($n, 2))
                    ->where('patient_id', FixtureDefinition::id($n))->where('user_id', $volunteer->id)
                    ->where('originating_shelter_id', $volunteer->shelter_id)
                    ->where('responsible_facility_id', $medic->facility_id)->exists()) {
                throw new RuntimeException('Competition clinical ownership inconsistent.');
            }
        }
    }
}
