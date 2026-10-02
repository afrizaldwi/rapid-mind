<?php

declare(strict_types=1);

namespace App\Http\Controllers\Relawan;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RelawanSessionController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user('web');

        if (!$user) {
            return response()->json([
                'state' => 'REAUTHENTICATION_REQUIRED',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'state' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        $role = $user->role instanceof UserRole
            ? $user->role->value
            : strtoupper((string) $user->role);

        if ($role !== UserRole::RELAWAN->value) {
            return response()->json([
                'state' => 'WRONG_ROLE',
            ], 403);
        }

        return response()->json([
            'state' => 'AUTHENTICATED',
            'user' => [
                'id' => $user->id,
                'role' => UserRole::RELAWAN->value,
            ],
        ]);
    }
}
