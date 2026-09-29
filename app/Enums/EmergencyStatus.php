<?php

namespace App\Enums;

enum EmergencyStatus: string {
    case PENDING = 'PENDING';
    case ACKNOWLEDGED = 'ACKNOWLEDGED';
    case REVIEWING = 'REVIEWING';
    case CONFIRMED = 'CONFIRMED';
    case DOWNGRADED = 'DOWNGRADED';
    case RESOLVED = 'RESOLVED';
}
