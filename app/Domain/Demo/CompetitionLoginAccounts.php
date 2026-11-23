<?php

declare(strict_types=1);

namespace App\Domain\Demo;

use Database\Seeders\Competition\FixtureAccountRoster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class CompetitionLoginAccounts
{
    public static function forRequest(Request $request): array
    {
        $testing = app()->environment('testing') && app()->runningInConsole();
        $expected = $testing ? 'rapid_mind_testing' : 'rapid_mind';
        if ((! app()->environment('local') && ! $testing)
            || config('app.url') !== 'http://localhost:8080'
            || $request->getSchemeAndHttpHost() !== 'http://localhost:8080') {
            return [];
        }
        try {
            $db = DB::connection();
            if (config('database.default') !== 'pgsql' || $db->getDatabaseName() !== $expected
                || $db->getConfig('host') !== 'postgres' || (string) $db->getConfig('port') !== '5432'
                || $db->selectOne('select current_database() as name')->name !== $expected
                || ! Schema::hasTable('audit_logs')) {
                return [];
            }
            // No private credential file is opened by HTTP handling.
            if (file_exists(storage_path('app/private/competition-fixture/.account-update.pending.json'))) {
                return [];
            }
            $users = FixtureAccountRoster::read(strictNames: false);
            $result = [];
            // Marker-owned Posko 1/3 cover both primary facilities; never row-order selection.
            foreach (['admin', 'relawan-1', 'relawan-3', 'healthcare-a', 'healthcare-b'] as $alias) {
                $u = $users[$alias];
                $result[] = ['id' => $alias, 'name' => $u->name, 'email' => $u->email,
                    'role' => $u->role->value, 'organization' => $u->shelter?->name ?? $u->facility?->name];
            }

            return $result;
        } catch (Throwable) {
            return []; // Missing/inconsistent fixture must never break ordinary login.
        }
    }
}
