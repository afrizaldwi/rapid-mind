<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\C2SyntheticPhone;
use App\Support\IndonesianPhone;
use PHPUnit\Framework\TestCase;

final class C2SyntheticPhoneTest extends TestCase
{
    public function test_only_exact_new_c2_identities_in_exact_local_or_testing_context_are_allowed(): void
    {
        foreach (['A', 'B'] as $scope) {
            $phone = 'C2-TEST-NONROUTABLE-' . $scope;
            $name = 'C2 Relawan ' . $scope;
            $email = 'c2-relawan-' . strtolower($scope) . '@example.invalid';
            $this->assertNull(IndonesianPhone::normalize($phone));
            foreach ([['local', 'rapid_mind'], ['testing', 'rapid_mind_testing']] as [$environment, $database]) {
                $this->assertTrue(C2SyntheticPhone::allows($phone, $name, $email, true, $environment, $database, 'http://localhost:8080'));
            }
            foreach (
                [
                    [$phone, $name, $email, false, 'local', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, 'Other user', $email, true, 'local', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, $name, 'other@example.invalid', true, 'local', 'rapid_mind', 'http://localhost:8080'],
                    ['C2-TEST-NONROUTABLE-X', $name, $email, true, 'local', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, $name, $email, true, 'production', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, $name, $email, true, 'staging', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, $name, $email, true, 'local', 'production_database', 'http://localhost:8080'],
                    [$phone, $name, $email, true, 'testing', 'rapid_mind', 'http://localhost:8080'],
                    [$phone, $name, $email, true, 'local', 'rapid_mind', 'https://production.example'],
                ] as $arguments
            ) {
                $this->assertFalse(C2SyntheticPhone::allows(...$arguments));
            }
        }
    }
}
