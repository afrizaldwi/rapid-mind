<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('RELAWAN');
            $table->integer('token_version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->foreignId('facility_id')->nullable()->constrained('healthcare_facilities')->nullOnDelete();
            $table->foreignId('shelter_id')->nullable()->constrained('shelters')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['shelter_id']);
            $table->dropForeign(['facility_id']);
            $table->dropColumn(['role', 'token_version', 'is_active', 'facility_id', 'shelter_id']);
        });
    }
};
