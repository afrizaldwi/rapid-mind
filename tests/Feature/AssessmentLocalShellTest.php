<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AssessmentLocalShellTest extends TestCase
{
    use RefreshDatabase;

    private function relawan(): User
    {
        return User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
    }

    public function test_owned_server_stages_render_and_foreign_stages_and_mutations_are_rejected(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas Uji', 'created_by' => $owner->id]);
        $assessment = Assessment::create(['patient_id' => $patient->id, 'user_id' => $owner->id, 'status' => AssessmentStatus::IN_PROGRESS, 'mode' => AssessmentMode::VERBAL]);
        $base = "/relawan/assessment/{$assessment->id}";
        $this->actingAs($owner)->get("$base/srq")->assertInertia(fn (Assert $page) => $page->component('Relawan/Assessment/Srq', false)->where('assessment.id', $assessment->id)->etc());
        $this->actingAs($other);
        foreach (['identity', 'srq', 'risk', 'function', 'review', 'result'] as $stage) {
            $this->get("$base/$stage")->assertNotFound();
        }
        foreach (['srq' => ['responses' => []], 'risk' => ['risks' => []], 'function' => ['functions' => []], 'complete' => []] as $stage => $payload) {
            $this->postJson("$base/$stage", $payload)->assertNotFound();
        }
        $this->assertSame(0, $assessment->srqResponses()->count());
        $this->assertSame(AssessmentStatus::IN_PROGRESS, $assessment->fresh()->status);
    }

    public function test_valid_unknown_uuid_renders_all_local_shell_stages_without_creating_rows(): void
    {
        $owner = $this->relawan();
        $id = (string) Str::uuid();
        $this->actingAs($owner);
        foreach (['identity', 'srq', 'risk', 'function', 'review', 'result'] as $stage) {
            $this->get("/relawan/assessment/$id/$stage")->assertInertia(fn (Assert $page) => $page
                ->component('Relawan/Assessment/'.ucfirst($stage), false)
                ->where('assessment.id', $id)
                ->where('assessment.user_id', $owner->id)
                ->etc());
        }
        $this->get('/relawan/assessment/not-a-uuid/srq')->assertNotFound();
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('patients', 0);
    }

    public function test_interactive_creation_rejects_unrelated_existing_patient(): void
    {
        $owner = $this->relawan();
        $other = $this->relawan();
        $patient = Patient::create(['name' => 'Penyintas Relawan Lain', 'created_by' => $other->id]);
        $this->actingAs($owner)->postJson('/relawan/assessment', ['patient_id' => $patient->id])->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
    }
}
