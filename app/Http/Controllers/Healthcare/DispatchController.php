<?php

declare(strict_types=1);

namespace App\Http\Controllers\Healthcare;

use App\Domain\Healthcare\DispatchWorkflow;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class DispatchController extends Controller
{
    use WorkflowResponses;

    public function __construct(private readonly DispatchWorkflow $workflow) {}

    public function store(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        return $this->respond($request,
            fn () => $this->workflow->assign($request->user(), $emergencyId, $request->only([
                'response_unit_id', 'referral_id', 'target_source', 'target_description', 'notes',
            ])), 'Penugasan respons tersimpan di sistem.');
    }

    public function status(Request $request, string $dispatchId): JsonResponse|RedirectResponse
    {
        return $this->respond($request,
            fn () => $this->workflow->transition($request->user(), $dispatchId, $request->only([
                'expected_status', 'status', 'notes',
            ])), 'Status respons tersimpan di sistem.');
    }

    public function referral(Request $request, string $dispatchId): JsonResponse|RedirectResponse
    {
        return $this->respond($request,
            fn () => $this->workflow->linkReferral($request->user(), $dispatchId, $request->only([
                'expected_referral_id', 'referral_id', 'notes',
            ])), 'Hubungan rujukan respons tersimpan di sistem.');
    }
}
