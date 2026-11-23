<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('emergency_events', fn (Blueprint $table) => $table->jsonb('red_flag_types')->nullable());
    }

    public function down(): void
    {
        Schema::table('emergency_events', fn (Blueprint $table) => $table->dropColumn('red_flag_types'));
    }
};
