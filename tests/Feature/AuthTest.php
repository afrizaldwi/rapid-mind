<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AuthTest extends TestCase
{
    public function test_login_page_renders_successfully(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }

    public function test_authenticated_user_keeps_normal_login_redirect_behavior(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::HEALTHCARE,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get('/login')
            ->assertRedirect('/healthcare/emergencies');
    }

    public function test_authenticated_wrong_user_can_open_explicit_reauthentication_form(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get('/login?reauth=1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login', false)
                ->where('auth.user', null));
    }

    public function test_unauthenticated_user_can_open_explicit_reauthentication_form(): void
    {
        $this->get('/login?reauth=1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login', false)
                ->where('auth.user', null));
    }

    public function test_successful_account_switch_replaces_user_and_regenerates_session(): void
    {
        $current = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);
        $replacement = User::factory()->create([
            'email' => 'pemulihan@rapidmind.id',
            'password' => Hash::make('password'),
            'role' => UserRole::RELAWAN,
            'is_active' => true,
        ]);

        $this->actingAs($current)->get('/login?reauth=1')->assertOk();
        $previousSessionId = session()->getId();

        $this->post('/login', [
            'email' => $replacement->email,
            'password' => 'password',
        ])->assertRedirect('/relawan/home');

        $this->assertAuthenticatedAs($replacement);
        $this->assertNotSame($previousSessionId, session()->getId());
    }

    public function test_relawan_login_redirects_to_relawan_home(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'relawan@rapidmind.id'],
            [
                'name' => 'Relawan Lapangan Budi',
                'password' => Hash::make('password'),
                'role' => UserRole::RELAWAN,
                'is_active' => true,
            ]
        );

        $response = $this->post('/login', [
            'email' => 'relawan@rapidmind.id',
            'password' => 'password',
        ]);

        $response->assertRedirect('/relawan/home');
    }

    public function test_healthcare_login_redirects_to_emergencies(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'nakes@rapidmind.id'],
            [
                'name' => 'dr. Rina Suryani',
                'password' => Hash::make('password'),
                'role' => UserRole::HEALTHCARE,
                'is_active' => true,
            ]
        );

        $response = $this->post('/login', [
            'email' => 'nakes@rapidmind.id',
            'password' => 'password',
        ]);

        $response->assertRedirect('/healthcare/emergencies');
    }

    public function test_admin_login_redirects_to_summary(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@rapidmind.id'],
            [
                'name' => 'Admin BPBD',
                'password' => Hash::make('password'),
                'role' => UserRole::ADMIN,
                'is_active' => true,
            ]
        );

        $response = $this->post('/login', [
            'email' => 'admin@rapidmind.id',
            'password' => 'password',
        ]);

        $response->assertRedirect('/admin/summary');
    }

    public function test_wrong_credentials_fails(): void
    {
        $response = $this->post('/login', [
            'email' => 'admin@rapidmind.id',
            'password' => 'wrong_password',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_jwt_api_login_returns_token(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'relawan@rapidmind.id',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'token',
            'token_type',
            'expires_in',
            'user' => ['id', 'name', 'email', 'role'],
            'redirect',
        ]);
    }
}
