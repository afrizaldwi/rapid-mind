<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risk_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->string('indicator'); // R1, R2, R3, R4, R5
            $table->boolean('answer');
            $table->unsignedTinyInteger('weight'); // R1=2, R2=2, R3=1, R4=2, R5=1
            $table->timestamps();
            
            $table->unique(['assessment_id', 'indicator']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_responses');
    }
};
