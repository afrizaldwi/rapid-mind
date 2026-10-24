<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('response_units', function (Blueprint $table): void {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->foreignId('facility_id')->nullable()->constrained('healthcare_facilities')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('emergency_dispatches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('emergency_event_id')->unique()->constrained('emergency_events')->restrictOnDelete();
            $table->foreignUuid('referral_id')->nullable()->unique()->constrained('referrals')->restrictOnDelete();
            $table->foreignId('response_unit_id')->constrained('response_units')->restrictOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->timestampTz('assigned_at');
            $table->string('status')->default('ASSIGNED');
            $table->string('target_source');
            $table->decimal('target_latitude', 10, 8)->nullable();
            $table->decimal('target_longitude', 11, 8)->nullable();
            $table->foreignId('target_shelter_id')->nullable()->constrained('shelters')->restrictOnDelete();
            $table->text('target_description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['status', 'assigned_at']);
            $table->foreign(['referral_id', 'emergency_event_id'], 'dispatch_referral_emergency_foreign')
                ->references(['id', 'emergency_event_id'])->on('referrals')->restrictOnDelete();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE emergency_dispatches
                ADD CONSTRAINT dispatch_status_check CHECK (status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'TRANSPORT', 'COMPLETED')),
                ADD CONSTRAINT dispatch_target_source_check CHECK (target_source IN ('GPS', 'SHELTER', 'MANUAL')),
                ADD CONSTRAINT dispatch_coordinates_pair_check CHECK ((target_latitude IS NULL) = (target_longitude IS NULL)),
                ADD CONSTRAINT dispatch_latitude_check CHECK (target_latitude BETWEEN -90 AND 90),
                ADD CONSTRAINT dispatch_longitude_check CHECK (target_longitude BETWEEN -180 AND 180),
                ADD CONSTRAINT dispatch_target_present_check CHECK (
                    target_latitude IS NOT NULL OR NULLIF(BTRIM(target_description), '') IS NOT NULL
                )
            SQL);

        Schema::create('emergency_dispatch_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('emergency_dispatch_id')->constrained('emergency_dispatches')->restrictOnDelete();
            $table->string('event_type');
            $table->string('previous_status')->nullable();
            $table->string('status');
            $table->foreignId('changed_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->index(['emergency_dispatch_id', 'created_at', 'id'], 'dispatch_history_order_index');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE emergency_dispatch_history
                ADD CONSTRAINT dispatch_history_event_check CHECK (event_type IN ('ASSIGNED', 'STATUS_CHANGED', 'REFERRAL_LINKED')),
                ADD CONSTRAINT dispatch_history_status_check CHECK (status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'TRANSPORT', 'COMPLETED')),
                ADD CONSTRAINT dispatch_history_previous_status_check CHECK (previous_status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'TRANSPORT', 'COMPLETED'))
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_dispatch_history');
        Schema::dropIfExists('emergency_dispatches');
        Schema::dropIfExists('response_units');
    }
};
