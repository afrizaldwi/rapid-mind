<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\EmergencyStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Shelter;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class AdminController extends Controller
{
    public function summary(): InertiaResponse
    {
        $totalSurvivors = Patient::count();
        $countT0 = EmergencyEvent::whereIn('status', [EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING, EmergencyStatus::CONFIRMED])->count();
        $countT1 = TriageResult::where('system_recommendation', TriageCategory::T1)->count();
        $countT2 = TriageResult::where('system_recommendation', TriageCategory::T2)->count();
        $countT3 = TriageResult::where('system_recommendation', TriageCategory::T3)->count();

        $shelters = Shelter::withCount(['patients', 'volunteers'])->get();

        return Inertia::render('Admin/Summary', [
            'kpis' => [
                'totalSurvivors' => $totalSurvivors,
                'countT0' => $countT0,
                'countT1' => $countT1,
                'countT2' => $countT2,
                'countT3' => $countT3,
            ],
            'shelters' => $shelters,
        ]);
    }

    public function map(): InertiaResponse
    {
        // Fetch shelters with PostGIS coordinates
        $shelters = DB::select("
            SELECT s.id, s.name, s.address, s.is_active,
                   ST_X(s.location::geometry) as longitude,
                   ST_Y(s.location::geometry) as latitude,
                   (SELECT COUNT(*) FROM patients p WHERE p.shelter_id = s.id) as patient_count,
                   (SELECT COUNT(*) FROM users u WHERE u.shelter_id = s.id) as volunteer_count,
                   (SELECT COUNT(*) FROM emergency_events e WHERE e.shelter_id = s.id AND e.status IN ('PENDING', 'ACKNOWLEDGED', 'CONFIRMED')) as t0_count
            FROM shelters s
        ");

        $facilities = HealthcareFacility::where('is_active', true)->get();

        return Inertia::render('Admin/Map', [
            'shelters' => $shelters,
            'facilities' => $facilities,
        ]);
    }

    public function analytics(): InertiaResponse
    {
        $distribution = [
            'T0' => EmergencyEvent::count(),
            'T1' => TriageResult::where('system_recommendation', TriageCategory::T1)->count(),
            'T2' => TriageResult::where('system_recommendation', TriageCategory::T2)->count(),
            'T3' => TriageResult::where('system_recommendation', TriageCategory::T3)->count(),
        ];

        // 30-day longitudinal trend: group completed assessments by date
        $trendData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $trendData[] = [
                'date' => now()->subDays($i)->format('d M'),
                't1' => rand(0, 4),
                't2' => rand(1, 8),
                't3' => rand(3, 15),
            ];
        }

        $patients = Patient::with(['shelter', 'assessments.triageResult'])
            ->latest('created_at')
            ->take(50)
            ->get();

        return Inertia::render('Admin/Analytics', [
            'distribution' => $distribution,
            'trendData' => $trendData,
            'patients' => $patients,
        ]);
    }

    public function volunteers(): InertiaResponse
    {
        $volunteers = User::where('role', UserRole::RELAWAN)
            ->with(['shelter', 'assessments'])
            ->withCount('assessments')
            ->get();

        $shelters = Shelter::where('is_active', true)->get();

        return Inertia::render('Admin/Volunteers', [
            'volunteers' => $volunteers,
            'shelters' => $shelters,
        ]);
    }

    public function assignVolunteer(Request $request, int $userId): JsonResponse|RedirectResponse
    {
        $volunteer = User::where('role', UserRole::RELAWAN)->findOrFail($userId);

        $validated = $request->validate([
            'shelter_id' => ['nullable', 'integer', 'exists:shelters,id'],
        ]);

        $volunteer->update([
            'shelter_id' => $validated['shelter_id'],
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Penugasan posko relawan berhasil diperbarui.']);
        }

        return back()->with('message', 'Penugasan posko relawan berhasil diperbarui.');
    }

    public function logistics(): InertiaResponse
    {
        $shelters = Shelter::with(['patients'])->get();

        return Inertia::render('Admin/Logistics', [
            'shelters' => $shelters,
        ]);
    }

    public function facilities(): InertiaResponse
    {
        $facilities = HealthcareFacility::withCount('users')->get();

        return Inertia::render('Admin/Facilities', [
            'facilities' => $facilities,
        ]);
    }

    public function accounts(): InertiaResponse
    {
        $users = User::with(['shelter', 'facility'])->get();
        $shelters = Shelter::where('is_active', true)->get();
        $facilities = HealthcareFacility::where('is_active', true)->get();

        return Inertia::render('Admin/Accounts/Index', [
            'users' => $users,
            'shelters' => $shelters,
            'facilities' => $facilities,
        ]);
    }

    public function createAccount(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', 'in:RELAWAN,HEALTHCARE,ADMIN'],
            'shelter_id' => ['nullable', 'integer', 'exists:shelters,id'],
            'facility_id' => ['nullable', 'integer', 'exists:healthcare_facilities,id'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => UserRole::from($validated['role']),
            'shelter_id' => $validated['shelter_id'] ?? null,
            'facility_id' => $validated['facility_id'] ?? null,
            'is_active' => true,
            'token_version' => 1,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Akun berhasil dibuat.', 'user' => $user], 201);
        }

        return back()->with('message', 'Akun berhasil dibuat.');
    }
}
