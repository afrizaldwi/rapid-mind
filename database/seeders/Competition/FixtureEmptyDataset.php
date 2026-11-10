<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/** First installation only: reviewed data tables must be empty, never repaired. */
final class FixtureEmptyDataset
{
    public const TABLES = [
        'assessments', 'audit_logs', 'cache', 'cache_locks', 'clinical_case_shares',
        'clinical_validations', 'emergency_dispatch_history', 'emergency_dispatches',
        'emergency_events', 'emergency_verifications', 'failed_jobs', 'function_responses',
        'healthcare_facilities', 'job_batches', 'jobs', 'password_reset_tokens',
        'patients', 'referral_status_history', 'referrals', 'refresh_token_families',
        'refresh_tokens', 'regions', 'resource_allocations', 'resource_needs',
        'response_units', 'risk_responses', 'sessions', 'shelters', 'srq_responses',
        'triage_results', 'users',
    ];

    public static function check(): void
    {
        if (DB::transactionLevel() < 1) {
            throw new RuntimeException('Fixture empty-dataset guard requires a transaction.');
        }
        // Extension-owned relations (including PostGIS metadata) are infrastructure.
        // Reject application relations in any schema, views, partitions and foreign tables.
        $relations = DB::select("SELECT n.nspname, c.relname, c.relkind, c.relispartition
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE c.relkind IN ('r','p','v','m','f')
              AND n.nspname NOT IN ('pg_catalog','information_schema')
              AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'
              AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
                AND d.objid=c.oid AND d.deptype='e') ORDER BY n.nspname,c.relname");
        $expected = [...self::TABLES, 'migrations'];
        sort($expected);
        $actual = [];
        foreach ($relations as $relation) {
            if ($relation->nspname !== 'public' || $relation->relkind !== 'r' || $relation->relispartition) {
                throw new RuntimeException('Fixture unexpected application table or dependency; no automatic repair.');
            }
            $actual[] = $relation->relname;
        }
        if ($actual !== $expected || DB::selectOne("SELECT EXISTS (
            SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND NOT t.tgisinternal
        ) AS present")->present) {
            throw new RuntimeException('Fixture unexpected application table or dependency; no automatic repair.');
        }
        // Keep the empty check and creation atomic against concurrent application writes.
        DB::statement("SET LOCAL lock_timeout = '5s'");
        $tables = implode(', ', array_map(fn ($table) => 'public."'.$table.'"', self::TABLES));
        DB::statement('LOCK TABLE '.$tables.' IN SHARE ROW EXCLUSIVE MODE');
        foreach (self::TABLES as $table) {
            if (DB::table('public.'.$table)->exists()) {
                throw new RuntimeException('Fixture first installation requires empty application-data tables; no records or credentials created.');
            }
        }
    }
}
