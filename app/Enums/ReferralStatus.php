<?php

namespace App\Enums;

enum ReferralStatus: string {
    case ACTIVE = 'ACTIVE';
    case EN_ROUTE = 'EN_ROUTE';
    case ON_SITE = 'ON_SITE';
    case TRANSPORT = 'TRANSPORT';
    case COMPLETED = 'COMPLETED';
}
