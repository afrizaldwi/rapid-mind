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

    public static function allowed(string $environment, string $applicationUrl, bool $optIn, Request $request, ?User $user, int $owner, array $demoOrigins = []): bool
    {
        return $environment === 'local'
            && $applicationUrl === self::ORIGIN
            && $optIn
            && self::requestOrigin($request, $demoOrigins) !== null
            && $user !== null
            && $request->hasSession()
            && $request->session()->get(ValidateWebSessionVersion::USER_ID) === $user->id
            && $request->session()->get(ValidateWebSessionVersion::VERSION) === $user->token_version
            && $user->is_active
            && $user->role === UserRole::RELAWAN
            && $owner > 0
            && $user->id === $owner;
    }

    private static function requestOrigin(Request $request, array $demoOrigins): ?string
    {
        $directHost = $request->headers->get('host');
        $origin = $request->getSchemeAndHttpHost();
        $local = $directHost === 'localhost:8080' && !$request->isSecure() && $origin === self::ORIGIN;
        $demo = str_starts_with($origin, 'https://') && in_array($origin, $demoOrigins, true)
            && $directHost === parse_url($origin, PHP_URL_HOST)
            && !parse_url($origin, PHP_URL_USER) && !parse_url($origin, PHP_URL_PASS);
        return ($local || $demo) && ($request->header('Origin') === null || $request->header('Origin') === $origin)
            ? $origin : null;
    }

    public static function resolvedOrigin(string $environment, string $applicationUrl, bool $optIn, Request $request, ?User $user, int $owner, array $demoOrigins = []): ?string
    {
        return self::allowed($environment, $applicationUrl, $optIn, $request, $user, $owner, $demoOrigins)
            ? self::requestOrigin($request, $demoOrigins)
            : null;
    }
}
