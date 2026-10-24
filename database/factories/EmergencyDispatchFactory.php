<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DispatchTargetSource;
use App\Enums\EmergencyDispatchStatus;
use App\Enums\UserRole;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyEvent;
use App\Models\ResponseUnit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EmergencyDispatch> */
class EmergencyDispatchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'emergency_event_id' => EmergencyEvent::factory()->confirmed(),
            'referral_id' => null,
            'response_unit_id' => ResponseUnit::factory(),
            'assigned_by' => User::factory()->state(['role' => UserRole::HEALTHCARE, 'is_active' => true]),
            'assigned_at' => now(),
            'status' => EmergencyDispatchStatus::ASSIGNED,
            'target_source' => DispatchTargetSource::GPS,
            'target_latitude' => fn (array $attributes) => EmergencyEvent::findOrFail($attributes['emergency_event_id'])->latitude,
            'target_longitude' => fn (array $attributes) => EmergencyEvent::findOrFail($attributes['emergency_event_id'])->longitude,
            'target_shelter_id' => null,
            'target_description' => null,
            'notes' => null,
        ];
    }
}
