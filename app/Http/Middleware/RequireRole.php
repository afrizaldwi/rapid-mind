<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = Auth::user();

        if (!$user) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return redirect()->guest('/login');
        }

        $userRoleValue = $user->role instanceof UserRole ? $user->role->value : (string)$user->role;

        $allowedRoles = array_map(
            fn(string $role) => strtoupper(trim($role)),
            $roles
        );

        if (!in_array(strtoupper($userRoleValue), $allowedRoles, true)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses ke resource ini.',
                ], 403);
            }

            // Redirect user to their own role's home view
            $redirectPath = match (strtoupper($userRoleValue)) {
                'ADMIN' => '/admin/summary',
                'HEALTHCARE' => '/healthcare/emergencies',
                'RELAWAN' => '/relawan/home',
                default => '/login',
            };

            return redirect($redirectPath)->withErrors([
                'access' => 'Anda tidak memiliki akses ke halaman tersebut.',
            ]);
        }

        return $next($request);
    }
}
