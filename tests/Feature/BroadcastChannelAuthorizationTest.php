<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\HealthcareFacility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class BroadcastChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Exercise Laravel's real HTTP broadcast authorization route without opening a socket.
        config()->set('broadcasting.default', 'pusher');
        config()->set('broadcasting.connections.pusher', [
            'driver' => 'pusher',
            'key' => 'synthetic-test-key',
            'secret' => 'synthetic-test-secret',
            'app_id' => 'synthetic-test-app',
        ]);
        // The test environment booted its channel definitions on the null driver.
        // Register the same production callbacks on the selected test driver.
        require base_path('routes/channels.php');
    }

    private function authorize(string $channel): TestResponse
    {
        return $this->postJson('/broadcasting/auth', [
            'channel_name' => 'private-' . $channel,
            'socket_id' => '123.456',
        ]);
    }

    public function test_user_channel_requires_an_active_matching_persisted_user(): void
    {
        $user = User::factory()->create(
            ['role' => UserRole::RELAWAN, 'is_active' => true]
        );
        $other = User::factory()->create(
            ['role' => UserRole::RELAWAN, 'is_active' => true]
        );

        $this->actingAs($user);
        $this->authorize('App.Models.User.' . $user->id)->assertOk();
        $this->authorize('App.Models.User.' . $other->id)->assertForbidden();

        $user->update(['is_active' => false]);
        $this->authorize('App.Models.User.' . $user->id)->assertForbidden();

        auth()->logout();
        $this->authorize('App.Models.User.' . $user->id)->assertForbidden();
    }

    public function test_emergencies_channel_requires_an_active_healthcare_account(): void
    {
        $healthcare = User::factory()->create(
            ['role' => UserRole::HEALTHCARE, 'is_active' => true]
        );
        $relawan = User::factory()->create(
            ['role' => UserRole::RELAWAN, 'is_active' => true]
        );
        $admin = User::factory()->create(
            ['role' => UserRole::ADMIN, 'is_active' => true]
        );

        $this->actingAs($healthcare);
        $this->authorize('emergencies')->assertOk();

        $healthcare->update(['is_active' => false]);
        $this->authorize('emergencies')->assertForbidden();

        $this->actingAs($relawan);
        $this->authorize('emergencies')->assertForbidden();
        $this->actingAs($admin);
        $this->authorize('emergencies')->assertForbidden();

        auth()->logout();
        $this->authorize('emergencies')->assertForbidden();
    }

    public function test_facility_channel_requires_active_membership_in_the_requested_active_facility(): void
    {
        $facility = HealthcareFacility::create(
            [
                'name' => 'Faskes Uji',
                'type' => 'RS',
                'is_active' => true
            ]
        );
        $otherFacility = HealthcareFacility::create(
            [
                'name' => 'Faskes Lain',
                'type' => 'RS',
                'is_active' => true
            ]
        );
        $healthcare = User::factory()->create(
            [
                'role' => UserRole::HEALTHCARE,
                'is_active' => true,
                'facility_id' => $facility->id,
            ]
        );

        $this->actingAs($healthcare);
        $this->authorize('healthcare.facility.' . $facility->id)->assertOk();
        $this->authorize('healthcare.facility.' . $otherFacility->id)->assertForbidden();
        $this->authorize('healthcare.facility.' . ($otherFacility->id + 100))->assertForbidden();
        $this->authorize('healthcare.facility.invalid')->assertForbidden();

        $facility->update(['is_active' => false]);
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();
        $facility->update(['is_active' => true]);

        $healthcare->update(['facility_id' => null]);
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();
        $healthcare->update(['facility_id' => $facility->id, 'is_active' => false]);
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();

        $this->actingAs(User::factory()->create(
            ['role' => UserRole::RELAWAN, 'is_active' => true]
        ));
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();
        $this->actingAs(User::factory()->create(
            ['role' => UserRole::ADMIN, 'is_active' => true]
        ));
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();

        auth()->logout();
        $this->authorize('healthcare.facility.' . $facility->id)->assertForbidden();
    }
}
