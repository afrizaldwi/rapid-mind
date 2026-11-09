<?php

declare(strict_types=1);

namespace App\Domain\Sync;

/** Content version includes child rows, so legacy writes also invalidate it. */
final class AssessmentVersion
{
    public static function of(array $canonical): string
    {
        $fields = array_intersect_key($canonical, array_flip([
            'id',
            'mode',
            'status',
            'srq_answers',
            'risk_indicators',
            'function_domains',
            'non_verbal_reasons',
            'non_verbal_other_note',
        ]));
        foreach (['srq_answers', 'risk_indicators', 'function_domains'] as $field) {
            if (isset($fields[$field])) ksort($fields[$field]);
        }
        ksort($fields);

        return hash('sha256', json_encode($fields, JSON_THROW_ON_ERROR));
    }
}
