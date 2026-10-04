<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ResourceCategory;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ResourceAllocation;
use App\Models\ResourceNeed;
use App\Models\Shelter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class LogisticsController extends Controller
{
    public function index(): Response
    {
        $shelters = Shelter::query()
            ->withCount('patients')
            ->with([
                'resourceNeeds' => fn ($query) => $query
                    ->with(['allocations.actor:id,name'])
                    ->orderByDesc('updated_at'),
            ])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (Shelter $shelter): array => [
                'id' => $shelter->id,
                'name' => $shelter->name,
                'address' => $shelter->address,
                'is_active' => $shelter->is_active,
                'patients_count' => $shelter->patients_count,
                'resource_needs' => $shelter->resourceNeeds
                    ->map(fn (ResourceNeed $need): array => $this->serializeNeed($need))
                    ->values(),
            ]);

        $suggestions = collect(ResourceCategory::cases())
            ->mapWithKeys(fn (ResourceCategory $category): array => [
                $category->value => ResourceNeed::query()
                    ->where('category', $category->value)
                    ->select('material_name')
                    ->distinct()
                    ->orderBy('material_name')
                    ->pluck('material_name')
                    ->values(),
            ]);

        return Inertia::render('Admin/Logistics', [
            'shelters' => $shelters,
            'categories' => collect(ResourceCategory::cases())
                ->map(fn (ResourceCategory $category): array => [
                    'value' => $category->value,
                    'label' => $category->label(),
                ]),
            'materialSuggestions' => $suggestions,
        ]);
    }

    public function storeNeed(Request $request): RedirectResponse
    {
        $data = $this->validatedNeed($request);

        DB::transaction(function () use ($request, $data): void {
            $this->lockActiveShelter((int) $data['shelter_id']);

            $need = ResourceNeed::create([
                ...$data,
                'material_name' => trim($data['material_name']),
                'unit' => trim($data['unit']),
                'notes' => $this->nullableTrim($data['notes'] ?? null),
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            AuditLog::create([
                'actor_id' => $request->user()->id,
                'action' => 'RESOURCE_NEED_CREATED',
                'entity_type' => 'ResourceNeed',
                'entity_id' => (string) $need->id,
                'old_values' => null,
                'new_values' => $need->only(['shelter_id', 'category', 'material_name', 'quantity_needed', 'unit', 'notes']),
            ]);
        });

        return back()->with('message', 'Kebutuhan logistik berhasil dicatat.');
    }

    public function updateNeed(Request $request, ResourceNeed $resourceNeed): RedirectResponse
    {
        $data = $this->validatedNeed($request, false);

        DB::transaction(function () use ($request, $resourceNeed, $data): void {
            $need = ResourceNeed::whereKey($resourceNeed->id)->lockForUpdate()->firstOrFail();
            $this->lockActiveShelter($need->shelter_id);
            $allocatedUnits = $this->quantityUnits((string) $need->allocations()->sum('quantity_allocated'));

            if ($allocatedUnits > 0 && (
                $need->category->value !== $data['category']
                || $need->material_name !== trim($data['material_name'])
                || $need->unit !== trim($data['unit'])
            )) {
                throw ValidationException::withMessages([
                    'material_name' => 'Kategori, nama bahan, dan satuan tidak dapat diubah setelah alokasi dicatat.',
                ]);
            }

            if ($this->quantityUnits((string) $data['quantity_needed']) < $allocatedUnits) {
                throw ValidationException::withMessages([
                    'quantity_needed' => 'Jumlah kebutuhan tidak boleh lebih kecil dari total yang sudah dialokasikan.',
                ]);
            }

            $oldValues = $need->only(['category', 'material_name', 'quantity_needed', 'unit', 'notes']);
            $need->update([
                'category' => $data['category'],
                'material_name' => trim($data['material_name']),
                'quantity_needed' => $data['quantity_needed'],
                'unit' => trim($data['unit']),
                'notes' => $this->nullableTrim($data['notes'] ?? null),
                'updated_by' => $request->user()->id,
            ]);

            AuditLog::create([
                'actor_id' => $request->user()->id,
                'action' => 'RESOURCE_NEED_UPDATED',
                'entity_type' => 'ResourceNeed',
                'entity_id' => (string) $need->id,
                'old_values' => $oldValues,
                'new_values' => $need->only(['category', 'material_name', 'quantity_needed', 'unit', 'notes']),
            ]);
        });

        return back()->with('message', 'Kebutuhan logistik berhasil diperbarui.');
    }

    public function storeAllocation(Request $request, ResourceNeed $resourceNeed): RedirectResponse
    {
        $data = $request->validate([
            'quantity_allocated' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
        ]);

        DB::transaction(function () use ($request, $resourceNeed, $data): void {
            $need = ResourceNeed::whereKey($resourceNeed->id)->lockForUpdate()->firstOrFail();
            $this->lockActiveShelter($need->shelter_id);

            $neededUnits = $this->quantityUnits((string) $need->quantity_needed);
            $allocatedUnits = $this->quantityUnits((string) $need->allocations()->sum('quantity_allocated'));
            $newUnits = $this->quantityUnits((string) $data['quantity_allocated']);

            if ($newUnits > $neededUnits - $allocatedUnits) {
                throw ValidationException::withMessages([
                    'quantity_allocated' => 'Jumlah alokasi melebihi sisa kebutuhan.',
                ]);
            }

            $allocation = ResourceAllocation::create([
                'resource_need_id' => $need->id,
                'quantity_allocated' => $data['quantity_allocated'],
                'allocated_by' => $request->user()->id,
            ]);

            AuditLog::create([
                'actor_id' => $request->user()->id,
                'action' => 'RESOURCE_ALLOCATION_RECORDED',
                'entity_type' => 'ResourceAllocation',
                'entity_id' => (string) $allocation->id,
                'old_values' => null,
                'new_values' => [
                    'resource_need_id' => $need->id,
                    'quantity_allocated' => $allocation->quantity_allocated,
                ],
            ]);
        });

        return back()->with('message', 'Alokasi logistik berhasil dicatat.');
    }

    private function validatedNeed(Request $request, bool $withShelter = true): array
    {
        $rules = [
            'category' => ['required', Rule::enum(ResourceCategory::class)],
            'material_name' => ['required', 'string', 'max:150'],
            'quantity_needed' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
            'unit' => ['required', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];

        if ($withShelter) {
            $rules['shelter_id'] = ['required', 'integer', Rule::exists('shelters', 'id')];
        }

        return $request->validate($rules);
    }

    private function lockActiveShelter(int $shelterId): Shelter
    {
        $shelter = Shelter::whereKey($shelterId)->lockForUpdate()->firstOrFail();

        if (! $shelter->is_active) {
            throw ValidationException::withMessages([
                'shelter_id' => 'Kebutuhan dan alokasi baru hanya dapat dicatat untuk Posko aktif.',
            ]);
        }

        return $shelter;
    }

    private function serializeNeed(ResourceNeed $need): array
    {
        $allocated = $need->allocations->sum(fn (ResourceAllocation $allocation): float => (float) $allocation->quantity_allocated);
        $remaining = max(0, (float) $need->quantity_needed - $allocated);

        return [
            'id' => $need->id,
            'category' => $need->category->value,
            'material_name' => $need->material_name,
            'quantity_needed' => $this->formatQuantity((float) $need->quantity_needed),
            'unit' => $need->unit,
            'notes' => $need->notes,
            'allocated_quantity' => $this->formatQuantity($allocated),
            'remaining_quantity' => $this->formatQuantity($remaining),
            'updated_at' => $need->updated_at?->toIso8601String(),
            'allocations' => $need->allocations
                ->sortByDesc('created_at')
                ->map(fn (ResourceAllocation $allocation): array => [
                    'id' => $allocation->id,
                    'quantity_allocated' => $this->formatQuantity((float) $allocation->quantity_allocated),
                    'allocated_at' => $allocation->created_at?->toIso8601String(),
                    'actor' => $allocation->actor ? ['id' => $allocation->actor->id, 'name' => $allocation->actor->name] : null,
                ])
                ->values(),
        ];
    }

    private function quantityUnits(string $quantity): int
    {
        return (int) round((float) $quantity * 100);
    }

    private function formatQuantity(float $quantity): string
    {
        return rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.');
    }

    private function nullableTrim(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
