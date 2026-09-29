<?php

namespace App\Enums;

enum VerificationMethod: string {
    case PHONE = 'PHONE';
    case VIDEO = 'VIDEO';
    case FIELD_TEAM = 'FIELD_TEAM';
}
