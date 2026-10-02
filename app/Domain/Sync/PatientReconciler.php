<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class PatientReconciler
{
    public function reconcile(?array $data, User $user): ?Patient
    {
        if ($data === null) return null;

        $patient = Patient::whereKey($data['id'])->lockForUpdate()->first();
        if ($patient) {
            if ($patient->created_by !== $user->id
                && ($user->shelter_id === null || $patient->shelter_id !== $user->shelter_id)) {
                throw ValidationException::withMessages(['patient.id' => 'Penyintas tidak tersedia untuk Relawan ini.']);
            }
            // A stable UUID is identity; replay never edits an existing patient profile.
            return $patient;
        }

        if (empty($data['name'])) {
            throw ValidationException::withMessages(['patient.name' => 'Nama penyintas diperlukan untuk identitas lokal baru.']);
        }

        $patient = new Patient([
            'nik' => $data['nik'] ?? null,
            'name' => $data['name'],
            'age' => $data['age'] ?? null,
            'gender' => $data['gender'] ?? null,
            'shelter_id' => $user->shelter_id,
            'created_by' => $user->id,
        ]);
        $patient->id = $data['id'];
        $patient->save();
        return $patient;
    }
}
