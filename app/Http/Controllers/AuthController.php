<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

final class AuthController extends Controller
{
    public function showLogin(): InertiaResponse|RedirectResponse
    {
        if (Auth::guard('web')->check()) {
            $user = Auth::guard('web')->user();
            return redirect($this->getRedirectPath($user));
        }

        return Inertia::render('Auth/Login');
    }

    public function login(Request $request): JsonResponse|RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Support login by email or name/username
        $user = User::where('email', $credentials['email'])
            ->orWhere('name', $credentials['email'])
            ->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            $errorMessage = 'Email/username atau kata sandi tidak sesuai.';
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => $errorMessage], 401);
            }
            return back()->withErrors(['email' => $errorMessage]);
        }

        if (!$user->is_active) {
            $inactiveMessage = 'Akun Anda sedang nonaktif. Hubungi Admin.';
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => $inactiveMessage], 403);
            }
            return back()->withErrors(['email' => $inactiveMessage]);
        }

        // Generate JWT token
        $token = JWTAuth::fromUser($user);
        $refreshToken = (string) Str::uuid();

        RefreshToken::create([
            'jti' => $refreshToken,
            'user_id' => $user->id,
            'expires_at' => now()->addDays(7),
        ]);

        // Also log into web session for Inertia page transitions
        Auth::guard('web')->login($user);

        $redirectPath = $this->getRedirectPath($user);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl', 60) * 60,
                'refresh_token' => $refreshToken,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role instanceof UserRole ? $user->role->value : (string) $user->role,
                    'shelter_id' => $user->shelter_id,
                    'facility_id' => $user->facility_id,
                ],
                'redirect' => $redirectPath,
            ]);
        }

        return redirect()->intended($redirectPath);
    }

    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::parseToken()->refresh();
            return response()->json([
                'token' => $newToken,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl', 60) * 60,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Token tidak dapat diperbarui. Silakan login kembali.'], 401);
        }
    }

    public function logout(Request $request): JsonResponse|RedirectResponse
    {
        try {
            JWTAuth::parseToken()->invalidate();
        } catch (\Throwable) {
            // Ignore if token already invalid
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Berhasil keluar.']);
        }

        return redirect('/login');
    }

    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
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
