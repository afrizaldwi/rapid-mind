<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Models\AuditLog;
use App\Models\ClinicalCaseShare;
use App\Models\EmergencyEvent;
use App\Models\Referral;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class CaseSharing
{
    /** Called in the referral creation transaction. Destination permission is read-only. */
    public static function forReferral(Referral $referral, User $actor): void
    {
        $case = HealthcareCaseAccess::referralCase($referral);
        abort_unless($case, 404);
        HealthcareCaseAccess::authorize($case, $actor);
        $cases = [$case];
        // Explicitly share only this referred emergency's linked assessment,
        // and only if the originating actor is authorized to disclose it.
        if (
            $case instanceof EmergencyEvent && $case->assessment
            && HealthcareCaseAccess::manages($case->assessment, $actor)
        ) $cases[] = $case->assessment;
        foreach ($cases as $source) {
            $share = ClinicalCaseShare::firstOrCreate([
                'case_type' => $source->getTable(),
                'case_id' => $source->id,
                'facility_id' => $referral->facility_id,
                'referral_id' => $referral->id,
            ], ['granted_by' => $actor->id]);
            if (!$share->wasRecentlyCreated) continue;
            AuditLog::create([
                'actor_id' => $actor->id,
                'action' => 'CLINICAL_CASE_SHARED',
                'entity_type' => 'ClinicalCaseShare',
                'entity_id' => (string) $share->id,
                'new_values' => $share->only(['case_type', 'case_id', 'facility_id', 'referral_id']),
            ]);
        }
    }

    public static function revokeReferral(Referral $referral, User $actor): void
    {
        DB::transaction(function () use ($referral, $actor) {
            $case = HealthcareCaseAccess::referralCase($referral);
            abort_unless($case, 404);
            $case = $case->newQuery()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            HealthcareCaseAccess::authorize($case, $actor);
            foreach (ClinicalCaseShare::where('referral_id', $referral->id)->whereNull('revoked_at')->lockForUpdate()->get() as $share) {
                $share->update(['revoked_at' => now()]);
                AuditLog::create([
                    'actor_id' => $actor->id,
                    'action' => 'CLINICAL_CASE_SHARE_REVOKED',
                    'entity_type' => 'ClinicalCaseShare',
                    'entity_id' => (string) $share->id,
                    'new_values' => $share->only(['case_type', 'case_id', 'facility_id', 'referral_id', 'revoked_at']),
                ]);
            }
        });
    }
}
