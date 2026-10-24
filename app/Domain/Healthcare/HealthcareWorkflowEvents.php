<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Events\DispatchUpdated;
use App\Events\ReferralUpdated;
use App\Models\EmergencyDispatch;
use App\Models\Referral;
use Illuminate\Support\Facades\DB;
use Throwable;

final class HealthcareWorkflowEvents
{
    /** Called only after all required state/history/audit writes, within the transaction. */
    public static function changed(EmergencyDispatch|Referral $record): void
    {
        $event = $record instanceof EmergencyDispatch
            ? new DispatchUpdated($record->id, $record->emergency_event_id)
            : new ReferralUpdated($record->id, $record->emergency_event_id);
        DB::afterCommit(static function () use ($event): void {
            try {
                event($event);
            } catch (Throwable $exception) {
                // Persistence has committed. A transport failure must never turn it into an HTTP failure.
                report($exception);
            }
        });
    }
}
