<?php

declare(strict_types=1);

namespace App\Http\Controllers\Relawan;

use App\Http\Controllers\Controller;
use App\Support\LocalOfflineEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OfflineEnrollmentController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $data = $request->validate(['owner_user_id' => ['required', 'integer', 'min:1']]);
        $user = $request->user('web');
        $origin = LocalOfflineEnrollment::resolvedOrigin(
            (string) app()->environment(),
            (string) config('app.url'),
            (bool) config('offline.local_enrollment', false),
            $request,
            $user,
            (int) $data['owner_user_id'],
        );

        return response()->json($origin !== null ? [
            'state' => 'LOCAL_ENROLLMENT_ALLOWED',
            'origin' => $origin,
            'user' => ['id' => $user->id, 'role' => 'RELAWAN'],
        ] : ['state' => 'ENROLLMENT_DISABLED'], $origin !== null ? 200 : 403)
            ->header('Cache-Control', 'private, no-store');
    }
}
