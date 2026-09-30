<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Assessment\AssessmentResume;
use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AssessmentResumeTest extends TestCase
{
    use RefreshDatabase;

    private Assessment $assessment;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($user);
        $patient = Patient::create(['name' => 'Pasien Resume', 'created_by' => $user->id]);
        $this->assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $user->id,
            'status' => AssessmentStatus::IN_PROGRESS,
            'mode' => AssessmentMode::VERBAL,
        ]);
    }

    private function assertResume(string $stage, string $label): void
    {
        $resume = app(AssessmentResume::class)->attach($this->assessment->fresh());
        $url = "/relawan/assessment/{$this->assessment->id}/{$stage}";

        $this->assertSame($stage, $resume->resume_stage);
        $this->assertSame($url, $resume->resume_url);
        $this->assertSame($label, $resume->resume_label);

        $this->get('/relawan/home')->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Home', false)
            ->where('activeDraft.resume_stage', $stage)
            ->where('activeDraft.resume_url', $url)
            ->where('activeDraft.resume_label', $label)
            ->etc());

        $this->get('/relawan/assessment')->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Assessment/Index', false)
            ->where('inProgressAssessments.0.resume_stage', $stage)
            ->where('inProgressAssessments.0.resume_url', $url)
            ->where('inProgressAssessments.0.resume_label', $label)
            ->etc());

        $this->get('/relawan/data')->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Data', false)
            ->where('inProgress.0.resume_stage', $stage)
            ->where('inProgress.0.resume_url', $url)
            ->where('inProgress.0.resume_label', $label)
            ->etc());
    }

    public function test_resume_follows_server_confirmed_stages_without_completing_assessment(): void
    {
        $this->assertResume('srq', 'Lanjutkan SRQ-20');

        $responses = array_map(fn ($number) => ['question_number' => $number, 'answer' => false], range(1, 20));
        $this->postJson("/relawan/assessment/{$this->assessment->id}/srq", ['responses' => $responses])->assertOk();
        $this->assertResume('risk', 'Lanjutkan Faktor Risiko');

        $risks = ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false];
        $this->postJson("/relawan/assessment/{$this->assessment->id}/risk", ['risks' => $risks])->assertOk();
        $this->assertResume('function', 'Lanjutkan Fungsi Harian');

        $functions = ['F1' => 0, 'F2' => 1, 'F3' => 3];
        $this->postJson("/relawan/assessment/{$this->assessment->id}/function", ['functions' => $functions])->assertOk();
        $this->assertResume('review', 'Tinjau Asesmen');

        $this->assertSame(AssessmentStatus::IN_PROGRESS, $this->assessment->fresh()->status);
        $this->assertSame(0, $this->assessment->triageResult()->count());
    }

    public function test_partial_risk_rows_do_not_advance_resume_stage(): void
    {
        $responses = array_map(fn ($number) => ['question_number' => $number, 'answer' => false], range(1, 20));
        $this->postJson("/relawan/assessment/{$this->assessment->id}/srq", ['responses' => $responses])->assertOk();
        $this->assessment->riskAssessment()->create(['indicator' => 'R1', 'answer' => false, 'weight' => 2]);
        $this->assessment->functionAssessment()->create(['domain' => 'F1', 'level' => 0]);

        $this->assertResume('risk', 'Lanjutkan Faktor Risiko');
    }

    public function test_invalid_function_level_does_not_advance_to_review(): void
    {
        $responses = array_map(fn ($number) => ['question_number' => $number, 'answer' => false], range(1, 20));
        $this->postJson("/relawan/assessment/{$this->assessment->id}/srq", ['responses' => $responses])->assertOk();
        $risks = ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false];
        $this->postJson("/relawan/assessment/{$this->assessment->id}/risk", ['risks' => $risks])->assertOk();

        foreach (['F1' => 0, 'F2' => 1, 'F3' => 2] as $domain => $level) {
            $this->assessment->functionAssessment()->create(compact('domain', 'level'));
        }

        $this->assertResume('function', 'Lanjutkan Fungsi Harian');
    }
}
