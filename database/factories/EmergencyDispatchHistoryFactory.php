<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EmergencyDispatchEventType;
use App\Enums\EmergencyDispatchStatus;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyDispatchHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EmergencyDispatchHistory> */
class EmergencyDispatchHistoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'emergency_dispatch_id' => EmergencyDispatch::factory(),
            'event_type' => EmergencyDispatchEventType::ASSIGNED,
            'previous_status' => null,
            'status' => EmergencyDispatchStatus::ASSIGNED,
            'changed_by' => fn (array $attributes) => EmergencyDispatch::findOrFail($attributes['emergency_dispatch_id'])->assigned_by,
            'notes' => null,
            'metadata' => null,
        ];
    }
}
