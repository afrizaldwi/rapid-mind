<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RelawanPatientOptionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_options_include_owned_and_same_posko_patients_only_without_mutation(): void
    {
        $region = Region::create(
            ['name' => 'Wilayah Sintetis']
        );
        $shelter = Shelter::create(
            ['region_id' => $region->id, 'name' => 'Posko Sintetis']
        );
        $otherShelter = Shelter::create(
            ['region_id' => $region->id, 'name' => 'Posko Lain']
        );
        $owner = User::factory()->create(

            ['role' => UserRole::RELAWAN, 'is_active' => true, 'shelter_id' => $shelter->id]
        );
        $other = User::factory()->create(
            ['role' => UserRole::RELAWAN, 'is_active' => true]
        );
        $owned = Patient::create(
            [
                'name' => 'Milik Relawan',
                'created_by' => $owner->id,
                'shelter_id' => $otherShelter->id
            ]
        );
        $shared = Patient::create(
            ['name' => 'Satu Posko', 'created_by' => $other->id, 'shelter_id' => $shelter->id]
        );
        $unrelated = Patient::create(
            ['name' => 'Tidak Terkait', 'created_by' => $other->id, 'shelter_id' => $otherShelter->id]
        );
        $before = Patient::orderBy('id')->get()->map->getAttributes()->all();

        $response = $this->actingAs($owner)->getJson('/relawan/patients/options')->assertOk()->assertJsonCount(2);
        $ids = array_column($response->json(), 'id');
        $this->assertEqualsCanonicalizing([$owned->id, $shared->id], $ids);
        $this->assertNotContains($unrelated->id, $ids);
        foreach ($response->json() as $patient) {
            $this->assertEqualsCanonicalizing(['id', 'name', 'nik', 'age', 'gender', 'shelter_id'], array_keys($patient));
        }
        $this->assertSame($before, Patient::orderBy('id')->get()->map->getAttributes()->all());
    }

    public function test_without_posko_only_own_patients_are_visible(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $other = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $owned = Patient::create(['name' => 'Milik Relawan', 'created_by' => $owner->id]);
        Patient::create(['name' => 'Milik Orang Lain', 'created_by' => $other->id]);

        $this->actingAs($owner)->getJson('/relawan/patients/options')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $owned->id);
    }

    public function test_wrong_role_and_unauthenticated_requests_are_rejected(): void
    {
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $this->actingAs($healthcare)->getJson('/relawan/patients/options')->assertForbidden();
        auth()->logout();
        $this->getJson('/relawan/patients/options')->assertUnauthorized();
        $this->assertDatabaseCount('patients', 0);
    }
}
