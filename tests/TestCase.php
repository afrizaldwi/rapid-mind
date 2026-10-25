<?php

namespace Tests;

use App\Http\Middleware\ValidateWebSessionVersion;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function actingAs(Authenticatable $user, $guard = null)
    {
        parent::actingAs($user, $guard);

        // actingAs bypasses the login controller; model a freshly issued web session.
        if ($guard === null || $guard === 'web') {
            $version = $user instanceof User ? $user->fresh()?->token_version : null;
            $this->withSession([
                ValidateWebSessionVersion::USER_ID => $user->getAuthIdentifier(),
                ValidateWebSessionVersion::VERSION => $version,
            ]);
        }

        return $this;
    }

    public function createApplication()
    {
        $app = parent::createApplication();

        if ($app['config']->get('database.default') !== 'pgsql') {
            throw new RuntimeException('Tests require the PostgreSQL rapid_mind_testing database.');
        }

        $connection = $app['db']->connection();
        self::assertTestingDatabase($connection->getDatabaseName());
        self::assertTestingDatabase($connection->selectOne('select current_database() as name')->name);

        return $app;
    }

    public static function assertTestingDatabase(?string $database): void
    {
        if ($database !== 'rapid_mind_testing') {
            throw new RuntimeException('Tests require rapid_mind_testing; refusing to use '.($database ?? 'an unnamed database').'.');
        }
    }
}
