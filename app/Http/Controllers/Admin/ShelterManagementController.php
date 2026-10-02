<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\Rule;

final class ShelterManagementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/MasterData/Index', [
            'kind' => 'posko',
            'items' => Shelter::with('region')->withCount('volunteers')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return $this->form(null);
    }

    public function show(Shelter $shelter): Response
    {
        return $this->form($shelter);
    }

    private function form(?Shelter $shelter): Response
    {
        if ($shelter) {
            $coordinates = DB::selectOne('SELECT ST_X(location) AS longitude, ST_Y(location) AS latitude FROM shelters WHERE id = ?', [$shelter->id]);
            $shelter->setAttribute('longitude', $coordinates?->longitude);
            $shelter->setAttribute('latitude', $coordinates?->latitude);
        }

        return Inertia::render('Admin/MasterData/Form', [
            'kind' => 'posko',
            'item' => $shelter,
            'regions' => Region::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $shelter = DB::transaction(function () use ($data) {
            $shelter = Shelter::create([
                'name' => $data['name'],
                'region_id' => $data['region_id'],
                'address' => $data['address'] ?? null,
                'is_active' => $data['is_active'],
            ]);
            $this->saveLocation($shelter, $data);
            return $shelter;
        });

        return redirect("/admin/operations/posko/{$shelter->id}")->with('message', 'Posko berhasil dibuat.');
    }

    public function update(Request $request, Shelter $shelter): RedirectResponse
    {
        $data = $this->validated($request);
        DB::transaction(function () use ($shelter, $data): void {
            $shelter = Shelter::whereKey($shelter->id)->lockForUpdate()->firstOrFail();
            if (!$data['is_active'] && $shelter->is_active && User::where('role', UserRole::RELAWAN)
                ->where('shelter_id', $shelter->id)->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    'is_active' => 'Posko masih memiliki Relawan aktif. Pindahkan atau nonaktifkan Relawan terlebih dahulu.',
                ]);
            }
            $shelter->update([
                'name' => $data['name'],
                'region_id' => $data['region_id'],
                'address' => $data['address'] ?? null,
                'is_active' => $data['is_active'],
            ]);
            $this->saveLocation($shelter, $data);
        });

        return back()->with('message', 'Posko berhasil diperbarui.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'region_id' => ['required', 'integer', Rule::exists('regions', 'id')],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    private function saveLocation(Shelter $shelter, array $data): void
    {
        if (isset($data['latitude'], $data['longitude'])) {
            DB::update('UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?', [
                $data['longitude'], $data['latitude'], $shelter->id,
            ]);
        } else {
            DB::update('UPDATE shelters SET location = NULL WHERE id = ?', [$shelter->id]);
        }
    }
}
