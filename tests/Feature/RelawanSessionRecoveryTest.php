<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RelawanSessionRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_relawan_receives_minimal_machine_readable_identity(): void
    {
        $relawan = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => true,
        ]);

        $this->actingAs($relawan)
            ->getJson('/relawan/session-status')
            ->assertOk()
            ->assertExactJson([
                'state' => 'AUTHENTICATED',
                'user' => [
                    'id' => $relawan->id,
                    'role' => UserRole::RELAWAN->value,
                ],
            ]);
    }

    public function test_unauthenticated_session_requires_reauthentication(): void
    {
        $this->getJson('/relawan/session-status')
            ->assertUnauthorized()
            ->assertExactJson(['state' => 'REAUTHENTICATION_REQUIRED']);
    }

    public function test_wrong_role_is_rejected_without_exposing_identity(): void
    {
        $healthcare = User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'is_active' => true,
        ]);

        $this->actingAs($healthcare)
            ->getJson('/relawan/session-status')
            ->assertForbidden()
            ->assertExactJson(['state' => 'WRONG_ROLE']);
    }

    public function test_inactive_relawan_is_authoritatively_rejected(): void
    {
        $relawan = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'is_active' => false,
        ]);

        $this->actingAs($relawan)
            ->getJson('/relawan/session-status')
            ->assertForbidden()
            ->assertExactJson(['state' => 'ACCOUNT_INACTIVE']);
    }
}
