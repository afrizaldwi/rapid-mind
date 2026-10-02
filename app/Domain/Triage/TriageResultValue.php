<?php

declare(strict_types=1);

namespace App\Domain\Triage;

use App\Enums\TriageCategory;

final readonly class TriageResultValue
{
    public function __construct(
        public int $srqScore,
        public int $riskScore,
        public int $functionScore,
        public int $totalScore,
        public TriageCategory $recommendation,
        public bool $isRedFlagOverride,
        public ?string $redFlagSource,
    ) {}
}

