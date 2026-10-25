<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\RefreshToken;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class AuthenticationRateLimitTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => true,
            'password' => Hash::make('synthetic-pass'),
        ]);
    }

    private function credentials(User $user, string $password = 'synthetic-pass'): array
    {
        return ['email' => $user->email, 'password' => $password];
    }

    public function test_web_login_throttles_an_identity_and_recovers_after_one_minute(): void
    {
        $user = $this->user();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', $this->credentials($user, 'wrong'))
                ->assertSessionHasErrors('email');
        }

        $limited = $this->post('/login', $this->credentials($user));
        $limited->assertStatus(429)
            ->assertSee('Terlalu banyak percobaan masuk');
        $this->assertGreaterThan(0, (int) $limited->headers->get('Retry-After'));
        $this->assertGuest('web');

        $this->withHeaders(['X-Inertia' => 'true'])
            ->post('/login', $this->credentials($user))
            ->assertStatus(429)
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('props.errors.email', 'Terlalu banyak percobaan masuk. Coba lagi sebentar.');

        $this->travel(61)->seconds();
        $this->post('/login', $this->credentials($user))->assertRedirect('/relawan/home');
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertSame(0, RefreshTokenFamily::count());
    }

    public function test_login_identity_limit_is_shared_across_sources_and_aliases(): void
    {
        $user = $this->user();
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])
                ->postJson('/api/auth/login', $this->credentials($user, 'wrong'))->assertUnauthorized();
        }
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.2'])
                ->postJson('/api/auth/login', ['email' => $user->name, 'password' => 'wrong'])
                ->assertUnauthorized();
        }
        $limited = $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.3'])
            ->postJson('/api/auth/login', $this->credentials($user));
        $limited->assertStatus(429)->assertJsonMissingPath('token');
        $this->assertGreaterThan(0, (int) $limited->headers->get('Retry-After'));
        $this->assertSame(0, RefreshTokenFamily::count());
    }

    public function test_accounts_share_an_ip_without_using_each_others_identity_budget(): void
    {
        $first = $this->user();
        $second = $this->user();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', $this->credentials($first, 'wrong'))
                ->assertUnauthorized();
        }
        $response = $this->postJson('/api/auth/login', $this->credentials($second))->assertOk();
        $this->assertNotEmpty($response->json('token'));
        $this->assertNotEmpty($response->json('refresh_token'));
        $this->assertGuest('web');
    }

    public function test_source_ip_limit_ignores_client_supplied_forwarded_address(): void
    {
        $user = $this->user();
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.9'])
                ->withHeaders(['X-Forwarded-For' => '198.51.100.'.$attempt])
                ->postJson('/api/auth/login', [
                    'email' => 'unknown'.$attempt.'@example.test',
                    'password' => 'wrong',
                ])->assertUnauthorized();
        }
        $limited = $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.9'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.8'])
            ->postJson('/api/auth/login', $this->credentials($user));
        $limited->assertStatus(429)->assertJsonPath('message', 'Terlalu banyak percobaan. Coba lagi sebentar.');
        $this->assertGreaterThan(0, (int) $limited->headers->get('Retry-After'));
        $this->assertSame(0, RefreshTokenFamily::count());
    }

    public function test_refresh_throttling_does_not_consume_or_revoke_a_valid_credential(): void
    {
        $user = $this->user();
        $issued = $this->postJson('/api/auth/login', $this->credentials($user))->assertOk()->json();
        $family = RefreshTokenFamily::where('user_id', $user->id)->sole();
        $initialExpiry = $family->expires_at->toIso8601String();

        for ($attempt = 0; $attempt < 60; $attempt++) {
            $this->postJson('/api/auth/refresh', ['refresh_token' => 'invalid-'.$attempt])
                ->assertUnauthorized();
        }
        $limited = $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']]);
        $limited->assertStatus(429)->assertJsonMissingPath('refresh_token');
        $this->assertGreaterThan(0, (int) $limited->headers->get('Retry-After'));
        $this->assertNull(RefreshToken::where('token_hash', hash('sha256', $issued['refresh_token']))
            ->sole()->consumed_at);
        $this->assertNull($family->fresh()->revoked_at);
        $this->assertSame($initialExpiry, $family->fresh()->expires_at->toIso8601String());

        $this->travel(61)->seconds();
        $rotated = $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])
            ->assertOk()->json();
        $this->assertNotSame($issued['refresh_token'], $rotated['refresh_token']);
        $this->assertSame($initialExpiry, $rotated['refresh_expires_at']);
    }

    public function test_refresh_credential_limit_is_scoped_and_unknown_credentials_do_not_block_a_device(): void
    {
        $user = $this->user();
        $issued = $this->postJson('/api/auth/login', $this->credentials($user))->assertOk()->json();
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/auth/refresh', ['refresh_token' => 'repeated-invalid'])
                ->assertUnauthorized();
        }
        $this->postJson('/api/auth/refresh', ['refresh_token' => 'repeated-invalid'])
            ->assertStatus(429);
        $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])
            ->assertOk();
    }

    public function test_access_jwt_expires_after_fifteen_minutes_and_refresh_keeps_fixed_family_expiry(): void
    {
        $user = $this->user();
        $issued = $this->postJson('/api/auth/login', $this->credentials($user))->assertOk()->json();
        $payload = JWTAuth::setToken($issued['token'])->getPayload();
        $this->assertSame(900, $payload->get('exp') - $payload->get('iat'));
        $this->assertSame(900, $issued['expires_in']);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$issued['token']])->assertOk();

        $this->travel(901)->seconds();
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$issued['token']])
            ->assertUnauthorized();
        $rotated = $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])
            ->assertOk()->json();
        $this->assertSame(900, $rotated['expires_in']);
        $this->assertSame($issued['refresh_expires_at'], $rotated['refresh_expires_at']);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$rotated['token']])->assertOk();
        $this->postJson('/api/auth/logout', [], ['Authorization' => 'Bearer '.$rotated['token']])
            ->assertOk();
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$rotated['token']])
            ->assertUnauthorized();
    }
}
