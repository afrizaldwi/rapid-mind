<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('healthcare_facilities', function (Blueprint $table): void {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
        });
        DB::statement('ALTER TABLE healthcare_facilities ADD CONSTRAINT facility_coordinates_check CHECK (
            (latitude IS NULL AND longitude IS NULL) OR
            (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
        )');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE healthcare_facilities DROP CONSTRAINT facility_coordinates_check');
        Schema::table('healthcare_facilities', fn (Blueprint $table) => $table->dropColumn(['latitude', 'longitude']));
    }
};
