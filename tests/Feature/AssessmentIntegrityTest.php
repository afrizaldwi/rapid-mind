<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AssessmentIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private Assessment $assessment;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($user);
        $patient = Patient::create(['name' => 'Pasien Demo', 'created_by' => $user->id]);
        $this->assessment = Assessment::create([
            'patient_id' => $patient->id,
            'user_id' => $user->id,
            'status' => AssessmentStatus::IN_PROGRESS,
            'mode' => AssessmentMode::VERBAL,
        ]);
    }

    private function url(string $step): string
    {
        return "/relawan/assessment/{$this->assessment->id}/{$step}";
    }

    private function srq(): array
    {
        return array_map(fn($number) => ['question_number' => $number, 'answer' => false], range(1, 20));
    }

    private function risk(): array
    {
        return ['R1' => false, 'R2' => false, 'R3' => false, 'R4' => false, 'R5' => false];
    }

    private function functionResponses(): array
    {
        return ['F1' => 0, 'F2' => 1, 'F3' => 3];
    }

    private function saveComplete(): void
    {
        $this->postJson($this->url('srq'), ['responses' => $this->srq()])->assertOk();
        $this->postJson($this->url('risk'), ['risks' => $this->risk()])->assertOk();
        $this->postJson($this->url('function'), ['functions' => $this->functionResponses()])->assertOk();
    }

    public function test_complete_srq_saves_twenty_answers(): void
    {
        $this->postJson($this->url('srq'), ['responses' => $this->srq()])->assertOk();
        $this->assertSame(20, $this->assessment->srqResponses()->count());
    }

    public function test_missing_srq_question_is_rejected_without_changing_saved_answers(): void
    {
        $this->postJson($this->url('srq'), ['responses' => $this->srq()])->assertOk();
        $this->postJson($this->url('srq'), ['responses' => array_slice($this->srq(), 0, 19)])->assertUnprocessable();
        $this->assertSame(20, $this->assessment->srqResponses()->count());
    }

    public function test_duplicate_srq_question_is_rejected(): void
    {
        $responses = $this->srq();
        $responses[19]['question_number'] = 1;
        $this->postJson($this->url('srq'), ['responses' => $responses])->assertUnprocessable();
        $this->assertSame(0, $this->assessment->srqResponses()->count());
    }

    public function test_out_of_range_srq_question_is_rejected(): void
    {
        $responses = $this->srq();
        $responses[19]['question_number'] = 21;
        $this->postJson($this->url('srq'), ['responses' => $responses])->assertUnprocessable();
    }

    public function test_malformed_srq_answer_is_rejected(): void
    {
        $responses = $this->srq();
        $responses[0]['answer'] = 'false';
        $this->postJson($this->url('srq'), ['responses' => $responses])->assertUnprocessable();
    }

    public function test_complete_risk_set_saves_five_answers(): void
    {
        $this->postJson($this->url('risk'), ['risks' => $this->risk()])->assertOk();
        $this->assertSame(5, $this->assessment->riskAssessment()->count());
    }

    public function test_missing_risk_indicator_is_rejected_without_changing_saved_answers(): void
    {
        $this->postJson($this->url('risk'), ['risks' => $this->risk()])->assertOk();
        $risk = $this->risk();
        unset($risk['R5']);
        $this->postJson($this->url('risk'), ['risks' => $risk])->assertUnprocessable();
        $this->assertSame(5, $this->assessment->riskAssessment()->count());
    }

    public function test_invalid_risk_indicator_and_answer_are_rejected(): void
    {
        $risk = $this->risk();
        $risk['R5'] = 'false';
        $this->postJson($this->url('risk'), ['risks' => $risk])->assertUnprocessable();
        $risk['R5'] = false;
        $risk['R6'] = true;
        $this->postJson($this->url('risk'), ['risks' => $risk])->assertUnprocessable();
    }

    public function test_complete_function_set_saves_allowed_levels(): void
    {
        $this->postJson($this->url('function'), ['functions' => $this->functionResponses()])->assertOk();
        $this->assertSame(3, $this->assessment->functionAssessment()->count());
    }

    public function test_invalid_function_level_is_rejected(): void
    {
        $functions = $this->functionResponses();
        $functions['F3'] = 2;
        $this->postJson($this->url('function'), ['functions' => $functions])->assertUnprocessable();
    }

    public function test_missing_function_domain_is_rejected_without_changing_saved_answers(): void
    {
        $this->postJson($this->url('function'), ['functions' => $this->functionResponses()])->assertOk();
        $functions = $this->functionResponses();
        unset($functions['F3']);
        $this->postJson($this->url('function'), ['functions' => $functions])->assertUnprocessable();
        $this->assertSame(3, $this->assessment->functionAssessment()->count());
    }

    public function test_completion_rejects_missing_srq(): void
    {
        $this->postJson($this->url('risk'), ['risks' => $this->risk()])->assertOk();
        $this->postJson($this->url('function'), ['functions' => $this->functionResponses()])->assertOk();
        $this->assertCompletionRejected();
    }

    public function test_completion_rejects_incomplete_risk(): void
    {
        $this->postJson($this->url('srq'), ['responses' => $this->srq()])->assertOk();
        $this->postJson($this->url('function'), ['functions' => $this->functionResponses()])->assertOk();
        $this->assessment->riskAssessment()->create(['indicator' => 'R1', 'answer' => false, 'weight' => 2]);
        $this->assertCompletionRejected();
    }

    public function test_completion_rejects_incomplete_function(): void
    {
        $this->postJson($this->url('srq'), ['responses' => $this->srq()])->assertOk();
        $this->postJson($this->url('risk'), ['risks' => $this->risk()])->assertOk();
        $this->assessment->functionAssessment()->create(['domain' => 'F1', 'level' => 0]);
        $this->assertCompletionRejected();
    }

    private function assertCompletionRejected(): void
    {
        $this->postJson($this->url('complete'))->assertUnprocessable();
        $this->assertSame(0, $this->assessment->triageResult()->count());
        $this->assertSame(AssessmentStatus::IN_PROGRESS, $this->assessment->fresh()->status);
    }

    public function test_complete_assessment_uses_server_calculation(): void
    {
        $this->saveComplete();
        $this->postJson($this->url('complete'), ['total_score' => 99, 'recommendation' => 'T0_CONFIRMED'])->assertOk();
        $result = $this->assessment->triageResult()->firstOrFail();
        $this->assertSame(4, $result->total_score);
        $this->assertSame(TriageCategory::T3, $result->system_recommendation);
        $this->assertSame(AssessmentStatus::COMPLETED, $this->assessment->fresh()->status);
    }
}
