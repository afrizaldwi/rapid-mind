<?php

namespace App\Enums;

enum ResourceCategory: string
{
    case CHILD_FRIENDLY_KIT = 'CHILD_FRIENDLY_KIT';
    case ELDERLY_SANITATION_KIT = 'ELDERLY_SANITATION_KIT';
    case ESSENTIAL_CHRONIC_MEDICINE = 'ESSENTIAL_CHRONIC_MEDICINE';

    public function label(): string
    {
        return match ($this) {
            self::CHILD_FRIENDLY_KIT => 'Kit Ramah Anak',
            self::ELDERLY_SANITATION_KIT => 'Paket Sanitasi Lansia',
            self::ESSENTIAL_CHRONIC_MEDICINE => 'Obat Kronis Esensial',
        };
    }
}
