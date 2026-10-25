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
        Schema::create('refresh_token_families', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->integer('token_version');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason', 32)->nullable();
            $table->timestamps();
            $table->index(['user_id', 'revoked_at']);
        });

        DB::statement('ALTER TABLE refresh_token_families ADD CONSTRAINT refresh_token_families_version_check CHECK (token_version >= 1)');
        DB::statement("ALTER TABLE refresh_token_families ADD CONSTRAINT refresh_token_families_revocation_check CHECK ((revoked_at IS NULL AND revoked_reason IS NULL) OR (revoked_at IS NOT NULL AND revoked_reason IN ('logout', 'replay', 'account_disabled', 'version_changed')))");

        Schema::table('refresh_tokens', function (Blueprint $table): void {
            $table->foreignUuid('family_id')->nullable()->constrained('refresh_token_families')->restrictOnDelete();
            $table->char('token_hash', 64)->nullable();
            $table->timestamp('consumed_at')->nullable();
            $table->index(['family_id', 'consumed_at']);
            $table->index('expires_at');
        });

        DB::statement('CREATE UNIQUE INDEX refresh_tokens_token_hash_unique ON refresh_tokens (token_hash) WHERE token_hash IS NOT NULL');
        DB::statement('ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_opaque_shape_check CHECK ((family_id IS NULL AND token_hash IS NULL AND consumed_at IS NULL) OR (family_id IS NOT NULL AND token_hash IS NOT NULL))');
        DB::statement("ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_hash_format_check CHECK (token_hash IS NULL OR token_hash ~ '^[0-9a-f]{64}$')");
    }

    public function down(): void
    {
        if (DB::table('refresh_token_families')->exists() || DB::table('refresh_tokens')->whereNotNull('family_id')->exists()) {
            throw new RuntimeException('Opaque refresh-token history exists; refusing to discard family or revocation records.');
        }

        DB::statement('ALTER TABLE refresh_tokens DROP CONSTRAINT refresh_tokens_hash_format_check');
        DB::statement('ALTER TABLE refresh_tokens DROP CONSTRAINT refresh_tokens_opaque_shape_check');
        DB::statement('DROP INDEX refresh_tokens_token_hash_unique');
        Schema::table('refresh_tokens', function (Blueprint $table): void {
            $table->dropForeign(['family_id']);
            $table->dropIndex(['family_id', 'consumed_at']);
            $table->dropIndex(['expires_at']);
            $table->dropColumn(['family_id', 'token_hash', 'consumed_at']);
        });
        Schema::drop('refresh_token_families');
    }
};
