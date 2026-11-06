<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Responses\SrqResponseMap;
use App\Models\SrqResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use PHPUnit\Framework\TestCase;

final class SrqResponseMapTest extends TestCase
{
    public function test_empty_srq_page_and_review_maps_serialize_as_objects(): void
    {
        foreach ([[], new Collection()] as $rows) {
            $map = SrqResponseMap::fromResponses($rows);
            $response = new JsonResponse(['responses' => $map, 'srqResponses' => $map]);

            self::assertSame('{"responses":{},"srqResponses":{}}', $response->getContent());
        }
    }

    public function test_populated_json_preserves_question_keys_and_all_four_states(): void
    {
        $rows = new Collection([
            new SrqResponse(['question_number' => 1, 'answer' => true]),
            new SrqResponse(['question_number' => 2, 'answer' => false]),
            new SrqResponse(['question_number' => 17, 'answer' => null, 'answer_state' => 'UNCLEAR']),
            new SrqResponse(['question_number' => 20, 'answer' => null, 'answer_state' => 'UNANSWERED']),
        ]);
        $response = new JsonResponse(['responses' => SrqResponseMap::fromResponses($rows)]);

        self::assertSame(
            '{"responses":{"1":true,"2":false,"17":"UNCLEAR","20":"UNANSWERED"}}',
            $response->getContent(),
        );
        $map = json_decode($response->getContent(), false, 512, JSON_THROW_ON_ERROR)->responses;
        self::assertInstanceOf(\stdClass::class, $map);
        self::assertSame(true, $map->{'1'});
        self::assertSame(false, $map->{'2'});
        self::assertSame('UNCLEAR', $map->{'17'});
        self::assertSame('UNANSWERED', $map->{'20'});
    }
}
