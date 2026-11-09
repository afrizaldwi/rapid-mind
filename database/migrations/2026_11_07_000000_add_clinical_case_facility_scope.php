<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shelters', function (Blueprint $table) {
            $table->foreignId('primary_facility_id')->nullable()->constrained('healthcare_facilities')->restrictOnDelete();
        });
        foreach (['assessments', 'emergency_events'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('originating_shelter_id')->nullable()->constrained('shelters')->restrictOnDelete();
                $table->foreignId('responsible_facility_id')->nullable()->constrained('healthcare_facilities')->restrictOnDelete();
                $table->string('routing_status')->default('UNRESOLVED');
                $table->index(['responsible_facility_id', 'routing_status']);
            });
        }
        Schema::create('clinical_case_shares', function (Blueprint $table) {
            $table->id();
            $table->string('case_type', 20);
            $table->uuid('case_id');
            $table->foreignId('facility_id')->constrained('healthcare_facilities')->restrictOnDelete();
            $table->foreignId('granted_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('referral_id')->constrained('referrals')->restrictOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->unique(['case_type', 'case_id', 'facility_id', 'referral_id'], 'clinical_case_share_unique');
        });
        // Deliberately no historical backfill: missing assignments remain unresolved.
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_case_shares');
        foreach (['assessments', 'emergency_events'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropForeign(['originating_shelter_id']);
                $table->dropForeign(['responsible_facility_id']);
                $table->dropIndex(['responsible_facility_id', 'routing_status']);
                $table->dropColumn(['originating_shelter_id', 'responsible_facility_id', 'routing_status']);
            });
        }
        Schema::table('shelters', fn(Blueprint $table) => $table->dropConstrainedForeignId('primary_facility_id'));
    }
};
