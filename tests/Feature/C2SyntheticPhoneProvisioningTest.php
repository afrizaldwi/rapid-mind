<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class C2SyntheticPhoneProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_validated_creation_accepts_both_non_routable_c2_contacts_but_rejects_other_users_and_updates(): void
    {
        config(['app.url' => 'http://localhost:8080']);
        $this->actingAs(User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]));
        $region = Region::create(['name' => 'Synthetic C2']);
        $shelter = Shelter::create(['name' => 'Synthetic C2', 'region_id' => $region->id, 'is_active' => true]);
        foreach (['A', 'B'] as $scope) {
            $payload = [
                'name' => 'C2 Relawan ' . $scope,
                'email' => 'c2-relawan-' . strtolower($scope) . '@example.invalid',
                'phone_number' => 'C2-TEST-NONROUTABLE-' . $scope,
                'password' => 'fixture-only-secret',
                'password_confirmation' => 'fixture-only-secret',
                'shelter_id' => $shelter->id,
                'is_active' => true,
            ];
            $this->post('/admin/volunteers', $payload)->assertSessionHasNoErrors()->assertRedirect();
            $user = User::where('email', $payload['email'])->firstOrFail();
            $this->assertSame($payload['phone_number'], $user->phone_number);
            $this->assertSame(UserRole::RELAWAN, $user->role);
            $this->put('/admin/volunteers/' . $user->id, $payload)->assertSessionHasErrors('phone_number');
            $this->post('/admin/volunteers', [...$payload, 'name' => 'Other account', 'email' => strtolower($scope) . '@other.invalid'])
                ->assertSessionHasErrors('phone_number');
        }
    }

    public function test_production_rejects_synthetic_contact_without_creating_any_user(): void
    {
        config(['app.url' => 'http://localhost:8080']);
        $this->actingAs(User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]));
        $region = Region::create(['name' => 'Synthetic C2']);
        $shelter = Shelter::create(['name' => 'Synthetic C2', 'region_id' => $region->id, 'is_active' => true]);
        $this->app->instance('env', 'production');
        $this->withSession(['_token' => 'c2-test-csrf-token']);
        $this->post('/admin/volunteers', [
            '_token' => 'c2-test-csrf-token',
            'name' => 'C2 Relawan A',
            'email' => 'c2-relawan-a@example.invalid',
            'phone_number' => 'C2-TEST-NONROUTABLE-A',
            'password' => 'fixture-only-secret',
            'password_confirmation' => 'fixture-only-secret',
            'shelter_id' => $shelter->id,
            'is_active' => true,
        ])->assertSessionHasErrors('phone_number');
        $this->assertDatabaseMissing('users', ['email' => 'c2-relawan-a@example.invalid']);
    }
}
