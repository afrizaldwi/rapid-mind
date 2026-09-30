<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\HealthcareFacility;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class ProvisioningController extends Controller
{
    public function createVolunteer(): Response { return $this->form('relawan', null); }
    public function createHealthcare(): Response { return $this->form('healthcare', null); }
    public function showVolunteer(int $userId): Response { return $this->form('relawan', $this->user($userId, UserRole::RELAWAN)); }
    public function showHealthcare(int $userId): Response { return $this->form('healthcare', $this->user($userId, UserRole::HEALTHCARE)); }

    public function healthcareUsers(): Response
    {
        return Inertia::render('Admin/People/Index', [
            'kind' => 'healthcare',
            'users' => User::where('role', UserRole::HEALTHCARE)->with('facility')->orderBy('name')->get(),
        ]);
    }

    private function form(string $kind, ?User $user): Response
    {
        $user?->load(['shelter', 'facility']);
        $currentAssignment = $kind === 'relawan' ? $user?->shelter : $user?->facility;

        return Inertia::render('Admin/People/Form', [
            'kind' => $kind,
            'user' => $user,
            'assignments' => $kind === 'relawan'
                ? Shelter::where('is_active', true)->orderBy('name')->get(['id', 'name'])
                : HealthcareFacility::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'currentInactiveAssignment' => $currentAssignment && ! $currentAssignment->is_active
                ? ['id' => $currentAssignment->id, 'name' => $currentAssignment->name]
                : null,
        ]);
    }

    private function user(int $id, UserRole $role): User
    {
        return User::where('role', $role)->findOrFail($id);
    }

    public function storeVolunteer(Request $request): RedirectResponse { return $this->store($request, UserRole::RELAWAN); }
    public function storeHealthcare(Request $request): RedirectResponse { return $this->store($request, UserRole::HEALTHCARE); }
    public function updateVolunteer(Request $request, int $userId): RedirectResponse { return $this->update($request, $this->user($userId, UserRole::RELAWAN)); }
    public function updateHealthcare(Request $request, int $userId): RedirectResponse { return $this->update($request, $this->user($userId, UserRole::HEALTHCARE)); }

    private function store(Request $request, UserRole $role): RedirectResponse
    {
        $data = $this->validated($request, $role, null);
        $field = $role === UserRole::RELAWAN ? 'shelter_id' : 'facility_id';
        $user = DB::transaction(function () use ($data, $role, $field): User {
            $this->assertActiveAssignment($role, (int) $data[$field]);
            return User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => $role,
                $field => $data[$field],
                'is_active' => $data['is_active'],
                'token_version' => 1,
            ]);
        });

        $path = $role === UserRole::RELAWAN ? 'volunteers' : 'facilities/users';
        return redirect("/admin/{$path}/{$user->id}")->with('message', 'Akun berhasil dibuat.');
    }

    private function update(Request $request, User $user): RedirectResponse
    {
        $role = $user->role;
        $data = $this->validated($request, $role, $user);
        $field = $role === UserRole::RELAWAN ? 'shelter_id' : 'facility_id';
        DB::transaction(function () use ($user, $data, $field, $role, $request): void {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            // A current inactive assignment may remain on an inactive account, but cannot be selected anew.
            if ((int) $user->$field !== (int) $data[$field] || $data['is_active']) {
                $this->assertActiveAssignment($role, (int) $data[$field]);
            }
            $oldAssignment = $user->$field;
            $user->update([
                'name' => $data['name'],
                'email' => $data['email'],
                $field => $data[$field],
                'is_active' => $data['is_active'],
            ]);
            if ((int) $oldAssignment !== (int) $data[$field]) {
                AuditLog::create([
                    'actor_id' => $request->user()->id,
                    'action' => $role === UserRole::RELAWAN ? 'VOLUNTEER_REASSIGNED' : 'HEALTHCARE_REASSIGNED',
                    'entity_type' => 'User',
                    'entity_id' => (string) $user->id,
                    'old_values' => [$field => $oldAssignment],
                    'new_values' => [$field => $data[$field]],
                ]);
            }
        });

        return back()->with('message', 'Akun berhasil diperbarui.');
    }

    private function validated(Request $request, UserRole $role, ?User $user): array
    {
        $field = $role === UserRole::RELAWAN ? 'shelter_id' : 'facility_id';
        $table = $role === UserRole::RELAWAN ? 'shelters' : 'healthcare_facilities';
        $rules = [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            $field => ['required', 'integer', Rule::exists($table, 'id')],
            'is_active' => ['required', 'boolean'],
        ];
        if (!$user) {
            $rules['password'] = ['required', 'string', 'min:8', 'confirmed'];
        }
        return $request->validate($rules);
    }

    private function assertActiveAssignment(UserRole $role, int $id): void
    {
        if ($role === UserRole::RELAWAN) {
            $active = Shelter::whereKey($id)->lockForUpdate()->where('is_active', true)->exists();
            $field = 'shelter_id';
            $message = 'Pilih Posko aktif untuk penugasan Relawan.';
        } else {
            $active = HealthcareFacility::whereKey($id)->lockForUpdate()->where('is_active', true)->exists();
            $field = 'facility_id';
            $message = 'Pilih Faskes aktif untuk penugasan Healthcare.';
        }
        if (!$active) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }
}
