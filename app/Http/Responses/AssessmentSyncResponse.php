<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

final class AssessmentSyncResponse extends JsonResponse
{
    public function __construct(array $result)
    {
        // Only the HTTP representation uses objects. Replay comparisons keep arrays.
        foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
            $result['assessment'][$field] = (object) $result['assessment'][$field];
        }

        parent::__construct($result, $result['created'] ? 201 : 200);
    }
}
