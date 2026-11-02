<?php

declare(strict_types=1);

namespace App\Domain\Assessment;

use InvalidArgumentException;

final class SrqAnswer
{
    /** Definitive answers retain the historical boolean representation. */
    public static function normalize(mixed $value): bool|string
    {
        return match ($value) {
            true, 'YES' => true,
            false, 'NO' => false,
            'UNCLEAR', 'UNANSWERED' => $value,
            default => throw new InvalidArgumentException('Nilai jawaban SRQ tidak valid.'),
        };
    }

    public static function storage(mixed $value): array
    {
        $answer = self::normalize($value);

        return is_bool($answer)
            ? ['answer' => $answer, 'answer_state' => null]
            : ['answer' => null, 'answer_state' => $answer];
    }

    /** Fail closed before any final score can be calculated. */
    public static function definitive(array $answers): array
    {
        $keys = array_keys($answers);
        sort($keys);
        if ($keys !== range(1, 20)) {
            throw new InvalidArgumentException('SRQ-20 harus memiliki 20 jawaban definitif.');
        }
        $normalized = array_map(self::normalize(...), $answers);
        foreach ($normalized as $answer) {
            if (!is_bool($answer)) {
                throw new InvalidArgumentException('SRQ-20 masih memiliki jawaban yang belum diklarifikasi.');
            }
        }

        return $normalized;
    }

    public static function rule(bool $completed = false): \Closure
    {
        return static function ($attribute, $value, $fail) use ($completed): void {
            try {
                $normalized = self::normalize($value);
                if ($completed && !is_bool($normalized)) {
                    $fail('Klarifikasi seluruh jawaban SRQ sebelum menyelesaikan asesmen.');
                }
            } catch (InvalidArgumentException) {
                $fail('Jawaban SRQ harus YES, NO, UNCLEAR, UNANSWERED, atau boolean.');
            }
        };
    }
}
