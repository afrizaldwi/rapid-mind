<?php

declare(strict_types=1);

namespace App\Domain\Assessment;

use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class NonVerbalObservations
{
    // Observations only. These codes are never inputs to a clinical calculator.
    public const CODES = [
        'NOT_SPEAKING', 'SEVERE_DISTRESS', 'SPEECH_DIFFICULTY',
        'HEARING_COMMUNICATION_BARRIER', 'CHOOSES_NOT_TO_SPEAK', 'UNKNOWN', 'OTHER',
    ];

    public static function rules(): array
    {
        return [
            'non_verbal_reasons' => ['sometimes', 'array', 'list', 'max:7'],
            'non_verbal_reasons.*' => ['required', 'string', Rule::in(self::CODES), 'distinct:strict'],
            'non_verbal_other_note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public static function normalize(array $data): array
    {
        if (!array_key_exists('non_verbal_reasons', $data)) {
            if (array_key_exists('non_verbal_other_note', $data)) {
                throw ValidationException::withMessages(['non_verbal_reasons' => 'Kirim daftar observasi bersama catatan lainnya.']);
            }
            return $data;
        }
        $reasons = $data['non_verbal_reasons'];
        if (in_array('UNKNOWN', $reasons, true) && count($reasons) !== 1) {
            throw ValidationException::withMessages(['non_verbal_reasons' => 'UNKNOWN tidak boleh digabung dengan observasi lain.']);
        }
        $note = $data['non_verbal_other_note'] ?? null;
        if ($note !== null && !in_array('OTHER', $reasons, true)) {
            throw ValidationException::withMessages(['non_verbal_other_note' => 'Catatan lainnya hanya boleh disertakan untuk OTHER.']);
        }
        sort($reasons);
        $data['non_verbal_reasons'] = $reasons;
        $data['non_verbal_other_note'] = $note;

        return $data;
    }
}
