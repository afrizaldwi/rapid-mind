<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->jsonb('non_verbal_reasons')->nullable();
            $table->string('non_verbal_other_note', 500)->nullable();
        });
        Schema::table('srq_responses', function (Blueprint $table) {
            $table->boolean('answer')->nullable()->change();
            $table->string('answer_state', 10)->nullable();
        });
        // No historical row rewrite: existing booleans remain definitive.
        DB::statement("ALTER TABLE srq_responses ADD CONSTRAINT srq_response_answer_state_check CHECK (
            (answer IS NOT NULL AND answer_state IS NULL)
            OR (answer IS NULL AND answer_state IS NOT NULL AND answer_state IN ('UNCLEAR', 'UNANSWERED'))
        )");
    }

    public function down(): void
    {
        // Refuse a rollback that would discard unresolved clinical responses.
        if (DB::table('srq_responses')->whereNull('answer')->exists()) {
            throw new RuntimeException('Klarifikasi respons SRQ sebelum rollback; data tidak dihapus atau dikonversi.');
        }
        if (DB::table('assessments')->where(function ($query) {
            $query->whereRaw("non_verbal_reasons IS NOT NULL AND non_verbal_reasons <> '[]'::jsonb")
                ->orWhereRaw("non_verbal_other_note IS NOT NULL AND non_verbal_other_note <> ''");
        })->exists()) {
            throw new RuntimeException('Metadata observasi masih tersimpan; rollback dibatalkan tanpa menghapus data.');
        }
        DB::statement('ALTER TABLE srq_responses DROP CONSTRAINT srq_response_answer_state_check');
        Schema::table('srq_responses', function (Blueprint $table) {
            $table->dropColumn('answer_state');
            $table->boolean('answer')->nullable(false)->change();
        });
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['non_verbal_reasons', 'non_verbal_other_note']);
        });
    }
};
