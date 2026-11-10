<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use App\Domain\Healthcare\HealthcareCaseAccess;
use App\Domain\Healthcare\HealthcareOperationsRead;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

final class FixtureGuard
{
    public static function check(): string
    {
        $environment = app()->environment();
        $expected = match ($environment) {
            'local' => 'rapid_mind', 'testing' => 'rapid_mind_testing', default => null
        };
        if (! app()->runningInConsole() || app()->configurationIsCached() || ! $expected
            || env('RAPID_MIND_COMPETITION_FIXTURE') !== 'ALLOW_SCRIPTED_SYNTHETIC_HISTORY_V1'
            || config('app.url') !== 'http://localhost:8080'
            || config('database.default') !== 'pgsql'
            || config('database.connections.pgsql.database') !== $expected
            || DB::connection()->getConfig('host') !== 'postgres'
            || (string) DB::connection()->getConfig('port') !== '5432'
            || DB::connection()->getDatabaseName() !== $expected
            || DB::selectOne('select current_database() as name')->name !== $expected
            || ! in_array(config('broadcasting.default'), [null, 'null'], true) || config('queue.default') !== 'sync'
            || config('mail.default') !== 'array' || config('session.driver') !== 'array'
            || config('cache.default') !== 'array') {
            throw new RuntimeException('Competition fixture blocked: console/local-testing identity, explicit opt-in and inert transports required.');
        }
        if ($environment === 'local' && DB::transactionLevel() !== 0) {
            throw new RuntimeException('Competition fixture blocked inside an enclosing development transaction.');
        }
        $date = env('COMPETITION_FIXTURE_DATE');
        if (! is_string($date) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)
            || ! checkdate((int) substr($date, 5, 2), (int) substr($date, 8, 2), (int) substr($date, 0, 4))) {
            throw new RuntimeException('Competition fixture requires an explicit valid COMPETITION_FIXTURE_DATE (UTC).');
        }
        if (! HealthcareCaseAccess::available() || ! app(HealthcareOperationsRead::class)->ready()
            || ! Schema::hasColumns('healthcare_facilities', ['latitude', 'longitude'])) {
            throw new RuntimeException('Competition fixture schema unavailable; no migrations are run by this seeder.');
        }

        return $date;
    }
}
