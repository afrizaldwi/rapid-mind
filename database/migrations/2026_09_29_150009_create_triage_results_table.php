<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('triage_results', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('assessment_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('srq_score')->default(0);
            $table->unsignedTinyInteger('risk_score')->default(0);
            $table->unsignedTinyInteger('function_score')->default(0);
            $table->unsignedTinyInteger('total_score')->default(0);
            $table->string('system_recommendation'); // TriageCategory enum
            $table->boolean('is_red_flag_override')->default(false);
            $table->string('red_flag_source')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_results');
    }
};
