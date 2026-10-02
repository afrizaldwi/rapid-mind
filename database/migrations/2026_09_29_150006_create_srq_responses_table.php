<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('srq_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('question_number'); // 1-20
            $table->boolean('answer');
            $table->timestamps();
            
            $table->unique(['assessment_id', 'question_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('srq_responses');
    }
};
