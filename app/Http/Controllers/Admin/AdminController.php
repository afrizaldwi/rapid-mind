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
    private const ACTIVE_T0_STATUSES = [
        EmergencyStatus::PENDING->value,
        EmergencyStatus::ACKNOWLEDGED->value,
        EmergencyStatus::REVIEWING->value,
        EmergencyStatus::CONFIRMED->value,
    ];

    public function summary(): InertiaResponse
    {
        $totalSurvivors = Patient::count();
        $countT0 = EmergencyEvent::whereIn('status', self::ACTIVE_T0_STATUSES)->count();
        $countT1 = TriageResult::where('system_recommendation', TriageCategory::T1)->count();
        $countT2 = TriageResult::where('system_recommendation', TriageCategory::T2)->count();
        $countT3 = TriageResult::where('system_recommendation', TriageCategory::T3)->count();

        $countT0Confirmed = EmergencyEvent::where('status', EmergencyStatus::CONFIRMED->value)->count();
        $countT1Validated = DB::table('clinical_validations')->where('clinical_result', TriageCategory::T1->value)->count();
        $countT2Validated = DB::table('clinical_validations')->where('clinical_result', TriageCategory::T2->value)->count();
        $countT3Validated = DB::table('clinical_validations')->where('clinical_result', TriageCategory::T3->value)->count();

        $totalConfirmed = $countT0Confirmed + $countT1Validated + $countT2Validated + $countT3Validated;
        if ($totalConfirmed === 0) {
            $totalConfirmed = $countT0 + $countT1 + $countT2 + $countT3;
        }

        $shelters = Shelter::withCount(['patients', 'volunteers'])->get();

        $shelterTriageCounts = DB::table('triage_results')
            ->join('assessments', 'assessments.id', '=', 'triage_results.assessment_id')
            ->join('patients', 'patients.id', '=', 'assessments.patient_id')
            ->where('assessments.status', AssessmentStatus::COMPLETED->value)
            ->whereNotNull('patients.shelter_id')
            ->selectRaw('patients.shelter_id, triage_results.system_recommendation, count(*) as aggregate')
            ->groupBy('patients.shelter_id', 'triage_results.system_recommendation')
            ->get();

        $shelterEmergencyCounts = DB::table('emergency_events')
            ->whereNotNull('shelter_id')
            ->whereIn('status', self::ACTIVE_T0_STATUSES)
            ->selectRaw('shelter_id, count(*) as aggregate')
            ->groupBy('shelter_id')
            ->get()
            ->keyBy('shelter_id');

        $shelters->each(function ($shelter) use ($shelterTriageCounts, $shelterEmergencyCounts) {
            $t0 = (int) ($shelterEmergencyCounts->get($shelter->id)?->aggregate ?? 0);
            $t1 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T1->value)->first()?->aggregate ?? 0);
            $t2 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T2->value)->first()?->aggregate ?? 0);
            $t3 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T3->value)->first()?->aggregate ?? 0);
            $shelter->setAttribute('t0_count', $t0);
            $shelter->setAttribute('t1_count', $t1);
            $shelter->setAttribute('t2_count', $t2);
            $shelter->setAttribute('t3_count', $t3);
            $shelter->setAttribute('total_cases', $t0 + $t1 + $t2 + $t3);
        });

        // 1. T0 Early Warning aggregate incidents (strictly anonymous without patient personal data)
        $t0Emergencies = EmergencyEvent::query()
            ->select(['id', 'shelter_id', 'status', 'created_at'])
            ->with('shelter:id,name')
            ->whereIn('status', self::ACTIVE_T0_STATUSES)
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")
            ->latest('created_at')
            ->take(6)
            ->get();

        // 2. Geospatial map shelter points (aggregate counts only)
        $activeT0Placeholders = implode(', ', array_fill(0, count(self::ACTIVE_T0_STATUSES), '?'));
        $mapShelters = DB::select("
            SELECT s.id, s.name, s.address, s.is_active,
                   ST_X(s.location::geometry) as longitude,
                   ST_Y(s.location::geometry) as latitude,
                   (SELECT COUNT(*) FROM patients p WHERE p.shelter_id = s.id) as patient_count,
                   (SELECT COUNT(*) FROM users u WHERE u.shelter_id = s.id AND u.role = 'RELAWAN') as volunteer_count,
                   (SELECT COUNT(*) FROM emergency_events e WHERE e.shelter_id = s.id AND e.status IN ({$activeT0Placeholders})) as t0_count
            FROM shelters s
        ", self::ACTIVE_T0_STATUSES);

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

        $emergencyTrendCounts = DB::table('emergency_events')
            ->whereBetween('created_at', [$trendStart, $today->copy()->endOfDay()])
            ->selectRaw('DATE(created_at) AS event_date, COUNT(*) AS aggregate')
            ->groupByRaw('DATE(created_at)')
            ->get()
            ->keyBy('event_date');

        $trendData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i)->format('Y-m-d');
            $trendData[] = [
                'date' => $date,
                't0' => (int) ($emergencyTrendCounts->get($date)?->aggregate ?? 0),
                't1' => (int) ($trendCounts->get($date.'|'.TriageCategory::T1->value)?->aggregate ?? 0),
                't2' => (int) ($trendCounts->get($date.'|'.TriageCategory::T2->value)?->aggregate ?? 0),
                't3' => (int) ($trendCounts->get($date.'|'.TriageCategory::T3->value)?->aggregate ?? 0),
            ];
        }

        $yesterday = $today->copy()->subDay()->format('Y-m-d');
        $todayStr = $today->format('Y-m-d');
        $kpiTrends = [
            't0Change' => (int) (($emergencyTrendCounts->get($todayStr)?->aggregate ?? 0) - ($emergencyTrendCounts->get($yesterday)?->aggregate ?? 0)),
            't1Change' => (int) (($trendCounts->get($todayStr.'|'.TriageCategory::T1->value)?->aggregate ?? 0) - ($trendCounts->get($yesterday.'|'.TriageCategory::T1->value)?->aggregate ?? 0)),
            't2Change' => (int) (($trendCounts->get($todayStr.'|'.TriageCategory::T2->value)?->aggregate ?? 0) - ($trendCounts->get($yesterday.'|'.TriageCategory::T2->value)?->aggregate ?? 0)),
            't3Change' => (int) (($trendCounts->get($todayStr.'|'.TriageCategory::T3->value)?->aggregate ?? 0) - ($trendCounts->get($yesterday.'|'.TriageCategory::T3->value)?->aggregate ?? 0)),
        ];

        $totalAssessments = Assessment::count();
        $activeShelters = Shelter::where('is_active', true)->count();
        $activeVolunteers = User::where('role', UserRole::RELAWAN)->where('is_active', true)->count();

        return Inertia::render('Admin/Summary', [
            'kpis' => [
                'totalConfirmed' => $totalConfirmed,
                'countT0' => $countT0,
                'countT0Confirmed' => $countT0Confirmed,
                'countT1' => $countT1,
                'countT2' => $countT2,
                'countT3' => $countT3,
                'totalSurvivors' => $totalSurvivors,
                'totalAssessments' => $totalAssessments,
                'activeShelters' => $activeShelters,
                'activeVolunteers' => $activeVolunteers,
            ],
            'kpiTrends' => $kpiTrends,
            'shelters' => $shelters,
            'mapShelters' => $mapShelters,
            't0Emergencies' => $t0Emergencies,
            'distribution' => $distribution,
            'trendData' => $trendData,
        ]);
    }

    public function map(): InertiaResponse
    {
        // Fetch shelters with PostGIS coordinates (aggregate counts only)
        $activeT0Placeholders = implode(', ', array_fill(0, count(self::ACTIVE_T0_STATUSES), '?'));
        $shelters = DB::select("
            SELECT s.id, s.name, s.address, s.is_active,
                   ST_X(s.location::geometry) as longitude,
                   ST_Y(s.location::geometry) as latitude,
                   (SELECT COUNT(*) FROM patients p WHERE p.shelter_id = s.id) as patient_count,
                   (SELECT COUNT(*) FROM users u WHERE u.shelter_id = s.id AND u.role = 'RELAWAN') as volunteer_count,
                   (SELECT COUNT(*) FROM emergency_events e WHERE e.shelter_id = s.id AND e.status IN ({$activeT0Placeholders})) as t0_count
            FROM shelters s
        ", self::ACTIVE_T0_STATUSES);

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

        // Aggregate shelter statistics - strictly zero individual patient PII
        $shelters = Shelter::query()
            ->select(['id', 'name', 'address', 'is_active'])
            ->withCount(['patients as patient_count', 'volunteers as volunteer_count'])
            ->get();

        $shelterTriageCounts = DB::table('triage_results')
            ->join('assessments', 'assessments.id', '=', 'triage_results.assessment_id')
            ->join('patients', 'patients.id', '=', 'assessments.patient_id')
            ->where('assessments.status', AssessmentStatus::COMPLETED->value)
            ->whereNotNull('patients.shelter_id')
            ->selectRaw('patients.shelter_id, triage_results.system_recommendation, count(*) as aggregate')
            ->groupBy('patients.shelter_id', 'triage_results.system_recommendation')
            ->get();

        $shelterEmergencyCounts = DB::table('emergency_events')
            ->whereNotNull('shelter_id')
            ->whereIn('status', self::ACTIVE_T0_STATUSES)
            ->selectRaw('shelter_id, count(*) as aggregate')
            ->groupBy('shelter_id')
            ->get()
            ->keyBy('shelter_id');

        $shelters->each(function ($shelter) use ($shelterTriageCounts, $shelterEmergencyCounts) {
            $t0 = (int) ($shelterEmergencyCounts->get($shelter->id)?->aggregate ?? 0);
            $t1 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T1->value)->first()?->aggregate ?? 0);
            $t2 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T2->value)->first()?->aggregate ?? 0);
            $t3 = (int) ($shelterTriageCounts->where('shelter_id', $shelter->id)->where('system_recommendation', TriageCategory::T3->value)->first()?->aggregate ?? 0);
            $shelter->setAttribute('t0_count', $t0);
            $shelter->setAttribute('t1_count', $t1);
            $shelter->setAttribute('t2_count', $t2);
            $shelter->setAttribute('t3_count', $t3);
            $shelter->setAttribute('total_cases', $t0 + $t1 + $t2 + $t3);
        });

        return Inertia::render('Admin/Analytics', [
            'distribution' => $distribution,
            'trendData' => $trendData,
            'shelters' => $shelters,
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
}
