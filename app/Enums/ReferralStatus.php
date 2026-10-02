<?php

namespace App\Enums;

enum ReferralStatus: string {
    case ACTIVE = 'ACTIVE';
    case EN_ROUTE = 'EN_ROUTE';
    case ON_SITE = 'ON_SITE';
    case TRANSPORT = 'TRANSPORT';
    case COMPLETED = 'COMPLETED';

    /** @return list<self> */
    public function allowedNextStatuses(): array
    {
        return match ($this) {
            self::ACTIVE => [self::EN_ROUTE],
            self::EN_ROUTE => [self::ON_SITE],
            self::ON_SITE => [self::TRANSPORT, self::COMPLETED],
            self::TRANSPORT => [self::COMPLETED],
            self::COMPLETED => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedNextStatuses(), true);
    }
}
