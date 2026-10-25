<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Http\Middleware\ValidateWebSessionVersion;
use App\Models\HealthcareFacility;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class AuthenticationBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private function user(UserRole $role = UserRole::RELAWAN): User
    {
        return User::factory()->create(['role' => $role, 'is_active' => true])->refresh();
    }

    private function token(User $user, array $claims = []): string
    {
        $token = JWTAuth::claims($claims)->fromUser($user);
        JWTAuth::claims([]);

        return $token;
    }

    public function test_current_version_bearer_works_on_api_and_persisted_role_is_authoritative(): void
    {
        $user = $this->user();
        $token = $this->token($user);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])
            ->assertOk()->assertJsonPath('role', 'RELAWAN');

        $user->update(['role' => UserRole::HEALTHCARE]);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])
            ->assertOk()->assertJsonPath('role', 'HEALTHCARE');
        $this->getJson('/relawan/home', ['Authorization' => 'Bearer '.$token])->assertForbidden();
    }

    public function test_stale_missing_malformed_and_inactive_bearer_credentials_fail(): void
    {
        $user = $this->user();
        $stale = $this->token($user);
        $missing = $this->token($user, ['ver' => null]);
        $malformed = $this->token($user, ['ver' => '1']);
        $user->increment('token_version');

        foreach ([$stale, $missing, $malformed] as $token) {
            $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])->assertUnauthorized();
        }

        $current = $this->token($user->fresh());
        $user->update(['is_active' => false]);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$current])->assertUnauthorized();
    }

    public function test_new_login_after_reactivation_issues_current_version_jwt(): void
    {
        $user = $this->user();
        $user->update(['password' => Hash::make('synthetic-pass'), 'is_active' => false]);
        $user->increment('token_version');
        $user->update(['is_active' => true]);

        $token = $this->postJson('/api/auth/login', [
            'email' => $user->email, 'password' => 'synthetic-pass',
        ])->assertOk()->json('token');

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])->assertOk();
    }

    public function test_legacy_refresh_rejects_stale_version_and_keeps_current_version_on_expired_access(): void
    {
        $user = $this->user();
        $old = $this->token($user);
        $user->increment('token_version');
        $this->postJson('/api/auth/refresh', [], ['Authorization' => 'Bearer '.$old])->assertUnauthorized();

        $current = $this->token($user->fresh());
        $this->travel(61)->minutes();
        $renewed = $this->postJson('/api/auth/refresh', [], ['Authorization' => 'Bearer '.$current])
            ->assertOk()->json('token');
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$renewed])->assertOk();
    }

    public function test_bound_web_session_navigates_and_missing_or_stale_binding_is_rejected(): void
    {
        $user = $this->user();
        $this->actingAs($user);
        $this->get('/relawan/home')->assertOk();

        session()->forget(ValidateWebSessionVersion::VERSION);
        $this->getJson('/relawan/home')->assertUnauthorized();

        $this->actingAs($user);
        $user->increment('token_version');
        $this->getJson('/relawan/session-status')
            ->assertUnauthorized()->assertExactJson(['state' => 'REAUTHENTICATION_REQUIRED']);
    }

    public function test_account_switch_binds_new_identity_and_version(): void
    {
        $previous = $this->user(UserRole::ADMIN);
        $replacement = $this->user();
        $replacement->update(['password' => Hash::make('synthetic-pass'), 'token_version' => 4]);

        $this->actingAs($previous)->get('/login?reauth=1')->assertOk();
        $this->post('/login', ['email' => $replacement->email, 'password' => 'synthetic-pass'])
            ->assertRedirect('/relawan/home');
        $this->get('/relawan/home')->assertOk();
        $this->assertAuthenticatedAs($replacement);
        $this->assertSame($replacement->id, session(ValidateWebSessionVersion::USER_ID));
        $this->assertSame(4, session(ValidateWebSessionVersion::VERSION));
    }

    public function test_invalid_or_stale_bearer_cannot_fall_back_to_web_session(): void
    {
        $user = $this->user();
        $stale = $this->token($user);
        $this->actingAs($user);

        $this->getJson('/relawan/home', ['Authorization' => 'Bearer invalid'])->assertUnauthorized();
        $this->getJson('/relawan/home', ['Authorization' => 'Basic invalid'])->assertUnauthorized();

        $user->increment('token_version');
        $this->actingAs($user->fresh());
        $this->getJson('/relawan/home', ['Authorization' => 'Bearer '.$stale])->assertUnauthorized();
    }

    public function test_other_users_valid_bearer_cannot_replace_browser_session_identity(): void
    {
        $sessionUser = $this->user();
        $other = $this->user();
        $this->actingAs($sessionUser)
            ->getJson('/relawan/home', ['Authorization' => 'Bearer '.$this->token($other)])
            ->assertUnauthorized();
        $this->get('/relawan/home')->assertOk();
    }

    public function test_api_requires_bearer_and_bearer_only_logout_succeeds(): void
    {
        $user = $this->user();
        $this->actingAs($user);
        $this->getJson('/api/auth/me')->assertUnauthorized();

        $token = $this->token($user);
        $this->postJson('/api/auth/logout', [], ['Authorization' => 'Bearer '.$token])->assertOk();
    }

    public function test_disabled_account_session_fails_and_reactivation_does_not_restore_it(): void
    {
        $user = $this->user();
        $this->actingAs($user);
        $user->update(['is_active' => false]);
        $this->getJson('/relawan/home')->assertUnauthorized();
        $user->update(['is_active' => true]);
        $this->getJson('/relawan/home')->assertUnauthorized();
    }

    public function test_facility_and_shelter_reassignment_preserve_valid_session(): void
    {
        $relawan = $this->user();
        $this->actingAs($relawan);
        $region = Region::create(['name' => 'Wilayah Sintetis']);
        $relawan->update(['shelter_id' => Shelter::create(['name' => 'Posko Sintetis', 'region_id' => $region->id, 'is_active' => true])->id]);
        $this->get('/relawan/home')->assertOk();

        $healthcare = $this->user(UserRole::HEALTHCARE);
        $this->actingAs($healthcare);
        $facility = HealthcareFacility::create(['name' => 'Faskes Sintetis', 'type' => 'RS', 'is_active' => true]);
        $healthcare->update(['facility_id' => $facility->id]);
        $this->get('/healthcare/emergencies')->assertOk();
    }

    public function test_admin_disablement_increments_version_and_reactivation_does_not_undo_it(): void
    {
        $admin = $this->user(UserRole::ADMIN);
        $region = Region::create(['name' => 'Wilayah Uji']);
        $shelter = Shelter::create(['name' => 'Posko Uji', 'region_id' => $region->id, 'is_active' => true]);
        $volunteer = $this->user();
        $volunteer->update(['shelter_id' => $shelter->id, 'phone_number' => '081234567890']);
        $old = $this->token($volunteer);

        $payload = [
            'name' => $volunteer->name,
            'email' => $volunteer->email,
            'phone_number' => '081234567890',
            'shelter_id' => $shelter->id,
        ];
        $this->actingAs($admin)->put('/admin/volunteers/'.$volunteer->id, $payload + ['is_active' => false])
            ->assertSessionHasNoErrors();
        $this->assertSame(2, $volunteer->fresh()->token_version);

        $this->put('/admin/volunteers/'.$volunteer->id, $payload + ['is_active' => true])
            ->assertSessionHasNoErrors();
        $this->assertSame(2, $volunteer->fresh()->token_version);
        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$old])->assertUnauthorized();
    }
}
