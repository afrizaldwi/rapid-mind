<?php

namespace App\Enums;

enum RedFlagType: string {
    case SUICIDAL_IDEATION = 'SUICIDAL_IDEATION';
    case PSYCHOSIS = 'PSYCHOSIS';
    case SEVERE_AGITATION = 'SEVERE_AGITATION';
    case MEDICAL_CRISIS = 'MEDICAL_CRISIS';
}
