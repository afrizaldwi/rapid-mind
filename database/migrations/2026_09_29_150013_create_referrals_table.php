<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('emergency_event_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('referred_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained('healthcare_facilities')->cascadeOnDelete();
            $table->string('status')->default('ACTIVE');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
    }
};
