<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AuthTest extends TestCase
{
    public function test_login_page_renders_successfully(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
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
