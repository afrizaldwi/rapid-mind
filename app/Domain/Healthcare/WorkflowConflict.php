<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use RuntimeException;

final class WorkflowConflict extends RuntimeException
{
    public function __construct(string $message, public readonly array $context = [])
    {
        parent::__construct($message);
    }
}
