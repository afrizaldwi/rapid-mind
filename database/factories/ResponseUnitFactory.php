<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ResponseUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResponseUnit> */
class ResponseUnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('UNIT-########'),
            'name' => 'Unit Respons Uji',
            'facility_id' => null,
            'is_active' => true,
        ];
    }
}
