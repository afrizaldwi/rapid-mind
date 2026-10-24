<?php

declare(strict_types=1);

namespace App\Enums;

enum EmergencyDispatchStatus: string
{
    case ASSIGNED = 'ASSIGNED';
    case EN_ROUTE = 'EN_ROUTE';
    case ON_SITE = 'ON_SITE';
    case TRANSPORT = 'TRANSPORT';
    case COMPLETED = 'COMPLETED';

    /** @return list<self> */
    public function allowedNextStatuses(): array
    {
        return match ($this) {
            self::ASSIGNED => [self::EN_ROUTE],
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
