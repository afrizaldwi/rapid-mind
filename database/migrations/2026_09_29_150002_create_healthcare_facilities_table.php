<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('healthcare_facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->nullable(); // RS, Puskesmas, PSC 119
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('healthcare_facilities');
    }
};
