<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('validated_by')->constrained('users')->cascadeOnDelete();
            $table->string('clinical_result')->nullable();
            $table->text('diagnosis_notes')->nullable();
            $table->text('intervention_plan')->nullable();
            $table->boolean('referral_required')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_validations');
    }
};
