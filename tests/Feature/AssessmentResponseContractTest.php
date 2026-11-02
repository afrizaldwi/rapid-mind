<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Assessment\AssessmentResume;
use App\Enums\AssessmentStatus;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\Patient;
use App\Models\SrqResponse;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class AssessmentResponseContractTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($this->owner);
    }

    private function payload(string $status = 'IN_PROGRESS'): array
    {
        return [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Penyintas Sintetis B2A'],
            'mode' => 'NON_VERBAL',
            'status' => $status,
            'srq_answers' => array_fill_keys(range(1, 20), false),
            'risk_indicators' => array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false),
            'function_domains' => ['F1' => 0, 'F2' => 1, 'F3' => 3],
        ];
    }

    public function test_historical_boolean_payload_and_rows_remain_compatible(): void
    {
        $data = $this->payload('COMPLETED');
        $data['srq_answers'][1] = true;
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated()
            ->assertJsonPath('assessment.srq_answers.1', true)
            ->assertJsonPath('assessment.srq_answers.17', false)
            ->assertJsonPath('assessment.non_verbal_reasons', [])
            ->assertJsonPath('assessment.triage_result.total_score', 5);
        $response = SrqResponse::where('assessment_id', $data['id'])->where('question_number', 1)->sole();
        $this->assertTrue($response->answer);
        $this->assertNull($response->answer_state);
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('replayed', true);
    }

    public function test_explicit_yes_and_no_complete_with_normalized_replay_and_no_emergency_creation(): void
    {
        $data = $this->payload('COMPLETED');
        $data['srq_answers'] = array_fill_keys(range(1, 20), 'NO');
        $data['srq_answers'][17] = 'YES';
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated()
            ->assertJsonPath('assessment.srq_answers.17', true)
            ->assertJsonPath('assessment.srq_answers.1', false)
            ->assertJsonPath('assessment.triage_result.srq_score', 1)
            ->assertJsonPath('assessment.triage_result.system_recommendation', 'T0_SUSPECT');
        $data['srq_answers'] = array_fill_keys(range(1, 20), false);
        $data['srq_answers'][17] = true;
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('replayed', true);
        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_additive_migration_preserves_historical_boolean_rows_without_rewriting_them(): void
    {
        $migration = require database_path('migrations/2026_11_03_000000_add_assessment_observations_and_srq_states.php');
        $migration->down(); // Only the already-guarded test database, inside its test transaction.
        $patient = Patient::create(['name' => 'Riwayat Sintetis', 'created_by' => $this->owner->id]);
        $assessment = Assessment::create(['patient_id' => $patient->id, 'user_id' => $this->owner->id, 'status' => 'IN_PROGRESS', 'mode' => 'VERBAL']);
        foreach ([1 => true, 17 => false] as $number => $answer) {
            SrqResponse::create(['assessment_id' => $assessment->id, 'question_number' => $number, 'answer' => $answer]);
        }
        $before = DB::table('srq_responses')->orderBy('id')->get()->map(fn($row) => (array) $row)->all();
        $migration->up();
        $after = DB::table('srq_responses')->orderBy('id')->get()->map(function ($row) {
            $values = (array) $row;
            $this->assertNull($values['answer_state']);
            unset($values['answer_state']);
            return $values;
        })->all();
        $this->assertSame($before, $after);
        $this->assertNull($assessment->fresh()->non_verbal_reasons);
    }

    public function test_multi_select_observations_survive_draft_updates_and_do_not_create_triage_or_t0(): void
    {
        $data = $this->payload();
        $data['non_verbal_reasons'] = ['SPEECH_DIFFICULTY', 'NOT_SPEAKING', 'OTHER'];
        $data['non_verbal_other_note'] = 'Pengamatan sintetis, tanpa diagnosis.';
        $data['srq_answers'] = [1 => true, 2 => false, 17 => 'UNCLEAR', 20 => 'UNANSWERED'];
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated()
            ->assertJsonPath('assessment.srq_answers.17', 'UNCLEAR')
            ->assertJsonPath('assessment.srq_answers.20', 'UNANSWERED')
            ->assertJsonPath('assessment.triage_result', null)
            ->assertJsonPath('assessment.non_verbal_reasons', ['NOT_SPEAKING', 'OTHER', 'SPEECH_DIFFICULTY']);
        $this->postJson('/relawan/sync/assessments', $data)->assertOk();
        unset($data['srq_answers'], $data['non_verbal_reasons'], $data['non_verbal_other_note']);
        $data['mode'] = 'VERBAL';
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()
            ->assertJsonPath('assessment.non_verbal_other_note', 'Pengamatan sintetis, tanpa diagnosis.')
            ->assertJsonPath('assessment.srq_answers.17', 'UNCLEAR');
        $this->assertSame(1, Assessment::count());
        $this->assertSame(4, SrqResponse::count());
        $this->assertSame(0, TriageResult::count());
        $this->assertSame(0, EmergencyEvent::count());
        $assessment = Assessment::findOrFail($data['id']);
        $this->assertSame('srq', (new AssessmentResume())->attach($assessment)->resume_stage);
        $q17 = $assessment->srqResponses()->where('question_number', 17)->sole();
        $this->assertNull($q17->answer);
        $this->assertSame('UNCLEAR', $q17->toArray()['answer_state']);
    }

    public static function validReasons(): array
    {
        return array_map(fn($code) => [[$code]], ['NOT_SPEAKING', 'SEVERE_DISTRESS', 'SPEECH_DIFFICULTY', 'HEARING_COMMUNICATION_BARRIER', 'CHOOSES_NOT_TO_SPEAK', 'UNKNOWN', 'OTHER']);
    }

    #[DataProvider('validReasons')]
    public function test_stable_observation_codes_are_accepted(array $reasons): void
    {
        $data = $this->payload();
        $data['non_verbal_reasons'] = $reasons;
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated()->assertJsonPath('assessment.non_verbal_reasons', $reasons);
    }

    public static function invalidReasons(): array
    {
        return [
            [['UNKNOWN', 'OTHER'], null],
            [['NOT_SPEAKING', 'NOT_SPEAKING'], null],
            [['DIAGNOSED_MUTISM'], null],
            [['NOT_SPEAKING'], 'Tidak boleh tanpa OTHER'],
            [['OTHER'], str_repeat('a', 501)],
            ['NOT_SPEAKING', null],
            [[0 => 'OTHER', 2 => 'NOT_SPEAKING'], null],
        ];
    }

    #[DataProvider('invalidReasons')]
    public function test_invalid_observations_are_rejected_atomically(mixed $reasons, ?string $note): void
    {
        $data = $this->payload();
        $data['non_verbal_reasons'] = $reasons;
        $data['non_verbal_other_note'] = $note;
        $this->postJson('/relawan/sync/assessments', $data)->assertUnprocessable();
        $this->assertSame(0, Assessment::count());
        $this->assertSame(0, Patient::count());
    }

    public function test_note_requires_reason_set_and_explicit_empty_reasons_clear_metadata(): void
    {
        $data = $this->payload();
        $data['non_verbal_other_note'] = 'Catatan sintetis';
        $this->postJson('/relawan/sync/assessments', $data)->assertUnprocessable();
        $data['non_verbal_reasons'] = ['OTHER'];
        $data['non_verbal_other_note'] = str_repeat('a', 500);
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $data['non_verbal_reasons'] = [];
        unset($data['non_verbal_other_note']);
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()
            ->assertJsonPath('assessment.non_verbal_reasons', [])
            ->assertJsonPath('assessment.non_verbal_other_note', null);
    }

    public static function unresolved(): array
    {
        return [['UNCLEAR'], ['UNANSWERED']];
    }

    #[DataProvider('unresolved')]
    public function test_completion_rejects_unresolved_answers_in_both_sync_and_legacy_paths(string $state): void
    {
        $data = $this->payload();
        $data['srq_answers'][17] = $state;
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $data['status'] = 'COMPLETED';
        $this->postJson('/relawan/sync/assessments', $data)->assertUnprocessable();
        $this->postJson("/relawan/assessment/{$data['id']}/complete")->assertUnprocessable();
        $this->assertSame(AssessmentStatus::IN_PROGRESS, Assessment::sole()->status);
        $this->assertSame(0, TriageResult::count());
        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_explicit_clearing_is_durable_and_omission_cannot_restore_an_old_answer(): void
    {
        $data = $this->payload();
        $data['srq_answers'] = [1 => true, 17 => true];
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $data['srq_answers'] = [17 => 'UNANSWERED'];
        foreach (range(1, 2) as $_) {
            $this->postJson('/relawan/sync/assessments', $data)->assertOk()
                ->assertJsonPath('assessment.srq_answers.1', true)
                ->assertJsonPath('assessment.srq_answers.17', 'UNANSWERED');
        }
        unset($data['srq_answers']);
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('assessment.srq_answers.17', 'UNANSWERED');
        $q17 = SrqResponse::where('question_number', 17)->sole();
        $this->assertNull($q17->answer);
        $this->assertSame('UNANSWERED', $q17->answer_state);
        $data['srq_answers'] = [17 => 'NO'];
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('assessment.srq_answers.17', false);
        $this->assertNull($q17->fresh()->answer_state);
    }

    public function test_observations_do_not_affect_scores_and_completed_replays_compare_explicit_metadata(): void
    {
        $data = $this->payload('COMPLETED');
        $data['non_verbal_reasons'] = ['OTHER', 'NOT_SPEAKING'];
        $data['non_verbal_other_note'] = 'Pengamatan sintetis';
        $first = $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $data['non_verbal_reasons'] = ['NOT_SPEAKING', 'OTHER'];
        $data['srq_answers'] = array_fill_keys(range(1, 20), 'NO');
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('replayed', true);
        $changed = $data;
        $changed['non_verbal_other_note'] = 'Berbeda';
        $this->postJson('/relawan/sync/assessments', $changed)->assertConflict();
        $changed['non_verbal_reasons'] = [];
        unset($changed['non_verbal_other_note']);
        $this->postJson('/relawan/sync/assessments', $changed)->assertConflict();
        unset($data['non_verbal_reasons'], $data['non_verbal_other_note']);
        $this->postJson('/relawan/sync/assessments', $data)->assertOk()->assertJsonPath('assessment.non_verbal_other_note', 'Pengamatan sintetis');
        $baseline = $this->postJson('/relawan/sync/assessments', $this->payload('COMPLETED'))->assertCreated();
        $this->assertSame($baseline->json('assessment.triage_result'), $first->json('assessment.triage_result'));
        $this->assertSame(0, EmergencyEvent::count());
    }

    public function test_legacy_srq_accepts_states_but_all_legacy_writes_reject_completed_assessments(): void
    {
        $data = $this->payload();
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $responses = array_map(fn($n) => ['question_number' => $n, 'answer' => $n === 17 ? 'UNCLEAR' : false], range(1, 20));
        $url = "/relawan/assessment/{$data['id']}";
        $this->postJson("$url/srq", ['responses' => $responses, 'non_verbal_reasons' => ['UNKNOWN']])->assertOk();
        $this->assertNull(SrqResponse::where('question_number', 17)->sole()->answer);
        $this->postJson("$url/complete")->assertUnprocessable();
        $responses[16]['answer'] = false;
        $this->postJson("$url/srq", ['responses' => $responses])->assertOk();
        $this->postJson("$url/complete")->assertOk();
        $before = Assessment::sole()->toArray();
        $score = TriageResult::sole()->toArray();
        $responses[0]['answer'] = true;
        $this->postJson("$url/srq", ['responses' => $responses, 'mode' => 'VERBAL', 'non_verbal_reasons' => []])->assertConflict();
        $this->postJson("$url/risk", ['risks' => $data['risk_indicators']])->assertConflict();
        $this->postJson("$url/function", ['functions' => $data['function_domains']])->assertConflict();
        $this->postJson("$url/complete")->assertConflict();
        $this->assertSame($before, Assessment::sole()->toArray());
        $this->assertSame($score, TriageResult::sole()->toArray());
        $this->assertFalse(SrqResponse::where('question_number', 1)->sole()->answer);
    }

    #[DataProvider('invalidAnswerValues')]
    public function test_malformed_values_cannot_become_yes_in_either_endpoint(mixed $value): void
    {
        $data = $this->payload();
        $data['srq_answers'][17] = $value;
        $this->postJson('/relawan/sync/assessments', $data)->assertUnprocessable();
        $data['srq_answers'][17] = false;
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $responses = array_map(fn($n) => ['question_number' => $n, 'answer' => $n === 17 ? $value : false], range(1, 20));
        $this->postJson("/relawan/assessment/{$data['id']}/srq", ['responses' => $responses])->assertUnprocessable();
        $this->assertFalse(SrqResponse::where('question_number', 17)->sole()->answer);
    }

    public static function invalidAnswerValues(): array
    {
        return [[0], [1], ['0'], ['1'], ['false'], ['true'], ['maybe'], [''], [null], [[]], [['YES']]];
    }

    public function test_owner_and_role_boundaries_are_preserved(): void
    {
        $data = $this->payload();
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $this->postJson('/relawan/sync/assessments', $data)->assertConflict();
        $this->postJson("/relawan/assessment/{$data['id']}/srq", [])->assertNotFound();
        foreach ([UserRole::HEALTHCARE, UserRole::ADMIN] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role, 'is_active' => true]));
            $this->postJson('/relawan/sync/assessments', $data)->assertForbidden();
            $this->postJson("/relawan/assessment/{$data['id']}/srq", [])->assertForbidden();
        }
        $this->assertSame($this->owner->id, Assessment::sole()->user_id);
        $this->assertSame(1, Assessment::count());
    }

    public function test_database_constraint_rejects_contradictory_response_without_altering_history(): void
    {
        $data = $this->payload();
        $this->postJson('/relawan/sync/assessments', $data)->assertCreated();
        foreach ([[true, 'UNCLEAR'], [null, null], [null, 'YES'], [false, 'UNANSWERED']] as [$answer, $state]) {
            try {
                DB::transaction(fn() => DB::table('srq_responses')->where('assessment_id', $data['id'])->where('question_number', 17)->update(['answer' => $answer, 'answer_state' => $state]));
                $this->fail('Database accepted an invalid SRQ state.');
            } catch (QueryException $exception) {
                $this->assertSame('23514', $exception->getCode());
            }
        }
        $this->assertFalse(SrqResponse::where('question_number', 17)->sole()->answer);
    }
}
