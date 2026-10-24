<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referrals', function (Blueprint $table): void {
            // Nullable until Healthcare writers adopt explicit clinical provenance.
            $table->foreignId('emergency_verification_id')->nullable()
                ->constrained('emergency_verifications')->restrictOnDelete();
            // Supports the dispatch composite FK without restricting existing source cardinality.
            $table->unique(['id', 'emergency_event_id'], 'referrals_id_emergency_unique');
        });

        Schema::table('referral_status_history', function (Blueprint $table): void {
            $table->string('previous_status')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('referral_status_history', function (Blueprint $table): void {
            $table->dropColumn('previous_status');
        });

        Schema::table('referrals', function (Blueprint $table): void {
            $table->dropUnique('referrals_id_emergency_unique');
            $table->dropConstrainedForeignId('emergency_verification_id');
        });
    }
};
