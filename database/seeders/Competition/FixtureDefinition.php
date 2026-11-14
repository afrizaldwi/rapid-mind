<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

final class FixtureDefinition
{
    public const VERSION = 'competition-v1';

    public const LEGACY_REGION = '[SINTETIS KOMPETISI] Wilayah Simulasi';
    public const REGION = '[SIMULASI KARHUTLA] Palangka Raya';
    public const GEOGRAPHY_VERSION = 'palangka-raya-karhutla-v1';
    // Historical public Posko Patdu coordinates; fictional cases, not live response locations.
    public const POSKO = [
        1 => ['name' => 'Posko Patdu Kel. Menteng', 'latitude' => -2.270258, 'longitude' => 113.89232],
        2 => ['name' => 'Posko Patdu Kel. Palangka', 'latitude' => -2.23158, 'longitude' => 113.86185],
        3 => ['name' => 'Posko Patdu Kel. Petuk Katimpun', 'latitude' => -2.14536, 'longitude' => 113.8443],
    ];
    // Illustrative demo envelope, never an official administrative boundary.
    public const GEOMETRY = 'POLYGON((113.80 -2.31,113.96 -2.31,113.96 -2.10,113.80 -2.10,113.80 -2.31))';
    public const LOCATION_NOTE = 'Simulasi karhutla Palangka Raya memakai rujukan posko historis; bukan informasi posko aktif atau titik layanan darurat saat ini.';

    public static function facilityCoordinates(string $alias): array
    {
        $posko = self::POSKO[$alias === 'a' ? 1 : 3];
        return [$posko['latitude'] + 0.002, $posko['longitude'] + 0.002];
    }

    public const ACCOUNTS = [
        'admin' => 'ADMIN',
        'relawan-1' => 'RELAWAN',
        'relawan-2' => 'RELAWAN',
        'relawan-3' => 'RELAWAN',
        'healthcare-a' => 'HEALTHCARE',
        'healthcare-b' => 'HEALTHCARE',
    ];

    public const IDENTITY_VERSION = 'realistic-v1';

    public const IDENTITIES = [
        'admin' => ['admin', 'admin@rapidmind.test'],
        'relawan-1' => ['relawan1', 'budi.santoso@rapidmind.test'],
        'relawan-2' => ['relawan2', 'rani.prameswari@rapidmind.test'],
        'relawan-3' => ['relawan3', 'dimas.prakoso@rapidmind.test'],
        'healthcare-a' => ['medis1', 'maya.lestari@rapidmind.test'],
        'healthcare-b' => ['medis2', 'arief.wicaksono@rapidmind.test'],
    ];

    public static function email(string $alias): string
    {
        return self::IDENTITIES[$alias][1];
    }

    public static function name(string $alias): string
    {
        return self::IDENTITIES[$alias][0];
    }

    public static function id(int $patient, int $entity = 1): string
    {
        return sprintf('c0f10000-2026-4000-8000-%012d', $entity * 100 + $patient);
    }

    public static function posko(int $patient): int
    {
        return (int) ceil($patient / 4);
    }

    public static function facility(int $posko): string
    {
        return $posko === 3 ? 'b' : 'a';
    }

    public static function completed(int $patient): bool
    {
        return in_array($patient, [1, 2, 3, 5, 12], true);
    }

    public static function payload(int $patient): array
    {
        $complete = self::completed($patient);
        $high = in_array($patient, [2, 3, 12], true);
        $yes = $patient === 1 ? [1, 4] : range(1, $high ? 10 : 6);
        $srq = array_combine(range(1, 20), array_map(fn ($n) => in_array($n, $yes, true), range(1, 20)));
        if (! $complete) {
            $srq = $patient === 4
                ? [1 => true, 2 => false, 3 => 'UNCLEAR', 4 => 'UNANSWERED', 17 => 'UNANSWERED'] : [];
        }

        return [
            'id' => self::id($patient, 2),
            'patient' => ['id' => self::id($patient)],
            'mode' => in_array($patient, [5, 6], true) ? 'NON_VERBAL' : 'VERBAL',
            'status' => $complete ? 'COMPLETED' : 'IN_PROGRESS',
            'srq_answers' => $srq,
            'risk_indicators' => $complete ? ['R1' => $patient !== 1, 'R2' => $high, 'R3' => false, 'R4' => false, 'R5' => false] : [],
            'function_domains' => $complete ? ['F1' => $high ? 1 : 0, 'F2' => $high ? 1 : 0, 'F3' => 0] : [],
            'non_verbal_reasons' => match ($patient) {
                5 => ['NOT_SPEAKING', 'OTHER'],
                6 => ['UNKNOWN'],
                default => []
            },
            'non_verbal_other_note' => $patient === 5 ? '[SIMULASI] Observasi komunikasi sintetis, bukan diagnosis.' : null,
        ];
    }
}
