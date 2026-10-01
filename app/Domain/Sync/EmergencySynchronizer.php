<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Events\EmergencyCreated;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class EmergencySynchronizer
{
    public function __construct(private PatientReconciler $patients) {}

    public function synchronize(array $data, User $user): array
    {
        [$emergency, $created] = DB::transaction(function () use ($data, $user) {
            SyncIdentityLock::acquire(array_values(array_filter([
                ['emergency', $data['id']],
                isset($data['patient']) ? ['patient', $data['patient']['id']] : null,
                isset($data['assessment_id']) ? ['assessment', $data['assessment_id']] : null,
            ])));
            $existing = EmergencyEvent::whereKey($data['id'])->lockForUpdate()->first();
            if ($existing) {
                if (!$this->matches($existing, $data, $user)) {
                    throw new ConflictHttpException('Isi insiden T0 bertentangan dengan rekaman server.');
                }
                return [$existing, false];
            }

            $assessment = isset($data['assessment_id'])
                ? Assessment::whereKey($data['assessment_id'])->lockForUpdate()->first()
                : null;
            if ($assessment && $assessment->user_id !== $user->id) {
                throw ValidationException::withMessages(['assessment_id' => 'Asesmen tidak tersedia untuk Relawan ini.']);
            }
            if ($assessment && isset($data['assessment_mode']) && $assessment->mode->value !== $data['assessment_mode']) {
                throw new ConflictHttpException('Mode asesmen bertentangan.');
            }
            if ($assessment && isset($data['patient']) && $assessment->patient_id !== $data['patient']['id']) {
                throw new ConflictHttpException('Penyintas tidak sesuai dengan asesmen.');
            }
            if (isset($data['assessment_id']) && !$assessment && !isset($data['patient'])) {
                throw ValidationException::withMessages(['patient' => 'Identitas penyintas diperlukan untuk asesmen lokal baru.']);
            }
            $patient = $this->patients->reconcile($data['patient'] ?? null, $user);
            if ($assessment && !$patient) {
                $patient = $this->patients->reconcile(['id' => $assessment->patient_id], $user);
            }
            if (isset($data['assessment_id']) && !$assessment) {
                $assessment = new Assessment([
                    'patient_id' => $patient->id,
                    'user_id' => $user->id,
                    'status' => AssessmentStatus::IN_PROGRESS,
                    'mode' => AssessmentMode::from($data['assessment_mode']),
                    'started_at' => now(),
                ]);
                $assessment->id = $data['assessment_id'];
                $assessment->save();
            }
            $emergency = new EmergencyEvent([
                'patient_id' => $patient?->id,
                'assessment_id' => $assessment?->id,
                'user_id' => $user->id,
                'red_flag_type' => RedFlagType::from($data['red_flag_type']),
                'status' => EmergencyStatus::PENDING,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'shelter_id' => $user->shelter_id,
                'notes' => $data['notes'] ?? null,
            ]);
            $emergency->id = $data['id'];
            if (isset($data['created_at'])) $emergency->created_at = $data['created_at'];
            $emergency->save();
            return [$emergency, true];
        });

        $delivered = null;
        $warning = null;
        if ($created) {
            $delivered = true;
            try {
                event(new EmergencyCreated($emergency));
            } catch (\Throwable $exception) {
                $delivered = false;
                $warning = 'Insiden T0 tersimpan di server, tetapi notifikasi realtime belum dapat dikonfirmasi.';
                report($exception);
            }
        }
        return [
            'emergency' => $this->canonical($emergency),
            'created' => $created,
            'replayed' => !$created,
            'realtime_delivered' => $delivered,
            ...($warning ? ['warning' => $warning] : []),
        ];
    }

    private function matches(EmergencyEvent $event, array $data, User $user): bool
    {
        if (
            $event->user_id !== $user->id
            || $event->assessment_id !== ($data['assessment_id'] ?? null)
            || $event->red_flag_type->value !== $data['red_flag_type']
            || $event->notes !== ($data['notes'] ?? null)
        ) return false;
        $patientId = $data['patient']['id'] ?? null;
        if (!$patientId && isset($data['assessment_id'])) {
            $patientId = Assessment::whereKey($data['assessment_id'])->value('patient_id');
        }
        if ($event->patient_id !== $patientId) return false;
        foreach (['latitude', 'longitude'] as $field) {
            $requested = $data[$field] ?? null;
            if ($requested === null ? $event->$field !== null : (float) $event->$field !== round((float) $requested, 7)) return false;
        }
        return true;
    }

    public function canonical(EmergencyEvent $event): array
    {
        $event->loadMissing('patient');
        return [
            'id' => $event->id,
            'patient' => $event->patient?->only(['id', 'nik', 'name', 'age', 'gender', 'shelter_id']),
            'patient_id' => $event->patient_id,
            'assessment_id' => $event->assessment_id,
            'red_flag_type' => $event->red_flag_type->value,
            'status' => $event->status->value,
            'latitude' => $event->latitude === null ? null : (float) $event->latitude,
            'longitude' => $event->longitude === null ? null : (float) $event->longitude,
            'shelter_id' => $event->shelter_id,
            'notes' => $event->notes,
            'created_at' => $event->created_at?->toIso8601String(),
            'updated_at' => $event->updated_at?->toIso8601String(),
        ];
    }
}
