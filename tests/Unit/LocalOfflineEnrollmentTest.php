<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\User;
use App\Http\Middleware\ValidateWebSessionVersion;
use Illuminate\Session\Store;
use Illuminate\Session\ArraySessionHandler;
use App\Support\LocalOfflineEnrollment;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class LocalOfflineEnrollmentTest extends TestCase
{
    #[DataProvider('eligibilityCases')]
    public function test_local_enrollment_requires_all_server_guards(array $changes, bool $expected): void
    {
        $case = array_replace([
            'environment' => 'local',
            'url' => LocalOfflineEnrollment::ORIGIN,
            'opt_in' => true,
            'request_url' => LocalOfflineEnrollment::ORIGIN,
            'authenticated' => true,
            'role' => UserRole::RELAWAN,
            'active' => true,
            'owner' => 101,
            'headers' => [],
            'session' => true,
            'session_owner' => 101,
            'session_version' => 7,
        ], $changes);
        $request = Request::create($case['request_url'] . '/relawan/offline-enrollment-status');
        foreach ($case['headers'] as $name => $value) {
            $request->headers->set($name, $value);
        }
        if ($case['session']) {
            $request->setLaravelSession(new Store('synthetic', new ArraySessionHandler(120)));
            $request->session()->put(ValidateWebSessionVersion::USER_ID, $case['session_owner']);
            $request->session()->put(ValidateWebSessionVersion::VERSION, $case['session_version']);
        }
        $user = $case['authenticated'] ? (new User())->forceFill([
            'id' => 101,
            'role' => $case['role'],
            'is_active' => $case['active'],
            'token_version' => 7,
        ]) : null;

        self::assertSame($expected, LocalOfflineEnrollment::allowed(
            $case['environment'], $case['url'], $case['opt_in'], $request, $user, $case['owner'],
        ));
        self::assertSame($expected ? LocalOfflineEnrollment::ORIGIN : null, LocalOfflineEnrollment::resolvedOrigin(
            $case['environment'], $case['url'], $case['opt_in'], $request, $user, $case['owner'],
        ));
    }

    public static function eligibilityCases(): array
    {
        return [
            'confirmed local Relawan' => [[], true],
            'default opt-out' => [['opt_in' => false], false],
            'production even with opt-in' => [['environment' => 'production'], false],
            'staging is not local' => [['environment' => 'staging'], false],
            'configured remote URL' => [['url' => 'https://rapid-mind.example'], false],
            'localhost and IP are distinct' => [['request_url' => 'http://127.0.0.1:8080'], false],
            'different port' => [['request_url' => 'http://localhost:8000'], false],
            'HTTPS is not the approved origin' => [['request_url' => 'https://localhost:8080'], false],
            'remote Host' => [['request_url' => 'http://rapid-mind.example:8080'], false],
            'forwarded Host does not authorize remote request' => [['request_url' => 'http://rapid-mind.example:8080', 'headers' => ['X-Forwarded-Host' => 'localhost:8080']], false],
            'foreign Origin' => [['headers' => ['Origin' => 'https://other.example']], false],
            'custom header cannot authorize remote Host' => [['request_url' => 'https://demo.ngrok-free.app', 'headers' => ['X-Client-Origin' => 'https://demo.ngrok-free.app']], false],
            'custom header cannot override foreign Origin' => [['headers' => ['Origin' => 'https://foreign.invalid', 'X-Client-Origin' => LocalOfflineEnrollment::ORIGIN]], false],
            'missing web session' => [['session' => false], false],
            'wrong session owner' => [['session_owner' => 102], false],
            'stale session version' => [['session_version' => 6], false],
            'unauthenticated' => [['authenticated' => false], false],
            'inactive' => [['active' => false], false],
            'wrong role' => [['role' => UserRole::HEALTHCARE], false],
            'wrong owner' => [['owner' => 102], false],
            'invalid owner' => [['owner' => 0], false],
        ];
    }
}
