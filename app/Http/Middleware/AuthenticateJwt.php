<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\RefreshTokenFamily;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = $request->header('Authorization');
        if ($authorization !== null || $request->is('api/*')) {
            $token = $request->bearerToken();
            if (! $token) {
                return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
            }

            try {
                $jwt = JWTAuth::setToken($token);
                $payload = $jwt->getPayload();
                $user = User::find($payload->get('sub'));
                $version = $payload->get('ver');
                $familyId = $payload->get('sid');
                if (! $user || ! $user->is_active || ! is_int($version)
                    || $version !== $user->token_version || ! $jwt->checkSubjectModel($user)
                    || ! is_string($familyId) || ! Str::isUuid($familyId)) {
                    return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
                }

                $family = RefreshTokenFamily::find($familyId);
                if (! $family || $family->user_id !== $user->id
                    || $family->token_version !== $user->token_version
                    || $family->revoked_at || $family->expires_at->isPast()) {
                    return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
                }
            } catch (JWTException) {
                return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
            }

            if (! $request->is('api/*') && Auth::guard('web')->check()
                && Auth::guard('web')->id() !== $user->id) {
                return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
            }

            if ($request->is('api/*')) {
                $request->attributes->set('api_refresh_family_id', $familyId);
                Auth::guard('api')->setUser($user);
                Auth::shouldUse('api');
            } else {
                Auth::guard('web')->setUser($user);
            }

            return $next($request);
        }

        // Browser navigation uses only the version-bound web session.
        if (Auth::guard('web')->check()) {
            return $next($request);
        }

        return $this->unauthorized($request, 'Sesi berakhir. Silakan masuk kembali.');
    }

    private function unauthorized(Request $request, string $message): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => $message,
            ], 401);
        }

        return redirect()->guest('/login')->withErrors(['auth' => $message]);
    }
}
