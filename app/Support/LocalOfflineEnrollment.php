<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;
use App\Http\Middleware\ValidateWebSessionVersion;
use Illuminate\Http\Request;

final class LocalOfflineEnrollment
{
    public const ORIGIN = 'http://localhost:8080';

    public static function allowed(string $environment, string $applicationUrl, bool $optIn, Request $request, ?User $user, int $owner): bool
    {
        return $environment === 'local'
            && $applicationUrl === self::ORIGIN
            && $optIn
            // Inspect the direct Host rather than trusting forwarded host data.
            && $request->headers->get('host') === 'localhost:8080'
            && ! $request->isSecure()
            && ($request->header('Origin') === null || $request->header('Origin') === self::ORIGIN)
            && $user !== null
            && $request->hasSession()
            && $request->session()->get(ValidateWebSessionVersion::USER_ID) === $user->id
            && $request->session()->get(ValidateWebSessionVersion::VERSION) === $user->token_version
            && $user->is_active
            && $user->role === UserRole::RELAWAN
            && $owner > 0
            && $user->id === $owner;
    }
}
