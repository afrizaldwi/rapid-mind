<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\EmergencyStatus;
use App\Enums\AssessmentStatus;
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
use Illuminate\Support\Facades\DB;
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

        // 1. T0 Early Warning active cases (max 6)
        $t0Emergencies = EmergencyEvent::with([
            'patient.shelter',
            'assessment.triageResult',
            'shelter',
            'user:id,name',
        ])
            ->whereIn('status', [EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING, EmergencyStatus::CONFIRMED])
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")
            ->latest('created_at')
            ->take(6)
            ->get();

        // 2. Geospatial map shelter points
        $mapShelters = DB::select("
            SELECT s.id, s.name, s.address, s.is_active,
                   ST_X(s.location::geometry) as longitude,
                   ST_Y(s.location::geometry) as latitude,
                   (SELECT COUNT(*) FROM patients p WHERE p.shelter_id = s.id) as patient_count,
                   (SELECT COUNT(*) FROM users u WHERE u.shelter_id = s.id) as volunteer_count,
                   (SELECT COUNT(*) FROM emergency_events e WHERE e.shelter_id = s.id AND e.status IN ('PENDING', 'ACKNOWLEDGED', 'CONFIRMED')) as t0_count
            FROM shelters s
        ");

        // 3. Triage distribution
        $completedTriage = TriageResult::query()
            ->whereHas('assessment', fn ($query) => $query->where('status', AssessmentStatus::COMPLETED));
        $distribution = [
            'T0' => $countT0,
            'T1' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T1)->count(),
            'T2' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T2)->count(),
            'T3' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T3)->count(),
        ];

        // 4. 30-day Trend data
        $today = now()->startOfDay();
        $trendStart = $today->copy()->subDays(29);
        $trendCounts = TriageResult::query()
            ->join('assessments', 'assessments.id', '=', 'triage_results.assessment_id')
            ->where('assessments.status', AssessmentStatus::COMPLETED->value)
            ->whereBetween('assessments.completed_at', [$trendStart, $today->copy()->endOfDay()])
            ->whereIn('triage_results.system_recommendation', [
                TriageCategory::T1->value,
                TriageCategory::T2->value,
                TriageCategory::T3->value,
            ])
            ->selectRaw('DATE(assessments.completed_at) AS completion_date, triage_results.system_recommendation, COUNT(*) AS aggregate')
            ->groupByRaw('DATE(assessments.completed_at), triage_results.system_recommendation')
            ->get()
            ->keyBy(fn ($row) => $row->completion_date.'|'.$row->system_recommendation->value);

        $trendData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i)->format('Y-m-d');
            $trendData[] = [
                'date' => $date,
                't1' => (int) ($trendCounts->get($date.'|'.TriageCategory::T1->value)?->aggregate ?? 0),
                't2' => (int) ($trendCounts->get($date.'|'.TriageCategory::T2->value)?->aggregate ?? 0),
                't3' => (int) ($trendCounts->get($date.'|'.TriageCategory::T3->value)?->aggregate ?? 0),
            ];
        }

        $totalAssessments = Assessment::count();

        return Inertia::render('Admin/Summary', [
            'kpis' => [
                'totalSurvivors' => $totalSurvivors,
                'countT0' => $countT0,
                'countT1' => $countT1,
                'countT2' => $countT2,
                'countT3' => $countT3,
                'totalAssessments' => $totalAssessments,
            ],
            'shelters' => $shelters,
            'mapShelters' => $mapShelters,
            't0Emergencies' => $t0Emergencies,
            'distribution' => $distribution,
            'trendData' => $trendData,
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
        $completedTriage = TriageResult::query()
            ->whereHas('assessment', fn ($query) => $query->where('status', AssessmentStatus::COMPLETED));
        $distribution = [
            'T0' => EmergencyEvent::count(),
            'T1' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T1)->count(),
            'T2' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T2)->count(),
            'T3' => (clone $completedTriage)->where('system_recommendation', TriageCategory::T3)->count(),
        ];

        $today = now()->startOfDay();
        $trendStart = $today->copy()->subDays(29);
        $trendCounts = TriageResult::query()
            ->join('assessments', 'assessments.id', '=', 'triage_results.assessment_id')
            ->where('assessments.status', AssessmentStatus::COMPLETED->value)
            ->whereBetween('assessments.completed_at', [$trendStart, $today->copy()->endOfDay()])
            ->whereIn('triage_results.system_recommendation', [
                TriageCategory::T1->value,
                TriageCategory::T2->value,
                TriageCategory::T3->value,
            ])
            ->selectRaw('DATE(assessments.completed_at) AS completion_date, triage_results.system_recommendation, COUNT(*) AS aggregate')
            ->groupByRaw('DATE(assessments.completed_at), triage_results.system_recommendation')
            ->get()
            ->keyBy(fn ($row) => $row->completion_date.'|'.$row->system_recommendation->value);

        $trendData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i)->format('Y-m-d');
            $trendData[] = [
                'date' => $date,
                't1' => (int) ($trendCounts->get($date.'|'.TriageCategory::T1->value)?->aggregate ?? 0),
                't2' => (int) ($trendCounts->get($date.'|'.TriageCategory::T2->value)?->aggregate ?? 0),
                't3' => (int) ($trendCounts->get($date.'|'.TriageCategory::T3->value)?->aggregate ?? 0),
            ];
        }

        $patients = Patient::with([
            'shelter',
            'assessments' => fn ($query) => $query
                ->where('status', AssessmentStatus::COMPLETED)
                ->whereNotNull('completed_at')
                ->whereHas('triageResult')
                ->with('triageResult')
                ->orderByDesc('completed_at')
                ->orderByDesc('created_at'),
        ])
            ->latest('created_at')
            ->take(50)
            ->get()
            ->map(function (Patient $patient): Patient {
                $latestAssessment = $patient->assessments->first();
                $patient->setAttribute('latest_triage_result', $latestAssessment?->triageResult);
                $patient->setAttribute('latest_triage_completed_at', $latestAssessment?->completed_at);
                $patient->unsetRelation('assessments');

                return $patient;
            });

        return Inertia::render('Admin/Analytics', [
            'distribution' => $distribution,
            'trendData' => $trendData,
            'patients' => $patients,
        ]);
    }

    public function volunteers(): InertiaResponse
    {
        $volunteers = User::where('role', UserRole::RELAWAN)
            ->with('shelter')
            ->withCount('assessments')
            ->get();

        return Inertia::render('Admin/People/Index', ['kind' => 'relawan', 'users' => $volunteers]);
    }

    public function logistics(): InertiaResponse
    {
        $shelters = Shelter::with(['patients'])->get();

        return Inertia::render('Admin/Logistics', [
            'shelters' => $shelters,
        ]);
    }

}
