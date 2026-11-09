<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Domain\Sync\AssessmentSynchronizer;
use App\Models\Assessment;
use Illuminate\Testing\TestResponse;

trait SendsVersionedAssessmentRequests
{
    /** Model a client that loaded the current assessment before each step. */
    private function postVersionedAssessment(string $url, array $data = []): TestResponse
    {
        preg_match('#/relawan/assessment/([^/]+)/#', $url, $matches);
        $assessment = Assessment::findOrFail($matches[1]);
        $data['base_version'] = app(AssessmentSynchronizer::class)->canonical($assessment)['server_version'];

        return $this->postJson($url, $data);
    }
}
