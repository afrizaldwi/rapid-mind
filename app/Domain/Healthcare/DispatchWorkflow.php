<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\DispatchTargetSource;
use App\Enums\EmergencyDispatchEventType;
use App\Enums\EmergencyDispatchStatus;
use App\Enums\EmergencyStatus;
use App\Enums\TriageCategory;
use App\Models\AuditLog;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyDispatchHistory;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class DispatchWorkflow
{
    public function __construct(private readonly DispatchTargetSnapshot $targets) {}

    public function assign(User $actor, string $emergencyId, array $input): WorkflowResult
    {
        HealthcareWorkflowAccess::authorize($actor);
        $data = Validator::make($input, [
            'response_unit_id' => ['required', 'integer', 'min:1'],
            'referral_id' => ['nullable', 'uuid'],
            'target_source' => ['nullable', Rule::enum(DispatchTargetSource::class)],
            'target_description' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ])->validate();
        $request = [
            'response_unit_id' => (int) $data['response_unit_id'],
            'referral_id' => isset($data['referral_id']) ? strtolower($data['referral_id']) : null,
            'target_source' => $data['target_source'] ?? null,
            'target_description' => $this->text($data['target_description'] ?? null),
            'notes' => $this->text($data['notes'] ?? null),
        ];

        return DB::transaction(function () use ($actor, $emergencyId, $request): WorkflowResult {
            $emergency = EmergencyEvent::whereKey($emergencyId)->lockForUpdate()->firstOrFail();
            $existing = $emergency->dispatch()->lockForUpdate()->first();
            if ($existing) {
                $initial = $existing->history()->where('event_type', EmergencyDispatchEventType::ASSIGNED)->first();
                // Compare the original request, not coordinates or links that may have changed since.
                if (($initial?->metadata['request'] ?? null) == $request) {
                    return new WorkflowResult($existing, true);
                }
                throw new WorkflowConflict('Penugasan untuk kejadian ini sudah tercatat dan tidak dapat diganti.', [
                    'dispatch_id' => $existing->id, 'current_status' => $existing->status->value,
                ]);
            }
            if ($emergency->status !== EmergencyStatus::CONFIRMED) {
                throw new WorkflowConflict('Penugasan respons hanya dapat dibuat setelah T0 dikonfirmasi.', [
                    'current_status' => $emergency->status->value,
                ]);
            }

            if ($request['referral_id']) {
                $this->referralFor($emergency, $request['referral_id']);
            }
            $unit = ResponseUnit::whereKey($request['response_unit_id'])->lockForUpdate()->first();
            if (! $unit || ! $unit->is_active) {
                throw ValidationException::withMessages(['response_unit_id' => 'Pilih unit respons yang aktif.']);
            }
            $target = $this->targets->resolve($emergency, $request);
            $dispatch = EmergencyDispatch::create([
                ...$target,
                'emergency_event_id' => $emergency->id,
                'referral_id' => $request['referral_id'],
                'response_unit_id' => $unit->id,
                'assigned_by' => $actor->id,
                'assigned_at' => now(),
                'status' => EmergencyDispatchStatus::ASSIGNED,
                'notes' => $request['notes'],
            ]);
            $this->record($dispatch, $actor, EmergencyDispatchEventType::ASSIGNED, null, $request['notes'], [
                'request' => $request, 'target' => $target, 'referral_id' => $dispatch->referral_id,
                'response_unit_id' => $unit->id,
            ], ['status' => null], $dispatch->only(['status', 'referral_id', 'response_unit_id', 'assigned_by', 'assigned_at', ...array_keys($target)]));

            return new WorkflowResult($dispatch);
        }, 3);
    }

    public function transition(User $actor, string $dispatchId, array $input): WorkflowResult
    {
        HealthcareWorkflowAccess::authorize($actor);
        $data = Validator::make($input, [
            'expected_status' => ['required', Rule::enum(EmergencyDispatchStatus::class)],
            'status' => ['required', Rule::enum(EmergencyDispatchStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ])->validate();
        $expected = EmergencyDispatchStatus::from($data['expected_status']);
        $next = EmergencyDispatchStatus::from($data['status']);
        $notes = $this->text($data['notes'] ?? null);

        return DB::transaction(function () use ($actor, $dispatchId, $expected, $next, $notes): WorkflowResult {
            $this->lockEmergency($dispatchId);
            $dispatch = EmergencyDispatch::whereKey($dispatchId)->lockForUpdate()->firstOrFail();
            $current = $dispatch->status;
            if ($current === $next) {
                $applied = $dispatch->history()->where('event_type', EmergencyDispatchEventType::STATUS_CHANGED)
                    ->where('previous_status', $expected)->where('status', $next)->first();
                if ($applied && $applied->notes === $notes) {
                    return new WorkflowResult($dispatch, true);
                }
                throw $this->stale($dispatch);
            }
            if ($current !== $expected) {
                throw $this->stale($dispatch);
            }
            if (! $current->canTransitionTo($next)) {
                throw ValidationException::withMessages(['status' => 'Perubahan status respons ini tidak diizinkan.']);
            }
            $dispatch->update(['status' => $next]);
            $this->record($dispatch, $actor, EmergencyDispatchEventType::STATUS_CHANGED, $current, $notes, [],
                ['status' => $current->value], ['status' => $next->value]);

            return new WorkflowResult($dispatch);
        }, 3);
    }

    public function linkReferral(User $actor, string $dispatchId, array $input): WorkflowResult
    {
        HealthcareWorkflowAccess::authorize($actor);
        $data = Validator::make($input, [
            'referral_id' => ['required', 'uuid'],
            'expected_referral_id' => ['present', 'nullable', 'uuid'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ])->validate();
        $referralId = strtolower($data['referral_id']);
        $expected = isset($data['expected_referral_id']) ? strtolower($data['expected_referral_id']) : null;

        return DB::transaction(function () use ($actor, $dispatchId, $data, $referralId, $expected): WorkflowResult {
            $emergency = $this->lockEmergency($dispatchId);
            $existing = EmergencyDispatch::whereKey($dispatchId)->firstOrFail();
            if ($existing->referral_id !== null) {
                // No referral row is mutated on replay/conflict; do not lock another source.
                $dispatch = EmergencyDispatch::whereKey($dispatchId)->lockForUpdate()->firstOrFail();
                if ($dispatch->referral_id === $referralId) {
                    return new WorkflowResult($dispatch, true);
                }
                throw new WorkflowConflict('Rujukan respons sudah tercatat dan tidak dapat diganti.', [
                    'current_referral_id' => $dispatch->referral_id,
                ]);
            }
            $this->referralFor($emergency, $referralId);
            $dispatch = EmergencyDispatch::whereKey($dispatchId)->lockForUpdate()->firstOrFail();
            if ($dispatch->referral_id !== $expected || $dispatch->referral_id !== null) {
                throw new WorkflowConflict('Rujukan respons sudah tercatat dan tidak dapat diganti.', [
                    'current_referral_id' => $dispatch->referral_id,
                ]);
            }
            if ($dispatch->status === EmergencyDispatchStatus::COMPLETED) {
                throw $this->stale($dispatch);
            }
            $dispatch->update(['referral_id' => $referralId]);
            $this->record($dispatch, $actor, EmergencyDispatchEventType::REFERRAL_LINKED, $dispatch->status,
                $this->text($data['notes'] ?? null), ['referral_id' => $referralId],
                ['referral_id' => null, 'status' => $dispatch->status->value],
                ['referral_id' => $referralId, 'status' => $dispatch->status->value]);

            return new WorkflowResult($dispatch);
        }, 3);
    }

    private function lockEmergency(string $dispatchId): EmergencyEvent
    {
        $parentId = EmergencyDispatch::whereKey($dispatchId)->firstOrFail()->emergency_event_id;

        return EmergencyEvent::whereKey($parentId)->lockForUpdate()->firstOrFail();
    }

    private function referralFor(EmergencyEvent $emergency, string $referralId): Referral
    {
        $referral = Referral::whereKey($referralId)->lockForUpdate()->first();
        if (! $referral || $referral->emergency_event_id !== $emergency->id
            || ! $emergency->patient_id || $referral->patient_id !== $emergency->patient_id
            || $referral->clinical_validation_id !== null) {
            throw ValidationException::withMessages(['referral_id' => 'Rujukan harus berasal dari kejadian darurat dan pasien yang sama.']);
        }
        if ($referral->emergency_verification_id !== null
            && ($referral->emergencyVerification?->emergency_event_id !== $emergency->id
                || $referral->emergencyVerification?->clinical_result !== TriageCategory::T0_CONFIRMED)) {
            throw ValidationException::withMessages(['referral_id' => 'Sumber keputusan klinis rujukan tidak sesuai dengan kejadian darurat.']);
        }

        return $referral;
    }

    private function record(EmergencyDispatch $dispatch, User $actor, EmergencyDispatchEventType $event,
        ?EmergencyDispatchStatus $previous, ?string $notes, array $metadata, array $old, array $new): void
    {
        EmergencyDispatchHistory::create([
            'emergency_dispatch_id' => $dispatch->id, 'event_type' => $event,
            'previous_status' => $previous, 'status' => $dispatch->status,
            'changed_by' => $actor->id, 'notes' => $notes, 'metadata' => $metadata,
        ]);
        AuditLog::create([
            'actor_id' => $actor->id, 'action' => 'DISPATCH_'.$event->value,
            'entity_type' => 'EmergencyDispatch', 'entity_id' => $dispatch->id,
            'old_values' => $old, 'new_values' => [...$new, 'notes' => $notes],
        ]);
        HealthcareWorkflowEvents::changed($dispatch);
    }

    private function stale(EmergencyDispatch $dispatch): WorkflowConflict
    {
        return new WorkflowConflict('Data respons telah berubah. Muat data terbaru sebelum melakukan perubahan.', [
            'current_status' => $dispatch->status->value,
        ]);
    }

    private function text(?string $text): ?string
    {
        return ($value = trim($text ?? '')) === '' ? null : $value;
    }
}
