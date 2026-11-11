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

    public static function resolvedOrigin(string $environment, string $applicationUrl, bool $optIn, Request $request, ?User $user, int $owner): ?string
    {
        if (self::allowed($environment, $applicationUrl, $optIn, $request, $user, $owner)) {
            return self::ORIGIN;
        }

        if (
            $environment !== 'local'
            || ! $optIn
            || $user === null
            || ! $request->hasSession()
            || $request->session()->get(ValidateWebSessionVersion::USER_ID) !== $user->id
            || $request->session()->get(ValidateWebSessionVersion::VERSION) !== $user->token_version
            || ! $user->is_active
            || $user->role !== UserRole::RELAWAN
            || $owner <= 0
            || $user->id !== $owner
        ) {
            return null;
        }

        $clientOrigin = $request->header('X-Client-Origin');
        if (is_string($clientOrigin) && $clientOrigin !== '' && ! str_ends_with(strtolower($clientOrigin), '.example')) {
            return $clientOrigin;
        }

        $originHeader = $request->header('Origin');
        if (is_string($originHeader) && $originHeader !== '' && ! str_ends_with(strtolower($originHeader), '.example')) {
            return $originHeader;
        }

        $forwardedProto = $request->header('X-Forwarded-Proto');
        $forwardedHost = $request->header('X-Forwarded-Host') ?: $request->headers->get('host');
        if (is_string($forwardedHost) && $forwardedHost !== '' && ! str_ends_with(strtolower($forwardedHost), '.example')) {
            $scheme = ($forwardedProto === 'https' || $request->isSecure() || str_contains(strtolower($forwardedHost), 'ngrok'))
                ? 'https'
                : $request->getScheme();

            return $scheme . '://' . $forwardedHost;
        }

        return self::ORIGIN;
    }
}
