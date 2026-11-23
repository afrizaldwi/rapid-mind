<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Sync\AssessmentVersion;
use PHPUnit\Framework\TestCase;

final class AssessmentVersionTest extends TestCase
{
    public function test_child_order_is_stable_but_clinical_changes_invalidate_the_version(): void
    {
        $data = [
            'id' => 'synthetic',
            'mode' => 'VERBAL',
            'status' => 'IN_PROGRESS',
            'srq_answers' => [1 => false, 17 => 'UNCLEAR'],
            'risk_indicators' => ['R1' => false],
            'function_domains' => ['F1' => 0],
            'non_verbal_reasons' => [],
            'non_verbal_other_note' => null
        ];
        $version = AssessmentVersion::of($data);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $version);
        $this->assertSame($version, AssessmentVersion::of(array_replace($data, [
            'srq_answers' => [17 => 'UNCLEAR', 1 => false],
            'updated_at' => 'later',
            'patient' => ['name' => 'unchanged policy'],
        ])));
        foreach (
            [
                ['srq_answers' => [1 => true, 17 => 'UNCLEAR']],
                ['risk_indicators' => ['R1' => true]],
                ['function_domains' => ['F1' => 3]],
                ['non_verbal_reasons' => ['OTHER']],
                ['mode' => 'NON_VERBAL'],
                ['status' => 'COMPLETED']
            ] as $patch
        ) {
            $this->assertNotSame($version, AssessmentVersion::of(array_replace($data, $patch)));
        }
    }
}
