<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\Patient;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AdminAnalyticsIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $relawan;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-02 12:00:00');
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        $this->relawan = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($this->admin);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function patient(string $name): Patient
    {
        return Patient::create(['name' => $name, 'created_by' => $this->relawan->id]);
    }

    private function assessment(
        Patient $patient,
        TriageCategory $category,
        string $completedAt,
        int $score = 10,
        AssessmentStatus $status = AssessmentStatus::COMPLETED,
    ): Assessment {
        $assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $this->relawan->id,
            'status' => $status,
            'mode' => AssessmentMode::VERBAL,
            'completed_at' => $completedAt,
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'total_score' => $score,
            'system_recommendation' => $category,
        ]);

        return $assessment;
    }

    public function test_no_data_returns_thirty_zero_daily_buckets_and_real_zero_distribution(): void
    {
        $this->get('/admin/analytics')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Analytics', false)
            ->where('distribution', ['T0' => 0, 'T1' => 0, 'T2' => 0, 'T3' => 0])
            ->has('trendData', 30)
            ->where('trendData.0', ['date' => '2026-09-03', 't1' => 0, 't2' => 0, 't3' => 0])
            ->where('trendData.29', ['date' => '2026-10-02', 't1' => 0, 't2' => 0, 't3' => 0])
            ->has('patients', 0));
    }

    public function test_completed_triage_is_counted_on_its_completion_date_and_old_or_incomplete_records_are_excluded(): void
    {
        $patient = $this->patient('Pasien Tren');
        $this->assessment($patient, TriageCategory::T1, '2026-10-02 08:00:00');
        $this->assessment($patient, TriageCategory::T2, '2026-09-15 09:00:00');
        $this->assessment($patient, TriageCategory::T3, '2026-09-15 10:00:00');
        $this->assessment($patient, TriageCategory::T1, '2026-09-02 10:00:00');
        $this->assessment($patient, TriageCategory::T2, '2026-10-01 10:00:00', 12, AssessmentStatus::IN_PROGRESS);

        $this->get('/admin/analytics')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('distribution.T0', 0)
            ->where('distribution.T1', 2)
            ->where('distribution.T2', 1)
            ->where('distribution.T3', 1)
            ->where('trendData.12', ['date' => '2026-09-15', 't1' => 0, 't2' => 1, 't3' => 1])
            ->where('trendData.28', ['date' => '2026-10-01', 't1' => 0, 't2' => 0, 't3' => 0])
            ->where('trendData.29', ['date' => '2026-10-02', 't1' => 1, 't2' => 0, 't3' => 0])
            ->etc());
    }

    public function test_patient_contract_uses_latest_completed_triage_and_does_not_invent_t3_for_missing_result(): void
    {
        $withoutResult = $this->patient('Belum Dinilai');
        $withHistory = $this->patient('Ada Riwayat');
        $withoutResult->forceFill(['created_at' => now()->subMinute()])->save();
        $withHistory->forceFill(['created_at' => now()])->save();
        $this->assessment($withHistory, TriageCategory::T1, '2026-09-20 09:00:00', 17);
        $this->assessment($withHistory, TriageCategory::T2, '2026-10-01 09:00:00', 11);
        $this->assessment($withHistory, TriageCategory::T3, '2026-10-02 09:00:00', 2, AssessmentStatus::IN_PROGRESS);

        $this->get('/admin/analytics')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('patients', 2)
            ->where('patients.0.id', $withHistory->id)
            ->where('patients.0.latest_triage_result.system_recommendation', 'T2')
            ->where('patients.0.latest_triage_result.total_score', 11)
            ->where('patients.0.latest_triage_completed_at', '2026-10-01T09:00:00.000000Z')
            ->missing('patients.0.assessments')
            ->where('patients.1.id', $withoutResult->id)
            ->where('patients.1.latest_triage_result', null)
            ->where('patients.1.latest_triage_completed_at', null)
            ->missing('patients.1.assessments')
            ->etc());
    }
}
