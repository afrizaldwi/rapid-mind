<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\HealthcareFacility;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class FacilityManagementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/MasterData/Index', [
            'kind' => 'faskes',
            'items' => HealthcareFacility::withCount(['users as users_count' => fn ($query) => $query->where('role', UserRole::HEALTHCARE)])->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/MasterData/Form', ['kind' => 'faskes', 'item' => null]);
    }

    public function show(HealthcareFacility $facility): Response
    {
        return Inertia::render('Admin/MasterData/Form', ['kind' => 'faskes', 'item' => $facility]);
    }

    public function store(Request $request): RedirectResponse
    {
        $facility = HealthcareFacility::create($this->validated($request));

        return redirect("/admin/facilities/organizations/{$facility->id}")->with('message', 'Faskes berhasil dibuat.');
    }

    public function update(Request $request, HealthcareFacility $facility): RedirectResponse
    {
        $data = $this->validated($request);
        DB::transaction(function () use ($facility, $data): void {
            $facility = HealthcareFacility::whereKey($facility->id)->lockForUpdate()->firstOrFail();
            if (!$data['is_active'] && $facility->is_active && User::where('role', UserRole::HEALTHCARE)
                ->where('facility_id', $facility->id)->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    'is_active' => 'Faskes masih memiliki akun Healthcare aktif. Pindahkan atau nonaktifkan akun terlebih dahulu.',
                ]);
            }
            $facility->update($data);
        });

        return back()->with('message', 'Faskes berhasil diperbarui.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
