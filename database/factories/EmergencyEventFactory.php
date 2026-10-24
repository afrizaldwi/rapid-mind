<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EmergencyEvent> */
class EmergencyEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['role' => UserRole::RELAWAN, 'is_active' => true]),
            'patient_id' => fn (array $attributes) => Patient::create([
                'name' => 'Penyintas Sintetis Uji',
                'created_by' => $attributes['user_id'],
            ])->id,
            'red_flag_type' => RedFlagType::MEDICAL_CRISIS,
            'status' => EmergencyStatus::PENDING,
            'latitude' => '-7.68920000',
            'longitude' => '110.42340000',
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => EmergencyStatus::CONFIRMED])
            ->afterCreating(function (EmergencyEvent $emergency): void {
                EmergencyVerification::create([
                    'emergency_event_id' => $emergency->id,
                    'verified_by' => User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true])->id,
                    'clinical_result' => TriageCategory::T0_CONFIRMED,
                    'notes' => 'Keputusan klinis sintetis untuk pengujian domain.',
                ]);
            });
    }
}
