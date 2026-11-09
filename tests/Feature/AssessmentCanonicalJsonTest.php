<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Sync\AssessmentSynchronizer;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use stdClass;
use Tests\TestCase;

final class AssessmentCanonicalJsonTest extends TestCase
{
    use RefreshDatabase;

    public static function shapes(): array
    {
        return [['empty'], ['partial'], ['completed']];
    }

    #[DataProvider('shapes')]
    public function test_actual_sync_http_json_preserves_map_and_list_shapes_and_replay(string $shape): void
    {
        $this->actingAs(User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]));
        $data = [
            'id' => (string) Str::uuid(),
            'patient' => ['id' => (string) Str::uuid(), 'name' => 'Penyintas Sintetis JSON', 'age' => 30, 'gender' => 'Perempuan'],
            'mode' => 'NON_VERBAL',
            'status' => $shape === 'completed' ? 'COMPLETED' : 'IN_PROGRESS',
        ];
        if ($shape === 'partial') {
            $data += [
                'srq_answers' => [1 => true, 2 => false, 17 => 'UNCLEAR', 20 => 'UNANSWERED'],
                'risk_indicators' => ['R1' => false],
                'function_domains' => ['F1' => 0],
                'non_verbal_reasons' => ['OTHER'],
                'non_verbal_other_note' => 'Pengamatan sintetis',
            ];
        } elseif ($shape === 'completed') {
            $data += [
                'srq_answers' => array_fill_keys(range(1, 20), false),
                'risk_indicators' => array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false),
                'function_domains' => ['F1' => 0, 'F2' => 0, 'F3' => 0],
            ];
        }

        foreach ([201, 200] as $status) {
            $response = $this->postJson('/relawan/sync/assessments', $data)->assertStatus($status);
            // Associative decoding cannot distinguish empty {} from [].
            $body = json_decode($response->getContent(), false, 512, JSON_THROW_ON_ERROR);
            $canonical = $body->assessment;
            $this->assertEqualsCanonicalizing([
                'id',
                'patient',
                'mode',
                'status',
                'non_verbal_reasons',
                'non_verbal_other_note',
                'srq_answers',
                'risk_indicators',
                'function_domains',
                'triage_result',
                'started_at',
                'completed_at',
                'updated_at',
                'server_version',
                'routing_status',
            ], array_keys(get_object_vars($canonical)));
            $this->assertEqualsCanonicalizing(['id', 'nik', 'name', 'age', 'gender', 'shelter_id'], array_keys(get_object_vars($canonical->patient)));
            $this->assertSame($data['patient']['id'], $canonical->patient->id);
            $this->assertSame($data['patient']['name'], $canonical->patient->name);
            foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
                $this->assertInstanceOf(stdClass::class, $canonical->$field);
                $expected = $data[$field] ?? [];
                $actual = (array) $canonical->$field;
                ksort($expected);
                ksort($actual);
                $this->assertSame($expected, $actual);
            }
            $this->assertSame($data['non_verbal_reasons'] ?? [], $canonical->non_verbal_reasons);
            $this->assertSame($data['non_verbal_other_note'] ?? null, $canonical->non_verbal_other_note);
            $this->assertSame($status === 200, $body->replayed);
            if ($shape !== 'completed') {
                $this->assertNull($canonical->triage_result);
            }
            // Internal canonical values must stay arrays for matches()/ksort().
            $internal = app(AssessmentSynchronizer::class)->canonical(Assessment::findOrFail($data['id']));
            foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
                $this->assertIsArray($internal[$field]);
            }
        }
        $this->assertDatabaseCount('assessments', 1);
        $this->assertDatabaseCount('patients', 1);
        $this->assertSame(0, EmergencyEvent::count());
    }
}
