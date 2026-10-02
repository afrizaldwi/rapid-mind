<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Try to authenticate via standard JWT Bearer header
        try {
            if ($user = JWTAuth::parseToken()->authenticate()) {
                if (!$user->is_active) {
                    return $this->unauthorized($request, 'Akun Anda sedang nonaktif. Hubungi Admin.');
                }

                Auth::setUser($user);
                return $next($request);
            }
        } catch (JWTException) {
            // Header JWT token missing or invalid, fall back to web session if available
        }

        // 2. Check if web session user exists (for Inertia browser page navigation)
        if (Auth::guard('web')->check()) {
            $user = Auth::guard('web')->user();
            if (!$user->is_active) {
                Auth::guard('web')->logout();
                return $this->unauthorized($request, 'Akun Anda sedang nonaktif. Hubungi Admin.');
            }
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
