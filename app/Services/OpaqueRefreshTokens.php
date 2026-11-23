<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

final class OpaqueRefreshTokens
{
    /** @return array{token: string, refresh_token: string, refresh_expires_at: string}|null */
    public function login(User $candidate): ?array
    {
        return DB::transaction(function () use ($candidate): ?array {
            $user = User::whereKey($candidate->id)->lockForUpdate()->first();
            if (! $user || ! $user->is_active) {
                return null;
            }

            $expiresAt = now()->addDays(7);
            $family = RefreshTokenFamily::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'token_version' => $user->token_version,
                'expires_at' => $expiresAt,
            ]);
            $credential = $this->newCredential();
            $this->persist($user, $family, $credential);

            return $this->issued($user, $family, $credential);
        });
    }

    /** @return array{token: string, refresh_token: string, refresh_expires_at: string}|null */
    public function rotate(string $credential): ?array
    {
        if (! preg_match('/^rmt_[A-Za-z0-9_-]{43}$/D', $credential)) {
            return null;
        }

        $hash = hash('sha256', $credential);
        $record = RefreshToken::where('token_hash', $hash)->first();
        if (! $record || ! $record->family_id) {
            return null;
        }

        // Lock order is user, family, token in every operation that changes a family.
        return DB::transaction(function () use ($record, $hash): ?array {
            $user = User::whereKey($record->user_id)->lockForUpdate()->first();
            if (! $user) {
                return null;
            }
            $family = RefreshTokenFamily::whereKey($record->family_id)->lockForUpdate()->first();
            $token = RefreshToken::whereKey($record->id)->lockForUpdate()->first();
            if (! $family || ! $token || $family->user_id !== $user->id
                || $token->user_id !== $user->id || $token->family_id !== $family->id
                || ! is_string($token->token_hash) || ! hash_equals($token->token_hash, $hash)
                || ! $user->is_active || $family->token_version !== $user->token_version
                || $family->revoked_at || $family->expires_at->isPast()) {
                return null;
            }

            if ($token->consumed_at) {
                $family->update(['revoked_at' => now(), 'revoked_reason' => 'replay']);

                return null;
            }
            if ($token->revoked_at || $token->expires_at->isPast()) {
                return null;
            }

            $token->update(['consumed_at' => now()]);
            $replacement = $this->newCredential();
            $this->persist($user, $family, $replacement);

            return $this->issued($user, $family, $replacement);
        });
    }

    public function revoke(User $user, string $familyId): void
    {
        DB::transaction(function () use ($user, $familyId): void {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->first();
            if (! $lockedUser) {
                return;
            }
            $family = RefreshTokenFamily::whereKey($familyId)->lockForUpdate()->first();
            if ($family && $family->user_id === $lockedUser->id && ! $family->revoked_at) {
                $family->update(['revoked_at' => now(), 'revoked_reason' => 'logout']);
            }
        });
    }

    private function newCredential(): string
    {
        return 'rmt_'.rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    private function persist(User $user, RefreshTokenFamily $family, string $credential): void
    {
        RefreshToken::create([
            'jti' => (string) Str::uuid(),
            'user_id' => $user->id,
            'family_id' => $family->id,
            'token_hash' => hash('sha256', $credential),
            'expires_at' => $family->expires_at,
        ]);
    }

    /** @return array{token: string, refresh_token: string, refresh_expires_at: string} */
    private function issued(User $user, RefreshTokenFamily $family, string $credential): array
    {
        // The JWT package retains payload claims on its shared factory.
        JWTAuth::factory()->emptyClaims();
        try {
            $access = JWTAuth::claims(['sid' => $family->id])->fromUser($user);
        } finally {
            JWTAuth::claims([]);
            JWTAuth::factory()->emptyClaims();
        }

        return [
            'token' => $access,
            'refresh_token' => $credential,
            'refresh_expires_at' => $family->expires_at->toIso8601String(),
        ];
    }
}
