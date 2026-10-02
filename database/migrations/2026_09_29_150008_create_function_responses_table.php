<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('function_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->string('domain'); // F1, F2, F3
            $table->unsignedTinyInteger('level'); // 0, 1, or 3
            $table->timestamps();
            
            $table->unique(['assessment_id', 'domain']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('function_responses');
    }
};
