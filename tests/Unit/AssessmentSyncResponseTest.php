<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Responses\AssessmentSyncResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use stdClass;

final class AssessmentSyncResponseTest extends TestCase
{
    public static function canonicalCases(): array
    {
        $assessment = [
            'id' => '00000000-0000-4000-8000-000000000001',
            'patient' => ['id' => '00000000-0000-4000-8000-000000000002', 'nik' => null, 'name' => 'Penyintas Sintetis', 'age' => 30, 'gender' => 'Perempuan', 'shelter_id' => null],
            'mode' => 'NON_VERBAL',
            'status' => 'IN_PROGRESS',
            'non_verbal_reasons' => [],
            'non_verbal_other_note' => null,
            'srq_answers' => [],
            'risk_indicators' => [],
            'function_domains' => [],
            'triage_result' => null,
            'started_at' => '2026-11-04T01:00:00+00:00',
            'completed_at' => null,
            'updated_at' => '2026-11-04T01:01:00+00:00',
        ];
        $partial = array_replace($assessment, [
            'srq_answers' => [1 => true, 2 => false, 17 => 'UNCLEAR', 20 => 'UNANSWERED'],
            'risk_indicators' => ['R1' => false],
            'function_domains' => ['F1' => 0],
            'non_verbal_reasons' => ['OTHER'],
            'non_verbal_other_note' => 'Pengamatan sintetis',
        ]);
        $completed = array_replace($assessment, [
            'status' => 'COMPLETED',
            'srq_answers' => array_fill_keys(range(1, 20), false),
            'risk_indicators' => array_fill_keys(['R1', 'R2', 'R3', 'R4', 'R5'], false),
            'function_domains' => ['F1' => 0, 'F2' => 0, 'F3' => 0],
            'triage_result' => ['srq_score' => 0, 'risk_score' => 0, 'function_score' => 0, 'total_score' => 0, 'system_recommendation' => 'T3', 'is_red_flag_override' => false, 'red_flag_source' => null],
            'completed_at' => '2026-11-04T01:10:00+00:00',
        ]);

        return ['empty' => [$assessment], 'partial' => [$partial], 'completed' => [$completed]];
    }

    #[DataProvider('canonicalCases')]
    public function test_raw_http_json_uses_objects_for_maps_without_mutating_internal_arrays(array $assessment): void
    {
        foreach ([true, false] as $created) {
            $result = ['assessment' => $assessment, 'created' => $created, 'replayed' => ! $created];
            $before = $result;
            $response = new AssessmentSyncResponse($result);
            $decoded = json_decode($response->getContent(), false, 512, JSON_THROW_ON_ERROR);
            $this->assertSame($created ? 201 : 200, $response->getStatusCode());
            $this->assertSame('application/json', $response->headers->get('Content-Type'));
            $this->assertSame(array_keys($assessment), array_keys(get_object_vars($decoded->assessment)));
            $this->assertSame($result, $before);
            foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
                $this->assertIsArray($result['assessment'][$field]);
                $this->assertInstanceOf(stdClass::class, $decoded->assessment->$field);
                $this->assertSame($assessment[$field], (array) $decoded->assessment->$field);
            }
            $this->assertSame($assessment['non_verbal_reasons'], $decoded->assessment->non_verbal_reasons);
            $this->assertSame($assessment['patient'], (array) $decoded->assessment->patient);
            $this->assertSame($assessment['triage_result'], $decoded->assessment->triage_result === null ? null : (array) $decoded->assessment->triage_result);
            $this->assertSame(! $created, $decoded->replayed);
        }
    }
}
