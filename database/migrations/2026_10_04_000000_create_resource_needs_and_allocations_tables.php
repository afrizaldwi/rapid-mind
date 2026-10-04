<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_needs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shelter_id')->constrained()->restrictOnDelete();
            $table->string('category', 64);
            $table->string('material_name', 150);
            $table->decimal('quantity_needed', 12, 2);
            $table->string('unit', 30);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['shelter_id', 'category']);
            $table->index(['category', 'material_name']);
        });

        Schema::create('resource_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resource_need_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity_allocated', 12, 2);
            $table->foreignId('allocated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['resource_need_id', 'created_at']);
        });

        DB::statement('ALTER TABLE resource_needs ADD CONSTRAINT resource_needs_quantity_positive CHECK (quantity_needed > 0)');
        DB::statement('ALTER TABLE resource_allocations ADD CONSTRAINT resource_allocations_quantity_positive CHECK (quantity_allocated > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_allocations');
        Schema::dropIfExists('resource_needs');
    }
};
