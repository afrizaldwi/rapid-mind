<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\UserRole;
use App\Models\EmergencyEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class RelawanEmergencyLocalShellTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unknown_uuid_opens_only_a_local_lookup_shell_without_persisting_a_case(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $id = (string) Str::uuid();
        $this->actingAs($owner)->get("/relawan/emergencies/$id")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Emergency', false)
            ->where('localEmergencyId', $id)
            ->missing('emergency')
            ->missing('localEmergency'));
        $this->assertDatabaseMissing('emergency_events', ['id' => $id]);
        $this->actingAs($owner)->get('/relawan/emergencies/not-a-uuid')->assertNotFound();
    }

    public function test_foreign_persisted_case_stays_404_and_own_projection_has_no_clinical_outcome(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $other = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $case = EmergencyEvent::create(['user_id' => $other->id, 'red_flag_type' => RedFlagType::MEDICAL_CRISIS, 'status' => EmergencyStatus::CONFIRMED]);
        $this->actingAs($owner)->get("/relawan/emergencies/{$case->id}")->assertNotFound();
        $this->actingAs($other)->get("/relawan/emergencies/{$case->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Emergency', false)
            ->where('emergency.id', $case->id)
            ->missing('localEmergencyId')
            ->missing('emergency.status')
            ->missing('emergency.verifications')
            ->missing('emergency.referrals'));
    }

    public function test_local_lookup_shell_requires_authenticated_relawan(): void
    {
        $path = '/relawan/emergencies/'.Str::uuid();
        $this->getJson($path)->assertUnauthorized();
        foreach ([UserRole::ADMIN, UserRole::HEALTHCARE] as $role) {
            $user = User::factory()->create(['role' => $role, 'is_active' => true]);
            $this->actingAs($user)->getJson($path)->assertForbidden();
        }
    }
}
