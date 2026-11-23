<?php

namespace App\Models\Concerns;

use App\Domain\Healthcare\CaseRouting;
use App\Models\ClinicalCaseShare;

trait RoutesClinicalCase
{
    protected static function bootRoutesClinicalCase(): void
    {
        static::creating(fn($case) => CaseRouting::assignNew($case));
    }

    public function caseShares()
    {
        return $this->hasMany(ClinicalCaseShare::class, 'case_id')->where('case_type', $this->getTable());
    }

    public function getRoutingStatusAttribute($value): string
    {
        return $value ?? 'UNRESOLVED';
    }
}
