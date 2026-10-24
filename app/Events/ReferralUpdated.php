<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

final class ReferralUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public string $referralId, public ?string $emergencyId) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('emergencies');
    }

    public function broadcastWith(): array
    {
        return [
            'referral' => ['id' => $this->referralId],
            'emergency' => ['id' => $this->emergencyId]
        ];
    }
}
