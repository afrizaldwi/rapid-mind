<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
        
        DB::statement('ALTER TABLE regions ADD COLUMN geometry geometry(MultiPolygon, 4326)');
    }

    public function down(): void
    {
        Schema::dropIfExists('regions');
    }
};
