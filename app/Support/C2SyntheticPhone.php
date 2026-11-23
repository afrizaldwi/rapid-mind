<?php

declare(strict_types=1);

namespace App\Support;

final class C2SyntheticPhone
{
    public static function allows(
        string $phone,
        string $name,
        string $email,
        bool $creating,
        string $environment,
        string $database,
        string $applicationUrl,
    ): bool {
        $expected = match ($email) {
            'c2-relawan-a@example.invalid' => ['C2 Relawan A', 'C2-TEST-NONROUTABLE-A'],
            'c2-relawan-b@example.invalid' => ['C2 Relawan B', 'C2-TEST-NONROUTABLE-B'],
            default => null,
        };

        return $creating
            && $expected === [$name, $phone]
            && $applicationUrl === 'http://localhost:8080'
            && (($environment === 'local' && $database === 'rapid_mind')
                || ($environment === 'testing' && $database === 'rapid_mind_testing'));
    }
}
