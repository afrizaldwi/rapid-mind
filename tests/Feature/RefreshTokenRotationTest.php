<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\RefreshToken;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class RefreshTokenRotationTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => true,
            'password' => Hash::make('synthetic-pass'),
        ])->refresh();
    }

    private function login(User $user): array
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'synthetic-pass',
        ])->assertOk();
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control', ''));

        return $response->json();
    }

    private function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token];
    }

    public function test_api_login_stores_only_hash_and_web_login_creates_no_api_rows(): void
    {
        $user = $this->user();
        $this->post('/login', ['email' => $user->email, 'password' => 'synthetic-pass'])
            ->assertRedirect('/relawan/home');
        $this->assertSame(0, RefreshToken::count());
        $this->assertSame(0, RefreshTokenFamily::count());

        $issued = $this->login($user);
        $credential = $issued['refresh_token'];
        $this->assertMatchesRegularExpression('/^rmt_[A-Za-z0-9_-]{43}$/D', $credential);
        $family = RefreshTokenFamily::sole();
        $record = RefreshToken::sole();
        $this->assertSame($family->id, JWTAuth::setToken($issued['token'])->getPayload()->get('sid'));
        $this->assertSame($family->id, $record->family_id);
        $this->assertSame(hash('sha256', $credential), $record->token_hash);
        $this->assertNotSame($credential, $record->jti);
        $this->assertSame($family->expires_at->timestamp, $record->expires_at->timestamp);
        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertOk();
    }

    public function test_api_login_does_not_establish_a_web_session(): void
    {
        $user = $this->user();
        $this->login($user);

        $this->assertFalse(Auth::guard('web')->check());
        $this->getJson('/relawan/session-status')->assertUnauthorized();
    }

    public function test_rotation_is_single_use_and_replay_revokes_only_its_family(): void
    {
        $user = $this->user();
        $first = $this->login($user);
        $other = $this->login($user);
        $old = $first['refresh_token'];
        $originalExpiry = $first['refresh_expires_at'];

        $response = $this->postJson('/api/auth/refresh', ['refresh_token' => $old])->assertOk();
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control', ''));
        $replacement = $response->json();
        $this->assertSame($originalExpiry, $replacement['refresh_expires_at']);
        $this->assertNotSame($old, $replacement['refresh_token']);
        $this->assertNotNull(RefreshToken::where('token_hash', hash('sha256', $old))->firstOrFail()->consumed_at);
        $this->getJson('/api/auth/me', $this->bearer($replacement['token']))->assertOk();

        $this->postJson('/api/auth/refresh', ['refresh_token' => $old])->assertUnauthorized();
        $familyId = JWTAuth::setToken($first['token'])->getPayload()->get('sid');
        $this->assertSame('replay', RefreshTokenFamily::findOrFail($familyId)->revoked_reason);
        $this->postJson('/api/auth/refresh', ['refresh_token' => $replacement['refresh_token']])->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($replacement['token']))->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($other['token']))->assertOk();
    }

    public function test_replacement_can_rotate_again_without_extending_family_expiry(): void
    {
        $user = $this->user();
        $first = $this->login($user);
        $second = $this->postJson('/api/auth/refresh', ['refresh_token' => $first['refresh_token']])
            ->assertOk()->json();
        $third = $this->postJson('/api/auth/refresh', ['refresh_token' => $second['refresh_token']])
            ->assertOk()->json();
        $this->assertSame($first['refresh_expires_at'], $third['refresh_expires_at']);
        $this->assertSame(3, RefreshToken::count());
        $this->assertSame(1, RefreshTokenFamily::count());
    }

    public function test_unknown_malformed_expired_and_revoked_credentials_fail(): void
    {
        $user = $this->user();
        $issued = $this->login($user);
        foreach (['invalid', 'rmt_'.str_repeat('A', 43), (string) Str::uuid()] as $credential) {
            $this->postJson('/api/auth/refresh', ['refresh_token' => $credential])->assertUnauthorized();
        }
        $this->postJson('/api/auth/refresh', [], $this->bearer($issued['token']))->assertUnauthorized();
        $this->travel(8)->days();
        $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertUnauthorized();
    }

    public function test_legacy_refresh_row_is_preserved_but_cannot_be_redeemed(): void
    {
        $user = $this->user();
        $legacy = (string) Str::uuid();
        $row = RefreshToken::create([
            'jti' => $legacy,
            'user_id' => $user->id,
            'expires_at' => now()->addDays(7),
        ]);

        $this->postJson('/api/auth/refresh', ['refresh_token' => $legacy])->assertUnauthorized();
        $this->assertDatabaseHas('refresh_tokens', [
            'id' => $row->id,
            'jti' => $legacy,
            'family_id' => null,
            'token_hash' => null,
        ]);
    }

    public function test_logout_revokes_current_device_and_does_not_require_web_session(): void
    {
        $user = $this->user();
        $first = $this->login($user);
        $other = $this->login($user);
        $this->postJson('/api/auth/logout', [], $this->bearer($first['token']))->assertOk();
        $familyId = JWTAuth::setToken($first['token'])->getPayload()->get('sid');
        $this->assertSame('logout', RefreshTokenFamily::findOrFail($familyId)->revoked_reason);
        $this->getJson('/api/auth/me', $this->bearer($first['token']))->assertUnauthorized();
        $this->postJson('/api/auth/refresh', ['refresh_token' => $first['refresh_token']])->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($other['token']))->assertOk();
    }

    public function test_family_claim_is_required_and_must_match_owner_version_and_status(): void
    {
        $user = $this->user();
        $other = $this->user();
        $issued = $this->login($user);
        $familyId = JWTAuth::setToken($issued['token'])->getPayload()->get('sid');

        JWTAuth::claims([]);
        JWTAuth::factory()->emptyClaims();
        $legacy = JWTAuth::fromUser($user);
        $this->assertNull(JWTAuth::setToken($legacy)->getPayload()->get('sid'));
        $this->getJson('/api/auth/me', $this->bearer($legacy))->assertUnauthorized();
        $forged = JWTAuth::claims(['sid' => $familyId])->fromUser($other);
        JWTAuth::claims([]);
        $this->getJson('/api/auth/me', $this->bearer($forged))->assertUnauthorized();

        $family = RefreshTokenFamily::findOrFail($familyId);
        $family->update(['token_version' => $user->token_version + 1]);
        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertUnauthorized();
        $family->update(['token_version' => $user->token_version, 'revoked_at' => now(), 'revoked_reason' => 'version_changed']);
        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertUnauthorized();
    }

    public function test_expired_family_rejects_a_still_valid_access_jwt(): void
    {
        $user = $this->user();
        $issued = $this->login($user);
        $familyId = JWTAuth::setToken($issued['token'])->getPayload()->get('sid');
        RefreshTokenFamily::findOrFail($familyId)->update(['expires_at' => now()->subSecond()]);

        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertUnauthorized();
        $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])->assertUnauthorized();
    }

    public function test_disable_and_reactivation_cannot_restore_old_refresh_credentials(): void
    {
        $user = $this->user();
        $issued = $this->login($user);
        $user->update(['is_active' => false]);
        $user->increment('token_version');
        $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])->assertUnauthorized();
        $user->update(['is_active' => true]);
        $this->postJson('/api/auth/refresh', ['refresh_token' => $issued['refresh_token']])->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($issued['token']))->assertUnauthorized();
        $this->getJson('/api/auth/me', $this->bearer($this->login($user)['token']))->assertOk();
    }
}
