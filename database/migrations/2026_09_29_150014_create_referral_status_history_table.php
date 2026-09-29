<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('referral_id')->constrained()->cascadeOnDelete();
            $table->string('status');
            $table->foreignId('changed_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_status_history');
    }
};
