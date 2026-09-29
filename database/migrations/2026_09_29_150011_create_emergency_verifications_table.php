<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('emergency_event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('verified_by')->constrained('users')->cascadeOnDelete();
            $table->string('method')->nullable();
            $table->string('clinical_result')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_verifications');
    }
};
