<?php

declare(strict_types=1);

namespace App\Support;

final class IndonesianPhone
{
    public static function normalize(string $input): ?string
    {
        $number = preg_replace('/[\s().-]+/', '', trim($input));
        if (! preg_match('/^(?:\+62|62|0)(8[1-9][0-9]{7,11})$/', $number, $matches)) {
            return null;
        }

        return '+62'.$matches[1];
    }
}
