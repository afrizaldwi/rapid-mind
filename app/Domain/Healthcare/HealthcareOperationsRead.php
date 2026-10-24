<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\EmergencyStatus;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ResponseUnit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

/** Additive Healthcare-only projections. Missing rollout schema is explicit, never an empty dispatch. */
final class HealthcareOperationsRead
{
    public function ready(): bool
    {
        return Schema::hasTable('emergency_dispatches')
            && Schema::hasTable('emergency_dispatch_history')
            && Schema::hasTable('response_units')
            && Schema::hasColumn('referrals', 'emergency_verification_id');
    }

    public function options(bool $ready): array
    {
        return [
            'operationsAvailable' => $ready,
            'responseUnits' => $ready ? ResponseUnit::where('is_active', true)->orderBy('name')->orderBy('id')
                ->get(['id', 'code', 'name', 'facility_id']) : [],
        ];
    }

    public function queue(Builder $query, bool $ready): void
    {
        $query->where(function (Builder $active) use ($ready): void {
            $active->whereIn('status', [EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING])
                ->orWhere(function (Builder $confirmed) use ($ready): void {
                    $confirmed->where('status', EmergencyStatus::CONFIRMED);
                    if ($ready) {
                        $confirmed->where(fn(Builder $work) => $work->whereDoesntHave('dispatch')
                            ->orWhereHas('dispatch', fn(Builder $dispatch) => $dispatch->where('status', '!=', 'COMPLETED'))
                            ->orWhereHas('referrals', fn(Builder $referral) => $referral->where('status', '!=', 'COMPLETED')));
                    }
                });
        });
    }

    public function emergency(EmergencyEvent $emergency, bool $ready): void
    {
        if (! $ready) {
            $emergency->setAttribute('operations', ['available' => false]);

            return;
        }
        $dispatch = $emergency->dispatch;
        $emergency->setAttribute('operations', [
            'available' => true,
            'dispatch' => $dispatch ? [
                ...$dispatch->only([
                    'id',
                    'status',
                    'referral_id',
                    'assigned_at',
                    'target_source',
                    'target_latitude',
                    'target_longitude',
                    'target_shelter_id',
                    'target_description',
                    'notes'
                ]),
                'response_unit' => $dispatch->responseUnit?->only(['id', 'code', 'name']),
                'assigner' => $dispatch->assigner?->only(['id', 'name']),
                'next_statuses' => array_map(fn($status) => $status->value, $dispatch->status->allowedNextStatuses()),
                'history' => $dispatch->history->map(fn($history) => [
                    ...$history->only(['id', 'event_type', 'previous_status', 'status', 'notes', 'created_at']),
                    'referral_id' => $history->metadata['referral_id'] ?? null,
                    'actor' => $history->changer?->only(['id', 'name']),
                ]),
            ] : null,
            'referrals' => $emergency->referrals->map(fn(Referral $referral) => $this->referral($referral)),
            'targets' => array_values(array_filter([
                is_numeric($emergency->latitude) && is_numeric($emergency->longitude)
                    && abs((float) $emergency->latitude) <= 90 && abs((float) $emergency->longitude) <= 180
                    ? ['source' => 'GPS', 'label' => "GPS: {$emergency->latitude}, {$emergency->longitude}"] : null,
                $emergency->shelter ? ['source' => 'SHELTER', 'label' => 'Posko: ' . implode(' — ', array_filter([
                    $emergency->shelter->name,
                    $emergency->shelter->address,
                ]))] : null,
                ['source' => 'MANUAL', 'label' => 'Lokasi manual'],
            ])),
        ]);
        // Do not serialize the eager-loaded model graph (especially assignment request metadata).
        $emergency->unsetRelation('dispatch');
    }

    public function referral(Referral $referral): array
    {
        return [
            ...$referral->only(['id', 'status', 'emergency_event_id', 'clinical_validation_id', 'created_at', 'updated_at', 'notes']),
            'source' => $referral->emergency_event_id ? 'T0_CONFIRMED' : ($referral->clinical_validation_id ? 'VALIDATED_ASSESSMENT' : 'UNKNOWN'),
            'facility' => $referral->facility?->only(['id', 'name']),
            'history' => $referral->statusHistory->sortBy(fn($row) => $row->created_at->format('Y-m-d H:i:s.u') . str_pad((string) $row->id, 20, '0', STR_PAD_LEFT))
                ->values()->map(fn($row) => [
                    ...$row->only(['id', 'previous_status', 'status', 'notes', 'created_at']),
                    'actor' => $row->changer?->only(['id', 'name']),
                ]),
        ];
    }

    public function relations(): array
    {
        return ['dispatch.responseUnit:id,code,name', 'dispatch.assigner:id,name', 'dispatch.history.changer:id,name'];
    }
}
