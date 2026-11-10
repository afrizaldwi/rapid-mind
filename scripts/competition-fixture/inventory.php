<?php

declare(strict_types=1);
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// READ ONLY: counts/schema/data fingerprints only. Never outputs records or credentials.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = DB::connection();
$expected = match (app()->environment()) {
    'local' => 'rapid_mind', 'testing' => 'rapid_mind_testing', default => null
};
if (! $expected || config('database.default') !== 'pgsql' || $db->getDatabaseName() !== $expected
    || app()->configurationIsCached()) {
    throw new RuntimeException('Inventory target/configuration refused.');
}
$db->beginTransaction();
try {
    $db->statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    if ($db->selectOne('select current_database() as name')->name !== $expected) {
        throw new RuntimeException('Actual database mismatch.');
    }
    $rows = [];
    $tables = $db->select("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    foreach ($tables as $table) {
        $name = $table->tablename;
        $quoted = $db->getQueryGrammar()->wrapTable($name);
        $rows[$name] = (array) $db->selectOne("SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS fingerprint FROM $quoted t");
    }
    $schema = $db->select("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
    echo json_encode([
        'environment' => app()->environment(), 'database' => $expected,
        'application_origin_local' => config('app.url') === 'http://localhost:8080',
        'transaction_read_only' => $db->selectOne('show transaction_read_only')->transaction_read_only,
        'postgis_version' => $db->selectOne('select postgis_lib_version() as version')->version,
        'schema_sha256' => hash('sha256', json_encode($schema, JSON_THROW_ON_ERROR)),
        'migration_count' => $db->table('migrations')->count(),
        'max_user_id' => $db->table('users')->max('id'), 'tables' => $rows,
    ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), "\n";
} finally {
    $db->rollBack();
}
