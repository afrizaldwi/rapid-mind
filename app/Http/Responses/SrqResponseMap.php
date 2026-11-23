<?php

declare(strict_types=1);

namespace App\Http\Responses;

use App\Models\SrqResponse;
use stdClass;

final class SrqResponseMap
{
    /** @param iterable<SrqResponse> $responses */
    public static function fromResponses(iterable $responses): stdClass
    {
        $answers = [];
        foreach ($responses as $response) {
            $answers[$response->question_number] = $response->responseValue();
        }

        // HTTP maps must remain objects even when no responses have been saved.
        return (object) $answers;
    }
}
