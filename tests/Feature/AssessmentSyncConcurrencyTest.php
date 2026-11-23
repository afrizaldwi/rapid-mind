<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Sync\AssessmentSynchronizer;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class AssessmentSyncConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_and_missing_versions_conflict_but_exact_lost_response_replay_is_safe(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $payload = [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Sintetis'],
            'mode' => 'VERBAL',
            'status' => 'IN_PROGRESS',
            'srq_answers' => [1 => false, 17 => 'UNCLEAR']
        ];
        $first = $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()->json('assessment');
        $changed = array_replace($payload, ['base_version' => $first['server_version'], 'srq_answers' => [1 => true, 17 => 'UNANSWERED']]);
        $second = $this->postJson('/relawan/sync/assessments', $changed)->assertOk()->json('assessment');

        $this->assertNotSame($first['server_version'], $second['server_version']);
        $this->postJson('/relawan/sync/assessments', $changed)->assertOk()->assertJsonPath('replayed', true)
            ->assertJsonPath('assessment.server_version', $second['server_version']);

        $stale = array_replace($payload, ['base_version' => $first['server_version']]);
        $this->postJson('/relawan/sync/assessments', $stale)->assertConflict();
        unset($stale['base_version']);

        $this->postJson('/relawan/sync/assessments', $stale)->assertConflict();
        $this->assertSame($second['srq_answers'], app(AssessmentSynchronizer::class)->canonical(Assessment::findOrFail($payload['id']))['srq_answers']);
        $this->assertDatabaseCount('patients', 1);
        $this->assertDatabaseCount('assessments', 1);
        $this->assertDatabaseCount('triage_results', 0);
    }

    public function test_child_row_update_invalidates_an_outstanding_sync_version(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $payload = [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Sintetis'],
            'mode' => 'VERBAL',
            'status' => 'IN_PROGRESS',
            'risk_indicators' => ['R1' => false]
        ];
        $payload['base_version'] = $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()->json('assessment.server_version');
        $assessment = Assessment::findOrFail($payload['id']);
        $assessment->riskAssessment()->where('indicator', 'R1')->update(['answer' => true]);
        $this->postJson('/relawan/sync/assessments', $payload)->assertConflict();
        $this->assertTrue($assessment->riskAssessment()->firstOrFail()->answer);
    }

    public function test_legacy_writers_require_the_current_version_and_cannot_overwrite_a_newer_sync(): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $payload = [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Sintetis'],
            'mode' => 'VERBAL',
            'status' => 'IN_PROGRESS',
            'risk_indicators' => ['R1' => false]
        ];
        $old = $this->postJson('/relawan/sync/assessments', $payload)->assertCreated()->json('assessment.server_version');
        $risk = array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false);
        $url = "/relawan/assessment/{$payload['id']}";
        $this->postJson("$url/risk", ['risks' => $risk])->assertConflict();
        $this->postJson("$url/risk", ['risks' => $risk, 'base_version' => $old])->assertOk();
        $responses = array_map(fn($n) => ['question_number' => $n, 'answer' => false], range(1, 20));
        foreach (
            [
                'srq' => ['responses' => $responses],
                'risk' => ['risks' => $risk],
                'function' => ['functions' => ['F1' => 0, 'F2' => 0, 'F3' => 0]],
                'complete' => []
            ] as $step => $data
        ) {
            $this->postJson("$url/$step", [...$data, 'base_version' => $old])->assertConflict();
        }
        $this->assertDatabaseCount('srq_responses', 0);
        $this->assertDatabaseCount('function_responses', 0);
        $this->assertDatabaseCount('triage_results', 0);
    }
}
