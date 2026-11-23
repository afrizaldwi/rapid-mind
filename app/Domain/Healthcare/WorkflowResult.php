<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Models\EmergencyDispatch;
use App\Models\Referral;

final readonly class WorkflowResult
{
    public function __construct(public EmergencyDispatch|Referral $record, public bool $replayed = false) {}
}
