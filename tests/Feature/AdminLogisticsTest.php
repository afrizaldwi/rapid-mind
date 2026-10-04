<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ResourceCategory;
use App\Enums\UserRole;
use App\Models\Patient;
use App\Models\Region;
use App\Models\ResourceAllocation;
use App\Models\ResourceNeed;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AdminLogisticsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);
        $this->actingAs($admin);

        return $admin;
    }

    private function shelter(bool $active = true, string $name = 'Posko Logistik'): Shelter
    {
        $region = Region::create(['name' => 'Wilayah Logistik '.uniqid()]);

        return Shelter::create([
            'region_id' => $region->id,
            'name' => $name,
            'address' => 'Jl. Bantuan',
            'is_active' => $active,
        ]);
    }

    public function test_index_renders_real_database_counts_needs_allocations_and_suggestions(): void
    {
        $admin = $this->admin();
        $shelter = $this->shelter();
        Patient::create(['name' => 'Penyintas Satu', 'shelter_id' => $shelter->id, 'created_by' => $admin->id]);
        Patient::create(['name' => 'Penyintas Dua', 'shelter_id' => $shelter->id, 'created_by' => $admin->id]);
        $need = ResourceNeed::create([
            'shelter_id' => $shelter->id,
            'category' => ResourceCategory::ESSENTIAL_CHRONIC_MEDICINE,
            'material_name' => 'Obat tekanan darah',
            'quantity_needed' => 5,
            'unit' => 'kotak',
            'notes' => 'Prioritas',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
        ResourceAllocation::create([
            'resource_need_id' => $need->id,
            'quantity_allocated' => 2,
            'allocated_by' => $admin->id,
        ]);
        $this->shelter(false, 'Posko Nonaktif');

        $this->get('/admin/logistics')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Logistics', false)
                ->has('categories', 3)
                ->where('shelters.0.id', $shelter->id)
                ->where('shelters.0.patients_count', 2)
                ->where('shelters.0.resource_needs.0.material_name', 'Obat tekanan darah')
                ->where('shelters.0.resource_needs.0.quantity_needed', '5')
                ->where('shelters.0.resource_needs.0.allocated_quantity', '2')
                ->where('shelters.0.resource_needs.0.remaining_quantity', '3')
                ->where('shelters.0.resource_needs.0.allocations.0.actor.name', $admin->name)
                ->where('materialSuggestions.ESSENTIAL_CHRONIC_MEDICINE.0', 'Obat tekanan darah')
                ->where('shelters.1.resource_needs', [])
                ->etc());
    }

    public function test_admin_can_create_update_and_allocate_a_resource_need_with_audit_history(): void
    {
        $admin = $this->admin();
        $shelter = $this->shelter();

        $this->post('/admin/logistics/needs', [
            'shelter_id' => $shelter->id,
            'category' => ResourceCategory::CHILD_FRIENDLY_KIT->value,
            'material_name' => '  Buku gambar  ',
            'quantity_needed' => '10.50',
            'unit' => '  paket  ',
            'notes' => '  Untuk ruang anak  ',
        ])->assertSessionHasNoErrors()->assertSessionHas('message');

        $need = ResourceNeed::firstOrFail();
        $this->assertSame('Buku gambar', $need->material_name);
        $this->assertSame('paket', $need->unit);
        $this->assertSame('Untuk ruang anak', $need->notes);
        $this->assertSame($admin->id, $need->created_by);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'RESOURCE_NEED_CREATED',
            'entity_id' => (string) $need->id,
            'actor_id' => $admin->id,
        ]);

        $this->put("/admin/logistics/needs/{$need->id}", [
            'category' => ResourceCategory::CHILD_FRIENDLY_KIT->value,
            'material_name' => 'Buku gambar',
            'quantity_needed' => 12,
            'unit' => 'paket',
            'notes' => 'Kebutuhan diperbarui',
        ])->assertSessionHasNoErrors();

        $this->assertSame('12.00', $need->fresh()->quantity_needed);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'RESOURCE_NEED_UPDATED',
            'entity_id' => (string) $need->id,
            'actor_id' => $admin->id,
        ]);

        $this->post("/admin/logistics/needs/{$need->id}/allocations", [
            'quantity_allocated' => 4.5,
        ])->assertSessionHasNoErrors()->assertSessionHas('message');

        $allocation = ResourceAllocation::firstOrFail();
        $this->assertSame('4.50', $allocation->quantity_allocated);
        $this->assertSame($admin->id, $allocation->allocated_by);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'RESOURCE_ALLOCATION_RECORDED',
            'entity_id' => (string) $allocation->id,
            'actor_id' => $admin->id,
        ]);
    }

    public function test_validation_protects_categories_positive_quantities_remaining_need_and_allocated_identity(): void
    {
        $admin = $this->admin();
        $shelter = $this->shelter();

        $this->post('/admin/logistics/needs', [
            'shelter_id' => $shelter->id,
            'category' => 'INVENTORY_OTHER',
            'material_name' => 'Barang uji',
            'quantity_needed' => 0,
            'unit' => 'paket',
        ])->assertSessionHasErrors(['category', 'quantity_needed']);

        $need = ResourceNeed::create([
            'shelter_id' => $shelter->id,
            'category' => ResourceCategory::ELDERLY_SANITATION_KIT,
            'material_name' => 'Sabun',
            'quantity_needed' => 10,
            'unit' => 'paket',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
        ResourceAllocation::create([
            'resource_need_id' => $need->id,
            'quantity_allocated' => 6,
            'allocated_by' => $admin->id,
        ]);

        $this->post("/admin/logistics/needs/{$need->id}/allocations", [
            'quantity_allocated' => 5,
        ])->assertSessionHasErrors('quantity_allocated');
        $this->assertSame(1, $need->allocations()->count());

        $this->put("/admin/logistics/needs/{$need->id}", [
            'category' => ResourceCategory::ELDERLY_SANITATION_KIT->value,
            'material_name' => 'Sabun lain',
            'quantity_needed' => 10,
            'unit' => 'paket',
        ])->assertSessionHasErrors('material_name');

        $this->put("/admin/logistics/needs/{$need->id}", [
            'category' => ResourceCategory::ELDERLY_SANITATION_KIT->value,
            'material_name' => 'Sabun',
            'quantity_needed' => 5,
            'unit' => 'paket',
        ])->assertSessionHasErrors('quantity_needed');

        $this->assertSame('Sabun', $need->fresh()->material_name);
        $this->assertSame('10.00', $need->fresh()->quantity_needed);
    }

    public function test_inactive_shelter_and_non_admin_cannot_mutate_logistics(): void
    {
        $this->admin();
        $inactiveShelter = $this->shelter(false);
        $payload = [
            'shelter_id' => $inactiveShelter->id,
            'category' => ResourceCategory::CHILD_FRIENDLY_KIT->value,
            'material_name' => 'Pensil warna',
            'quantity_needed' => 3,
            'unit' => 'paket',
        ];

        $this->post('/admin/logistics/needs', $payload)->assertSessionHasErrors('shelter_id');
        $this->assertDatabaseCount('resource_needs', 0);

        $relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($relawan)
            ->post('/admin/logistics/needs', $payload)
            ->assertRedirect('/relawan/home');
        $this->assertDatabaseCount('resource_needs', 0);
    }
}
