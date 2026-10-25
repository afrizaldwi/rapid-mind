<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Middleware\ValidateWebSessionVersion;
use App\Models\User;
use App\Services\OpaqueRefreshTokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class AuthController extends Controller
{
    public function showLogin(Request $request): InertiaResponse|RedirectResponse
    {
        $reauthentication = $request->boolean('reauth');

        if (Auth::guard('web')->check() && ! $reauthentication) {
            $user = Auth::guard('web')->user();

            return redirect($this->getRedirectPath($user));
        }

        return Inertia::render('Auth/Login', $reauthentication ? [
            // The existing server session remains intact until valid replacement
            // credentials are submitted, but it must not affect local continuity.
            'auth' => ['user' => null],
        ] : []);
    }

    public function login(Request $request, OpaqueRefreshTokens $refreshTokens): JsonResponse|RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Support login by email or name/username
        $user = User::where('email', $credentials['email'])
            ->orWhere('name', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            $errorMessage = 'Email/username atau kata sandi tidak sesuai.';
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => $errorMessage], 401);
            }

            return back()->withErrors(['email' => $errorMessage]);
        }

        if (! $user->is_active) {
            $inactiveMessage = 'Akun Anda sedang nonaktif. Hubungi Admin.';
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => $inactiveMessage], 403);
            }

            return back()->withErrors(['email' => $inactiveMessage]);
        }

        $redirectPath = $this->getRedirectPath($user);
        if ($request->is('api/*')) {
            $issued = $refreshTokens->login($user);
            if (! $issued) {
                return response()->json(['message' => 'Akun Anda sedang nonaktif. Hubungi Admin.'], 403);
            }

            return response()->json([
                ...$issued,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl', 60) * 60,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role instanceof UserRole ? $user->role->value : (string) $user->role,
                    'shelter_id' => $user->shelter_id,
                    'facility_id' => $user->facility_id,
                ],
                'redirect' => $redirectPath,
            ])->header('Cache-Control', 'no-store');
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put(ValidateWebSessionVersion::USER_ID, $user->id);
        $request->session()->put(ValidateWebSessionVersion::VERSION, $user->token_version);

        return redirect()->intended($redirectPath);
    }

    public function refresh(Request $request, OpaqueRefreshTokens $refreshTokens): JsonResponse
    {
        $credential = $request->input('refresh_token');
        if ($request->headers->has('Authorization') || ! is_string($credential)) {
            return response()->json(['message' => 'Token tidak dapat diperbarui. Silakan login kembali.'], 401);
        }

        $issued = $refreshTokens->rotate($credential);
        if (! $issued) {
            return response()->json(['message' => 'Token tidak dapat diperbarui. Silakan login kembali.'], 401);
        }

        return response()->json([
            ...$issued,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl', 60) * 60,
        ])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request, OpaqueRefreshTokens $refreshTokens): JsonResponse|RedirectResponse
    {
        if ($request->is('api/*')) {
            $refreshTokens->revoke($request->user('api'), $request->attributes->get('api_refresh_family_id'));

            return response()->json(['message' => 'Berhasil keluar.'])->header('Cache-Control', 'no-store');
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return redirect('/login');
    }

    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role instanceof UserRole ? $user->role->value : (string) $user->role,
            'shelter_id' => $user->shelter_id,
            'facility_id' => $user->facility_id,
            'shelter' => $user->shelter,
            'facility' => $user->facility,
        ]);
    }

    private function getRedirectPath(User $user): string
    {
        $role = $user->role instanceof UserRole ? $user->role->value : (string) $user->role;

        return match (strtoupper($role)) {
            'ADMIN' => '/admin/summary',
            'HEALTHCARE' => '/healthcare/emergencies',
            'RELAWAN' => '/relawan/home',
            default => '/login',
        };
    }
}
