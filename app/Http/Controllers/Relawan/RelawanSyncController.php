<?php

declare(strict_types=1);

namespace App\Http\Controllers\Relawan;

use App\Domain\Sync\AssessmentSynchronizer;
use App\Domain\Sync\EmergencySynchronizer;
use App\Domain\Sync\SyncPayload;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RelawanSyncController extends Controller
{
    public function assessment(Request $request, AssessmentSynchronizer $sync): JsonResponse
    {
        $result = $sync->synchronize(SyncPayload::assessment($request), $request->user());
        return response()->json($result, $result['created'] ? 201 : 200);
    }

    public function emergency(Request $request, EmergencySynchronizer $sync): JsonResponse
    {
        $result = $sync->synchronize(SyncPayload::emergency($request), $request->user());
        return response()->json($result, $result['created'] ? 201 : 200);
    }
}
