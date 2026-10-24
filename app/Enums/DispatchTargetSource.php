<?php

declare(strict_types=1);

namespace App\Enums;

enum DispatchTargetSource: string
{
    case GPS = 'GPS';
    case SHELTER = 'SHELTER';
    case MANUAL = 'MANUAL';
}
