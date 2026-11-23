<?php

declare(strict_types=1);

namespace Tests\Unit;

use Illuminate\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Mockery;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class AssessmentRollbackGuardTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        DB::clearResolvedInstance('db');
        Facade::setFacadeApplication(null);
        parent::tearDown();
    }

    public function test_observation_metadata_blocks_rollback_before_any_schema_mutation(): void
    {
        Facade::setFacadeApplication(new Container());
        $connection = Mockery::mock();
        $srq = Mockery::mock();
        $observations = Mockery::mock();
        $connection->shouldReceive('table')->once()->with('srq_responses')->andReturn($srq);
        $srq->shouldReceive('whereNull')->once()->with('answer')->andReturnSelf();
        $srq->shouldReceive('exists')->once()->andReturn(false);
        $connection->shouldReceive('table')->once()->with('assessments')->andReturn($observations);
        $observations->shouldReceive('where')->once()->with(Mockery::type(\Closure::class))->andReturnSelf();
        $observations->shouldReceive('exists')->once()->andReturn(true);
        $connection->shouldNotReceive('statement');
        DB::swap($connection);
        $migration = require __DIR__ . '/../../database/migrations/2026_11_03_000000_add_assessment_observations_and_srq_states.php';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Metadata observasi masih tersimpan');
        $migration->down();
    }

    public function test_unresolved_answers_still_block_rollback_before_metadata_or_schema_access(): void
    {
        Facade::setFacadeApplication(new Container());
        $connection = Mockery::mock();
        $srq = Mockery::mock();
        $connection->shouldReceive('table')->once()->with('srq_responses')->andReturn($srq);
        $srq->shouldReceive('whereNull')->once()->with('answer')->andReturnSelf();
        $srq->shouldReceive('exists')->once()->andReturn(true);
        $connection->shouldNotReceive('statement');
        DB::swap($connection);
        $migration = require __DIR__ . '/../../database/migrations/2026_11_03_000000_add_assessment_observations_and_srq_states.php';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Klarifikasi respons SRQ');
        $migration->down();
    }
}
