<?php

declare(strict_types=1);

namespace App\Events;

use App\Domain\Healthcare\CaseAudience;
use App\Models\Assessment;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

final class AssessmentUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public string $assessmentId) {}
    public function broadcastOn(): array
    {
        return CaseAudience::forCase(Assessment::find($this->assessmentId));
    }
    public function broadcastWith(): array
    {
        return ['assessment' => ['id' => $this->assessmentId]];
    }

    public static function afterCommit(string $id): void
    {
        \Illuminate\Support\Facades\DB::afterCommit(static function () use ($id) {
            try {
                event(new self($id));
            } catch (\Throwable $exception) {
                report($exception);
            }
        });
    }
}
