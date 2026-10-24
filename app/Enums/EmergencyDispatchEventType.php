<?php

declare(strict_types=1);

namespace App\Enums;

enum EmergencyDispatchEventType: string
{
    case ASSIGNED = 'ASSIGNED';
    case STATUS_CHANGED = 'STATUS_CHANGED';
    case REFERRAL_LINKED = 'REFERRAL_LINKED';
}
