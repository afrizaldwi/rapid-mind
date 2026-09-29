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
        $this->emergency->load(['patient', 'shelter', 'user']);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('emergencies'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'emergency' => [
                'id' => $this->emergency->id,
                'red_flag_type' => $this->emergency->red_flag_type?->value ?? (string)$this->emergency->red_flag_type,
                'status' => $this->emergency->status?->value ?? (string)$this->emergency->status,
                'patient_name' => $this->emergency->patient?->name ?? 'Tanpa Identitas',
                'nik' => $this->emergency->patient?->nik,
                'shelter_name' => $this->emergency->shelter?->name ?? 'Posko Lapangan',
                'volunteer_name' => $this->emergency->user?->name ?? 'Relawan',
                'created_at' => $this->emergency->created_at?->toIso8601String(),
                'notes' => $this->emergency->notes,
                'latitude' => $this->emergency->latitude,
                'longitude' => $this->emergency->longitude,
            ],
        ];
    }
}
