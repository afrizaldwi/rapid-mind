<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Models\HealthcareFacility;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

final class CaseRouting
{
    public static function assignNew(Model $case): void
    {
        // Preserve fieldwork on installations missing the additive routing schema.
        // Healthcare access fails closed separately until that schema is available.
        if (!Schema::hasColumn($case->getTable(), 'responsible_facility_id')) return;
        $user = User::find($case->user_id);
        $shelter = $user?->shelter_id ? Shelter::find($user->shelter_id) : null;
        $facility = $shelter?->is_active && $shelter->primary_facility_id
            ? HealthcareFacility::whereKey($shelter->primary_facility_id)->where('is_active', true)->first() : null;
        $case->originating_shelter_id = $shelter?->id;
        $case->responsible_facility_id = $facility?->id;
        $case->routing_status = $facility ? 'ROUTED' : 'UNRESOLVED';
    }
}
