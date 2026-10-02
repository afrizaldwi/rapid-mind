<?php

namespace App\Enums;

enum UserRole: string {
    case RELAWAN = 'RELAWAN';
    case HEALTHCARE = 'HEALTHCARE';
    case ADMIN = 'ADMIN';
}
