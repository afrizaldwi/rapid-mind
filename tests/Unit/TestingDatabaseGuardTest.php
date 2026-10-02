<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\TestCase as LaravelTestCase;

final class TestingDatabaseGuardTest extends TestCase
{
    public function test_accepts_only_the_testing_database(): void
    {
        LaravelTestCase::assertTestingDatabase('rapid_mind_testing');

        $this->expectNotToPerformAssertions();
    }

    public function test_rejects_the_primary_database_before_tests_can_use_it(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('refusing to use rapid_mind');

        LaravelTestCase::assertTestingDatabase('rapid_mind');
    }
}
