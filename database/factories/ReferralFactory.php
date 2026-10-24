<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Referral;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Referral> */
class ReferralFactory extends Factory
{
    public function definition(): array
    {
        return [
            'emergency_event_id' => EmergencyEvent::factory()->confirmed(),
            'emergency_verification_id' => fn (array $attributes) => EmergencyEvent::findOrFail($attributes['emergency_event_id'])
                ->verifications()->where('clinical_result', TriageCategory::T0_CONFIRMED)->firstOrFail()->id,
            'clinical_validation_id' => null,
            'patient_id' => fn (array $attributes) => EmergencyEvent::findOrFail($attributes['emergency_event_id'])->patient_id,
            'referred_by' => User::factory()->state(['role' => UserRole::HEALTHCARE, 'is_active' => true]),
            'facility_id' => fn () => HealthcareFacility::create([
                'name' => 'Faskes Sintetis Uji',
                'type' => 'Puskesmas',
                'is_active' => true,
            ])->id,
            'status' => ReferralStatus::ACTIVE,
            'notes' => null,
        ];
    }
}
