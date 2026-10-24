<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

final class DispatchUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public string $dispatchId, public string $emergencyId) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('emergencies');
    }

    public function broadcastWith(): array
    {
        return [
            'dispatch' => ['id' => $this->dispatchId],
            'emergency' => ['id' => $this->emergencyId]
        ];
    }
}
