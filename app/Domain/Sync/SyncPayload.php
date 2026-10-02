<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\RedFlagType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class SyncPayload
{
    public static function patientRules(bool $required): array
    {
        return [
            'patient' => [$required ? 'required' : 'nullable', 'array:id,nik,name,age,gender'],
            'patient.id' => [$required ? 'required' : 'required_with:patient', 'uuid'],
            'patient.nik' => ['nullable', 'string', 'max:20'],
            'patient.name' => ['nullable', 'string', 'max:100'],
            'patient.age' => ['nullable', 'integer', 'between:0,120'],
            'patient.gender' => ['nullable', 'in:Laki-laki,Perempuan'],
        ];
    }

    public static function assessment(Request $request): array
    {
        $completed = $request->input('status') === AssessmentStatus::COMPLETED->value;
        $rules = [
            'id' => ['required', 'uuid'],
            ...self::patientRules(true),
            'mode' => ['required', Rule::enum(AssessmentMode::class)],
            'status' => ['required', Rule::enum(AssessmentStatus::class)],
            'started_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'client_triage' => ['nullable', 'array'],
            'srq_answers' => [$completed ? 'required' : 'sometimes', 'array:' . implode(',', range(1, 20)), ...($completed ? ['size:20'] : [])],
            'risk_indicators' => [$completed ? 'required' : 'sometimes', 'array:R1,R2,R3,R4,R5', ...($completed ? ['size:5'] : [])],
            'function_domains' => [$completed ? 'required' : 'sometimes', 'array:F1,F2,F3', ...($completed ? ['size:3'] : [])],
        ];
        foreach (range(1, 20) as $n) $rules["srq_answers.$n"] = [$completed ? 'required' : 'sometimes', 'boolean'];
        foreach (['R1', 'R2', 'R3', 'R4', 'R5'] as $key) $rules["risk_indicators.$key"] = [$completed ? 'required' : 'sometimes', 'boolean'];
        foreach (['F1', 'F2', 'F3'] as $key) $rules["function_domains.$key"] = [$completed ? 'required' : 'sometimes', 'integer', Rule::in([0, 1, 3])];
        $data = $request->validate($rules);
        foreach (['srq_answers', 'risk_indicators'] as $group) {
            foreach ($data[$group] ?? [] as $value) {
                if (!is_bool($value)) throw ValidationException::withMessages([$group => 'Jawaban harus Ya atau Tidak.']);
            }
        }
        foreach ($data['function_domains'] ?? [] as $value) {
            if (!is_int($value)) throw ValidationException::withMessages(['function_domains' => 'Nilai fungsi harus bilangan bulat.']);
        }
        return $data;
    }

    public static function emergency(Request $request): array
    {
        return $request->validate([
            'id' => ['required', 'uuid'],
            ...self::patientRules(false),
            'assessment_id' => ['nullable', 'uuid'],
            'assessment_mode' => ['required_with:assessment_id', Rule::enum(AssessmentMode::class)],
            'red_flag_type' => ['required', Rule::enum(RedFlagType::class)],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'created_at' => ['nullable', 'date'],
        ]);
    }
}
