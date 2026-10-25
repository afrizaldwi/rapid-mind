<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class ValidateWebSessionVersion
{
    public const USER_ID = 'auth_user_id';

    public const VERSION = 'auth_token_version';

    public function handle(Request $request, Closure $next): Response
    {
        // Login must remain reachable for explicit same-owner reauthentication.
        if ($request->is('login') || $request->is('/') || $request->is('logout')) {
            return $next($request);
        }

        $guard = Auth::guard('web');
        if (! $guard->check()) {
            return $next($request);
        }

        $user = User::find($guard->id());
        $session = $request->session();
        if (
            $user && $user->is_active
            && $session->get(self::USER_ID) === $user->id
            && $session->get(self::VERSION) === $user->token_version
        ) {
            $guard->setUser($user);

            return $next($request);
        }

        $inactive = $user && ! $user->is_active;
        $guard->logout();
        $session->invalidate();
        $session->regenerateToken();

        if ($request->is('relawan/session-status')) {
            return response()->json(
                ['state' => $inactive ? 'ACCOUNT_INACTIVE' : 'REAUTHENTICATION_REQUIRED'],
                $inactive ? 403 : 401
            );
        }

        if ($request->expectsJson() || $request->is('broadcasting/*')) {
            return response()->json(
                ['message' => 'Sesi berakhir. Silakan masuk kembali.'],
                401
            );
        }

        return redirect()->guest('/login')->withErrors(['auth' => 'Sesi berakhir. Silakan masuk kembali.']);
    }
}
