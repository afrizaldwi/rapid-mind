<?php

declare(strict_types=1);

namespace App\Http\Controllers\Healthcare;

use App\Domain\Healthcare\ClinicalReferralWorkflow;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ClinicalReferralController extends Controller
{
    use WorkflowResponses;

    public function complete(Request $request, string $referralId, ClinicalReferralWorkflow $workflow): JsonResponse|RedirectResponse
    {
        return $this->respond($request,
            fn () => $workflow->complete($request->user(), $referralId, $request->only(['expected_status', 'notes'])),
            'Pekerjaan rujukan ditandai selesai di sistem.');
    }
}
