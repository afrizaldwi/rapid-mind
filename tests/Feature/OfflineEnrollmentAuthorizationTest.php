<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Support\LocalOfflineEnrollment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class OfflineEnrollmentAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    #[DataProvider('policyCases')]
    public function test_endpoint_enforces_server_policy(array $changes, bool $allowed): void
    {
        $case = array_replace([
            'environment' => 'local',
            'url' => LocalOfflineEnrollment::ORIGIN,
            'request_origin' => LocalOfflineEnrollment::ORIGIN,
            'opt_in' => true,
            'headers' => [],
            'wrong_owner' => false,
        ], $changes);
        $this->app->detectEnvironment(fn () => $case['environment']);
        config(['app.url' => $case['url'], 'offline.local_enrollment' => $case['opt_in']]);
        $user = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $response = $this->actingAs($user)->withHeaders($case['headers'])->getJson(
            $case['request_origin'].'/relawan/offline-enrollment-status?owner_user_id='.
            ($case['wrong_owner'] ? $user->id + 1 : $user->id),
        );
        $response->assertStatus($allowed ? 200 : 403)->assertExactJson($allowed ? [
            'state' => 'LOCAL_ENROLLMENT_ALLOWED',
            'origin' => LocalOfflineEnrollment::ORIGIN,
            'user' => ['id' => $user->id, 'role' => 'RELAWAN'],
        ] : ['state' => 'ENROLLMENT_DISABLED']);
        self::assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public static function policyCases(): array
    {
        return [
            'local approved session' => [[], true],
            'matching Origin' => [['headers' => ['Origin' => LocalOfflineEnrollment::ORIGIN]], true],
            'opt out' => [['opt_in' => false], false],
            'production' => [['environment' => 'production'], false],
            'configured remote URL' => [['url' => 'https://rapid-mind.invalid'], false],
            'foreign Origin' => [['headers' => ['Origin' => 'https://foreign.invalid']], false],
            'IP is distinct' => [['request_origin' => 'http://127.0.0.1:8080'], false],
            'HTTPS is distinct' => [['request_origin' => 'https://localhost:8080'], false],
            'custom origin cannot authorize tunnel' => [['request_origin' => 'https://demo.ngrok-free.app', 'headers' => ['X-Client-Origin' => 'https://demo.ngrok-free.app']], false],
            'custom origin cannot override denial' => [['headers' => ['Origin' => 'https://foreign.invalid', 'X-Client-Origin' => LocalOfflineEnrollment::ORIGIN]], false],
            'forwarded localhost cannot authorize remote Host' => [['request_origin' => 'http://foreign.invalid', 'headers' => ['X-Forwarded-Host' => 'localhost:8080']], false],
            'different owner' => [['wrong_owner' => true], false],
        ];
    }
}
