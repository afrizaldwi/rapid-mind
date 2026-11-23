<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\RefreshToken;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use App\Services\OpaqueRefreshTokens;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class RefreshTokenConcurrencyTest extends TestCase
{
    public function test_two_postgresql_connections_cannot_redeem_the_same_credential(): void
    {
        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is required for the two-connection PostgreSQL test.');
        }

        $user = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => true,
            'password' => Hash::make('synthetic-pass'),
        ])->refresh();
        try {
            $issued = app(OpaqueRefreshTokens::class)->login($user);
            $this->assertNotNull($issued);
            $credential = $issued['refresh_token'];

            // The child uses a new PostgreSQL connection and waits for the parent user lock.
            DB::beginTransaction();
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            try {
                $pid = $this->forkRefreshWaitingOnLock($credential);
                $winner = app(OpaqueRefreshTokens::class)->rotate($credential);
                $this->assertNotNull($winner);
                DB::commit();
            } catch (\Throwable $error) {
                DB::rollBack();
                throw $error;
            }
            pcntl_waitpid($pid, $status);
            $this->assertSame(0, pcntl_wexitstatus($status));
            $this->assertSame(2, RefreshToken::where('user_id', $user->id)->count());
            $this->assertSame('replay', RefreshTokenFamily::where('user_id', $user->id)->sole()->revoked_reason);
        } finally {
            RefreshToken::where('user_id', $user->id)->delete();
            RefreshTokenFamily::where('user_id', $user->id)->delete();
            $user->delete();
        }
    }

    public function test_refresh_racing_logout_cannot_restore_the_revoked_family(): void
    {
        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is required for the two-connection PostgreSQL test.');
        }

        $user = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => true,
            'password' => Hash::make('synthetic-pass'),
        ])->refresh();
        try {
            $issued = app(OpaqueRefreshTokens::class)->login($user);
            $this->assertNotNull($issued);
            $family = RefreshTokenFamily::where('user_id', $user->id)->sole();

            DB::beginTransaction();
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            try {
                $pid = $this->forkRefreshWaitingOnLock($issued['refresh_token']);
                app(OpaqueRefreshTokens::class)->revoke($user, $family->id);
                DB::commit();
            } catch (\Throwable $error) {
                DB::rollBack();
                throw $error;
            }
            pcntl_waitpid($pid, $status);
            $this->assertSame(0, pcntl_wexitstatus($status));
            $this->assertSame('logout', $family->fresh()->revoked_reason);
            $this->assertSame(1, RefreshToken::where('user_id', $user->id)->count());
        } finally {
            RefreshToken::where('user_id', $user->id)->delete();
            RefreshTokenFamily::where('user_id', $user->id)->delete();
            $user->delete();
        }
    }

    private function forkRefreshWaitingOnLock(string $credential): int
    {
        $sockets = stream_socket_pair(STREAM_PF_UNIX, STREAM_SOCK_STREAM, 0);
        $this->assertNotFalse($sockets);
        $pid = pcntl_fork();
        $this->assertNotSame(-1, $pid);
        if ($pid === 0) {
            fclose($sockets[0]);
            try {
                // A separate connection avoids using the inherited PostgreSQL socket.
                config()->set('database.connections.pgsql_concurrent', config('database.connections.pgsql'));
                config()->set('database.default', 'pgsql_concurrent');
                $backendPid = DB::selectOne('SELECT pg_backend_pid() AS pid')->pid;
                fwrite($sockets[1], $backendPid."\n");
                fclose($sockets[1]);
                $result = app(OpaqueRefreshTokens::class)->rotate($credential);
                exit($result === null ? 0 : 1);
            } catch (\Throwable) {
                exit(2);
            }
        }

        fclose($sockets[1]);
        stream_set_timeout($sockets[0], 5);
        $line = fgets($sockets[0]);
        fclose($sockets[0]);
        $this->assertNotFalse($line);
        $backendPid = (int) trim($line);
        $this->assertGreaterThan(0, $backendPid);

        $deadline = microtime(true) + 5;
        do {
            $activity = DB::selectOne('SELECT wait_event_type FROM pg_stat_activity WHERE pid = ?', [$backendPid]);
            if ($activity?->wait_event_type === 'Lock') {
                return $pid;
            }
            usleep(10_000);
        } while (microtime(true) < $deadline);

        $this->fail('The competing PostgreSQL connection did not wait on the user row lock.');
    }
}
