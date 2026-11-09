<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Schema;

final class HealthcareCaseAccess
{
    public static function available(): bool
    {
        return Schema::hasColumn('assessments', 'responsible_facility_id')
            && Schema::hasColumn('emergency_events', 'responsible_facility_id')
            && Schema::hasTable('clinical_case_shares');
    }

    public static function hideUnauthorizedAssessment(EmergencyEvent $case, ?User $actor): void
    {
        if ($case->assessment_id && !self::cases(Assessment::query(), $actor)->whereKey($case->assessment_id)->exists()) {
            $case->setAttribute('assessment_id', null);
            $case->setRelation('assessment', null);
        }
    }

    public static function facility(?User $actor): ?int
    {
        $current = $actor?->fresh();
        if (!$current?->is_active || $current->role !== UserRole::HEALTHCARE || !$current->facility_id) return null;
        return HealthcareFacility::whereKey($current->facility_id)->where('is_active', true)->exists()
            ? (int) $current->facility_id : null;
    }

    public static function cases(Builder|Relation $query, ?User $actor, bool $write = false): Builder|Relation
    {
        $table = $query->getModel()->getTable();
        $facility = self::facility($actor);
        if (!$facility || !Schema::hasColumn($table, 'responsible_facility_id')) return $query->whereRaw('1 = 0');
        return $query->where(function ($access) use ($table, $facility, $write) {
            $access->where("$table.responsible_facility_id", $facility);
            if (!$write && Schema::hasTable('clinical_case_shares')) {
                $access->orWhereHas('caseShares', fn($share) => $share->where('facility_id', $facility)->whereNull('revoked_at'));
            }
        });
    }

    public static function patients(Builder $query, ?User $actor): Builder
    {
        return $query->where(fn($patient) => $patient
            ->whereHas('assessments', fn($case) => self::cases($case, $actor))
            ->orWhereHas('emergencyEvents', fn($case) => self::cases($case, $actor)));
    }

    public static function referrals(Builder|Relation $query, ?User $actor, bool $write = false): Builder|Relation
    {
        return $query->where(fn($referral) => $referral
            ->whereHas('emergencyEvent', fn($case) => self::cases($case, $actor, $write))
            ->orWhereHas('clinicalValidation.assessment', fn($case) => self::cases($case, $actor, $write)));
    }

    public static function authorize(Model $case, User $actor): void
    {
        abort_unless(self::cases($case->newQuery(), $actor, true)->whereKey($case->getKey())->exists(), 404);
    }

    public static function manages(?Model $case, ?User $actor): bool
    {
        $facility = self::facility($actor);
        return $case && $facility !== null && (int) $case->responsible_facility_id === $facility;
    }

    public static function referralCase(\App\Models\Referral $referral): Assessment|EmergencyEvent|null
    {
        return $referral->emergency_event_id ? $referral->emergencyEvent : $referral->clinicalValidation?->assessment;
    }
}
