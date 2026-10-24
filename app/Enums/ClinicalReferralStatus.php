<?php

declare(strict_types=1);

namespace App\Enums;

/** Clinical lifecycle for cutover; ReferralStatus still serves the existing application. */
enum ClinicalReferralStatus: string
{
    case ACTIVE = 'ACTIVE';
    case COMPLETED = 'COMPLETED';

    /** @return list<self> */
    public function allowedNextStatuses(): array
    {
        return match ($this) {
            self::ACTIVE => [self::COMPLETED],
            self::COMPLETED => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedNextStatuses(), true);
    }
}
