<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\EmergencyEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class EmergencyCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public EmergencyEvent $emergency)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('emergencies'),
        ];
    }

    public function broadcastWith(): array
    {
        return ['emergency' => ['id' => $this->emergency->id]];
    }
}
