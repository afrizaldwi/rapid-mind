<?php

namespace App\Enums;

enum TriageCategory: string {
    case T0_SUSPECT = 'T0_SUSPECT';
    case T0_CONFIRMED = 'T0_CONFIRMED';
    case T1 = 'T1';
    case T2 = 'T2';
    case T3 = 'T3';
}
