<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AdminBootstrapProvisioningTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        $this->actingAs($admin);
        return $admin;
    }

    private function region(): Region
    {
        return Region::create(['name' => 'Wilayah Uji']);
    }

    private function shelter(): Shelter
    {
        return Shelter::create(['name' => 'Posko Uji', 'region_id' => $this->region()->id, 'is_active' => true]);
    }

    private function facility(): HealthcareFacility
    {
        return HealthcareFacility::create(['name' => 'Faskes Uji', 'type' => 'Puskesmas', 'address' => 'Jl. Uji', 'is_active' => true]);
    }

    public function test_posko_lifecycle_and_deactivation_guard(): void
    {
        $this->admin();
        $region = $this->region();
        $this->get('/admin/operations/posko')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Admin/MasterData/Index', false)->where('kind', 'posko')->etc());
        $this->post('/admin/operations/posko', [
            'name' => 'Posko Baru', 'region_id' => $region->id, 'address' => 'Balai Desa',
            'latitude' => -7.7, 'longitude' => 110.4, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $shelter = Shelter::where('name', 'Posko Baru')->firstOrFail();
        $this->assertDatabaseHas('shelters', ['id' => $shelter->id, 'region_id' => $region->id]);
        $this->get("/admin/operations/posko/{$shelter->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('item.latitude', -7.7)->where('item.longitude', 110.4)->etc());
        $this->put("/admin/operations/posko/{$shelter->id}", [
            'name' => 'Posko Revisi', 'region_id' => $region->id, 'address' => 'Alamat Baru',
            'latitude' => -7.8, 'longitude' => 110.5, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertFalse($shelter->fresh()->is_active);
        $this->assertSame('Posko Revisi', $shelter->fresh()->name);
        $this->put("/admin/operations/posko/{$shelter->id}", [
            'name' => 'Posko Revisi', 'region_id' => $region->id, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        User::factory()->create(['role' => UserRole::RELAWAN, 'shelter_id' => $shelter->id, 'is_active' => true]);
        $this->put("/admin/operations/posko/{$shelter->id}", [
            'name' => 'Posko Revisi', 'region_id' => $region->id, 'is_active' => false,
        ])->assertSessionHasErrors('is_active');
        $this->assertTrue($shelter->fresh()->is_active);
    }

    public function test_faskes_lifecycle_and_deactivation_guard(): void
    {
        $this->admin();
        $this->get('/admin/facilities/organizations')->assertOk();
        $this->post('/admin/facilities/organizations', [
            'name' => 'Faskes Baru', 'type' => 'Rumah Sakit', 'address' => 'Jl. Baru', 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $facility = HealthcareFacility::where('name', 'Faskes Baru')->firstOrFail();
        $this->get('/admin/facilities/organizations')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/MasterData/Index', false)
            ->where('items.0.users_count', 0)
            ->etc());
        $this->put("/admin/facilities/organizations/{$facility->id}", [
            'name' => 'Faskes Revisi', 'type' => 'Puskesmas', 'address' => 'Jl. Revisi', 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertFalse($facility->fresh()->is_active);
        $this->put("/admin/facilities/organizations/{$facility->id}", [
            'name' => 'Faskes Revisi', 'type' => 'Puskesmas', 'address' => 'Jl. Revisi', 'is_active' => true,
        ])->assertSessionHasNoErrors();
        User::factory()->create(['role' => UserRole::HEALTHCARE, 'facility_id' => $facility->id, 'is_active' => true]);
        $this->put("/admin/facilities/organizations/{$facility->id}", [
            'name' => 'Faskes Revisi', 'type' => 'Puskesmas', 'address' => 'Jl. Revisi', 'is_active' => false,
        ])->assertSessionHasErrors('is_active');
        $this->assertTrue($facility->fresh()->is_active);
    }

    public function test_dedicated_relawan_provisioning_reassignment_and_history(): void
    {
        $this->admin();
        $first = $this->shelter();
        $second = Shelter::create(['name' => 'Posko Kedua', 'region_id' => $first->region_id, 'is_active' => true]);
        $this->post('/admin/volunteers', [
            'phone_number' => '081234567890',
            'name' => 'Relawan Baru', 'email' => 'relawan-baru@example.test',
            'password' => 'rahasia123', 'password_confirmation' => 'rahasia123',
            'shelter_id' => $first->id, 'is_active' => true, 'role' => 'ADMIN',
        ])->assertSessionHasNoErrors();
        $user = User::where('email', 'relawan-baru@example.test')->firstOrFail();
        $this->assertSame(UserRole::RELAWAN, $user->role);
        $this->assertTrue(Hash::check('rahasia123', $user->password));
        $this->assertSame($first->id, $user->shelter_id);
        $patient = Patient::create(['name' => 'Pasien Historis', 'created_by' => $user->id, 'shelter_id' => $first->id]);
        $assessment = Assessment::create([
            'patient_id' => $patient->id, 'user_id' => $user->id,
            'status' => AssessmentStatus::COMPLETED, 'mode' => AssessmentMode::VERBAL, 'completed_at' => now(),
        ]);
        $this->put("/admin/volunteers/{$user->id}", [
            'phone_number' => '081234567890',
            'name' => 'Relawan Revisi', 'email' => 'relawan-baru@example.test',
            'shelter_id' => $second->id, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertSame($second->id, $user->fresh()->shelter_id);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame($first->id, $patient->fresh()->shelter_id);
        $this->assertSame($user->id, $assessment->fresh()->user_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'VOLUNTEER_REASSIGNED', 'entity_id' => (string) $user->id]);
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'rahasia123'])->assertSessionHasErrors('email');
        $this->actingAs($this->admin());
        $this->put("/admin/volunteers/{$user->id}", [
            'phone_number' => '081234567890',
            'name' => 'Relawan Revisi', 'email' => $user->email,
            'shelter_id' => $second->id, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'rahasia123'])->assertRedirect('/relawan/home');
    }

    public function test_relawan_phone_is_required_normalized_and_invalid_values_are_rejected(): void
    {
        $this->admin();
        $shelter = $this->shelter();
        $payload = [
            'name' => 'Relawan Telepon', 'email' => 'telepon@example.test',
            'password' => 'rahasia123', 'password_confirmation' => 'rahasia123',
            'shelter_id' => $shelter->id, 'is_active' => true,
        ];
        $this->post('/admin/volunteers', $payload)->assertSessionHasErrors('phone_number');
        $this->post('/admin/volunteers', $payload + ['phone_number' => '123'])->assertSessionHasErrors('phone_number');
        $this->post('/admin/volunteers', $payload + ['phone_number' => '081234567890'])->assertSessionHasNoErrors();
        $volunteer = User::where('email', 'telepon@example.test')->firstOrFail();
        $this->assertSame('+6281234567890', $volunteer->phone_number);
        $this->put("/admin/volunteers/{$volunteer->id}", [
            'name' => $volunteer->name, 'email' => $volunteer->email,
            'shelter_id' => $shelter->id, 'is_active' => true,
            'phone_number' => '6281398765432',
        ])->assertSessionHasNoErrors();
        $this->assertSame('+6281398765432', $volunteer->fresh()->phone_number);
        $this->put("/admin/volunteers/{$volunteer->id}", [
            'name' => $volunteer->name, 'email' => $volunteer->email,
            'shelter_id' => $shelter->id, 'is_active' => true,
            'phone_number' => 'not-a-phone',
        ])->assertSessionHasErrors('phone_number');
        $this->assertSame('+6281398765432', $volunteer->fresh()->phone_number);
    }

    public function test_dedicated_healthcare_provisioning_reassignment_and_login(): void
    {
        $this->admin();
        $first = $this->facility();
        $second = HealthcareFacility::create(['name' => 'Faskes Kedua', 'type' => 'RS', 'address' => 'Jl. Dua', 'is_active' => true]);
        $this->post('/admin/facilities/users', [
            'name' => 'Nakes Baru', 'email' => 'nakes-baru@example.test',
            'password' => 'rahasia123', 'password_confirmation' => 'rahasia123',
            'facility_id' => $first->id, 'is_active' => true, 'role' => 'ADMIN',
        ])->assertSessionHasNoErrors();
        $user = User::where('email', 'nakes-baru@example.test')->firstOrFail();
        $this->assertSame(UserRole::HEALTHCARE, $user->role);
        $this->assertSame($first->id, $user->facility_id);
        $this->put("/admin/facilities/users/{$user->id}", [
            'name' => 'Nakes Revisi', 'email' => $user->email,
            'facility_id' => $second->id, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertSame($second->id, $user->fresh()->facility_id);
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'rahasia123'])->assertSessionHasErrors('email');
        $this->actingAs($this->admin());
        $this->put("/admin/facilities/users/{$user->id}", [
            'name' => 'Nakes Revisi', 'email' => $user->email,
            'facility_id' => $second->id, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'rahasia123'])->assertRedirect('/healthcare/emergencies');
    }

    public function test_inactive_assignments_and_missing_assignments_are_rejected(): void
    {
        $this->admin();
        $shelter = $this->shelter();
        $facility = $this->facility();
        $shelter->update(['is_active' => false]);
        $facility->update(['is_active' => false]);
        $this->get('/admin/volunteers/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/People/Form', false)
            ->where('currentInactiveAssignment', null)
            ->has('assignments', 0)
            ->etc());
        $this->get('/admin/facilities/users/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/People/Form', false)
            ->where('currentInactiveAssignment', null)
            ->has('assignments', 0)
            ->etc());
        $volunteer = ['phone_number' => '081234567890', 'name' => 'Relawan', 'email' => 'r@example.test', 'password' => 'rahasia123', 'password_confirmation' => 'rahasia123', 'is_active' => true];
        $healthcare = ['name' => 'Nakes', 'email' => 'h@example.test', 'password' => 'rahasia123', 'password_confirmation' => 'rahasia123', 'is_active' => true];
        $this->post('/admin/volunteers', $volunteer)->assertSessionHasErrors('shelter_id');
        $this->post('/admin/volunteers', $volunteer + ['shelter_id' => $shelter->id])->assertSessionHasErrors('shelter_id');
        $this->post('/admin/facilities/users', $healthcare)->assertSessionHasErrors('facility_id');
        $this->post('/admin/facilities/users', $healthcare + ['facility_id' => $facility->id])->assertSessionHasErrors('facility_id');
        $this->assertDatabaseMissing('users', ['email' => 'r@example.test']);
        $this->assertDatabaseMissing('users', ['email' => 'h@example.test']);
    }

    public function test_reassignment_rejects_inactive_target_and_duplicate_email(): void
    {
        $this->admin();
        $activeShelter = $this->shelter();
        $inactiveShelter = Shelter::create(['name' => 'Posko Tutup', 'region_id' => $activeShelter->region_id, 'is_active' => false]);
        $activeFacility = $this->facility();
        $inactiveFacility = HealthcareFacility::create(['name' => 'Faskes Tutup', 'type' => 'RS', 'address' => 'Jl. Tutup', 'is_active' => false]);
        $volunteer = User::factory()->create(['role' => UserRole::RELAWAN, 'shelter_id' => $activeShelter->id]);
        $healthcare = User::factory()->create(['role' => UserRole::HEALTHCARE, 'facility_id' => $activeFacility->id]);

        $this->put("/admin/volunteers/{$volunteer->id}", [
            'phone_number' => '081234567890',
            'name' => $volunteer->name, 'email' => $volunteer->email,
            'shelter_id' => $inactiveShelter->id, 'is_active' => true,
        ])->assertSessionHasErrors('shelter_id');
        $this->put("/admin/facilities/users/{$healthcare->id}", [
            'name' => $healthcare->name, 'email' => $healthcare->email,
            'facility_id' => $inactiveFacility->id, 'is_active' => true,
        ])->assertSessionHasErrors('facility_id');
        $this->put("/admin/volunteers/{$volunteer->id}", [
            'phone_number' => '081234567890',
            'name' => $volunteer->name, 'email' => $healthcare->email,
            'shelter_id' => $activeShelter->id, 'is_active' => true,
        ])->assertSessionHasErrors('email');
        $this->assertSame($activeShelter->id, $volunteer->fresh()->shelter_id);
        $this->assertSame($activeFacility->id, $healthcare->fresh()->facility_id);
    }

    public function test_inactive_relawan_can_retain_inactive_current_posko_but_cannot_reactivate_or_reassign_to_another_inactive_posko(): void
    {
        $this->admin();
        $current = $this->shelter();
        $active = Shelter::create(['name' => 'Posko Aktif', 'region_id' => $current->region_id, 'is_active' => true]);
        $otherInactive = Shelter::create(['name' => 'Posko Tutup Lain', 'region_id' => $current->region_id, 'is_active' => false]);
        $volunteer = User::factory()->create([
            'role' => UserRole::RELAWAN, 'shelter_id' => $current->id, 'is_active' => false,
        ]);
        $current->update(['is_active' => false]);

        $this->get("/admin/volunteers/{$volunteer->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/People/Form', false)
            ->where('user.shelter_id', $current->id)
            ->where('user.is_active', false)
            ->where('currentInactiveAssignment.id', $current->id)
            ->where('currentInactiveAssignment.name', $current->name)
            ->has('assignments', 1)
            ->where('assignments.0.id', $active->id)
            ->etc());

        $this->put("/admin/volunteers/{$volunteer->id}", [
            'phone_number' => '081234567890',
            'name' => 'Nama Diperbarui', 'email' => 'relawan-retained@example.test',
            'shelter_id' => $current->id, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', [
            'id' => $volunteer->id, 'name' => 'Nama Diperbarui',
            'email' => 'relawan-retained@example.test', 'shelter_id' => $current->id, 'is_active' => false,
        ]);

        $payload = ['phone_number' => '081234567890', 'name' => 'Nama Diperbarui', 'email' => 'relawan-retained@example.test'];
        $this->put("/admin/volunteers/{$volunteer->id}", $payload + [
            'shelter_id' => $current->id, 'is_active' => true,
        ])->assertSessionHasErrors('shelter_id');
        $this->put("/admin/volunteers/{$volunteer->id}", $payload + [
            'shelter_id' => $otherInactive->id, 'is_active' => false,
        ])->assertSessionHasErrors('shelter_id');
        $this->assertSame($current->id, $volunteer->fresh()->shelter_id);
        $this->assertFalse($volunteer->fresh()->is_active);

        $this->put("/admin/volunteers/{$volunteer->id}", $payload + [
            'shelter_id' => $active->id, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $this->assertSame($active->id, $volunteer->fresh()->shelter_id);
        $this->assertTrue($volunteer->fresh()->is_active);
    }

    public function test_inactive_healthcare_can_retain_inactive_current_faskes_but_cannot_reactivate_or_reassign_to_another_inactive_faskes(): void
    {
        $this->admin();
        $current = $this->facility();
        $active = HealthcareFacility::create(['name' => 'Faskes Aktif', 'type' => 'RS', 'address' => 'Jl. Aktif', 'is_active' => true]);
        $otherInactive = HealthcareFacility::create(['name' => 'Faskes Tutup Lain', 'type' => 'RS', 'address' => 'Jl. Tutup', 'is_active' => false]);
        $healthcare = User::factory()->create([
            'role' => UserRole::HEALTHCARE, 'facility_id' => $current->id, 'is_active' => false,
        ]);
        $current->update(['is_active' => false]);

        $this->get("/admin/facilities/users/{$healthcare->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/People/Form', false)
            ->where('user.facility_id', $current->id)
            ->where('user.is_active', false)
            ->where('currentInactiveAssignment.id', $current->id)
            ->where('currentInactiveAssignment.name', $current->name)
            ->has('assignments', 1)
            ->where('assignments.0.id', $active->id)
            ->etc());

        $this->put("/admin/facilities/users/{$healthcare->id}", [
            'name' => 'Nakes Diperbarui', 'email' => 'nakes-retained@example.test',
            'facility_id' => $current->id, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', [
            'id' => $healthcare->id, 'name' => 'Nakes Diperbarui',
            'email' => 'nakes-retained@example.test', 'facility_id' => $current->id, 'is_active' => false,
        ]);

        $payload = ['name' => 'Nakes Diperbarui', 'email' => 'nakes-retained@example.test'];
        $this->put("/admin/facilities/users/{$healthcare->id}", $payload + [
            'facility_id' => $current->id, 'is_active' => true,
        ])->assertSessionHasErrors('facility_id');
        $this->put("/admin/facilities/users/{$healthcare->id}", $payload + [
            'facility_id' => $otherInactive->id, 'is_active' => false,
        ])->assertSessionHasErrors('facility_id');
        $this->assertSame($current->id, $healthcare->fresh()->facility_id);
        $this->assertFalse($healthcare->fresh()->is_active);

        $this->put("/admin/facilities/users/{$healthcare->id}", $payload + [
            'facility_id' => $active->id, 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $this->assertSame($active->id, $healthcare->fresh()->facility_id);
        $this->assertTrue($healthcare->fresh()->is_active);
    }

    public function test_generic_admin_creation_route_is_gone_and_non_admin_cannot_provision(): void
    {
        $this->admin();
        $this->post('/admin/accounts', ['role' => 'ADMIN', 'name' => 'Another Admin'])->assertNotFound();
        $this->get('/admin/accounts')->assertNotFound();
        $relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($relawan)->postJson('/admin/facilities/users', [])->assertForbidden();
    }
}
