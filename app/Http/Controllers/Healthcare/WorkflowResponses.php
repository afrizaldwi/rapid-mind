<?php

declare(strict_types=1);

namespace App\Http\Controllers\Healthcare;

use App\Domain\Healthcare\WorkflowConflict;
use App\Models\EmergencyDispatch;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

trait WorkflowResponses
{
    private function respond(Request $request, Closure $operation, string $message): JsonResponse|RedirectResponse
    {
        try {
            $result = $operation();
        } catch (WorkflowConflict $exception) {
            return $request->wantsJson()
                ? response()->json(['message' => $exception->getMessage(), ...$exception->context], 409)
                : back()->withErrors(['conflict' => $exception->getMessage()]);
        } catch (AuthorizationException|ModelNotFoundException|ValidationException|HttpExceptionInterface $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            if ($request->wantsJson()) {
                throw $exception;
            }
            report($exception);

            return back()->withErrors(['form' => 'Perubahan belum tersimpan karena gangguan server. Muat data terbaru sebelum mencoba lagi.']);
        }

        if (! $request->wantsJson()) {
            return back()->with('message', $message);
        }
        $record = $result->record;
        $isDispatch = $record instanceof EmergencyDispatch;

        return response()->json([
            'message' => $message, 'replayed' => $result->replayed,
            $isDispatch ? 'dispatch' : 'referral' => [
                'id' => $record->id, 'status' => $record->status->value,
                ...($isDispatch ? ['referral_id' => $record->referral_id] : []),
            ],
        ]);
    }
}
