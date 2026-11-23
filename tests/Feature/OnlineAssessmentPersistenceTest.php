<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Sync\AssessmentSynchronizer;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

final class OnlineAssessmentPersistenceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_online_stage_receipts_advance_the_version_without_bypassing_conflicts(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($owner);
        $id = $this->postJson('/relawan/assessment', [
            'name' => '[SINTETIS] Uji asesmen online', 'mode' => 'VERBAL',
        ])->assertCreated()->json('assessment_id');
        $canonical = fn () => app(AssessmentSynchronizer::class)->canonical(Assessment::findOrFail($id));
        $initial = $canonical()['server_version'];
        $responses = array_map(fn ($number) => ['question_number' => $number, 'answer' => false], range(1, 20));
        $srq = $this->postJson("/relawan/assessment/$id/srq", [
            'responses' => $responses, 'base_version' => $initial,
        ])->assertOk()->json('server_version');
        $this->assertSame($canonical()['server_version'], $srq);
        $this->assertNotSame($initial, $srq);

        $risks = array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false);
        $this->postJson("/relawan/assessment/$id/risk", [
            'risks' => $risks, 'base_version' => $initial,
        ])->assertConflict();
        $this->assertSame($srq, $canonical()['server_version']);
        $risk = $this->postJson("/relawan/assessment/$id/risk", [
            'risks' => $risks, 'base_version' => $srq,
        ])->assertOk()->json('server_version');
        $this->assertSame($canonical()['server_version'], $risk);

        $function = $this->postJson("/relawan/assessment/$id/function", [
            'functions' => ['F1' => 0, 'F2' => 0, 'F3' => 0], 'base_version' => $risk,
        ])->assertOk()->json('server_version');
        $this->assertSame($canonical()['server_version'], $function);
        $this->postJson("/relawan/assessment/$id/complete", [
            'base_version' => $function,
        ])->assertOk()->assertJsonStructure(['result']);
        $this->postJson("/relawan/assessment/$id/srq", [
            'responses' => $responses, 'base_version' => $function,
        ])->assertConflict();
    }

    public function test_online_write_receipts_preserve_owner_authorization_and_require_a_base_version(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($owner);
        $id = $this->postJson('/relawan/assessment', [
            'name' => '[SINTETIS] Uji otorisasi online',
        ])->assertCreated()->json('assessment_id');
        $responses = array_map(fn ($number) => ['question_number' => $number, 'answer' => 'UNANSWERED'], range(1, 20));
        $this->postJson("/relawan/assessment/$id/srq", ['responses' => $responses])->assertConflict();
        $other = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($other);
        $this->postJson("/relawan/assessment/$id/srq", ['responses' => $responses])->assertNotFound();
    }
}
