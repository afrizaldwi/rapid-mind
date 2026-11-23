<?php

namespace App\Http\Middleware;

use App\Enums\EmergencyStatus;
use App\Enums\UserRole;
use App\Models\EmergencyEvent;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $shared = [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role instanceof \App\Enums\UserRole ? $request->user()->role->value : (string)$request->user()->role,
                    'shelter_id' => $request->user()->shelter_id,
                    'facility_id' => $request->user()->facility_id,
                    'shelter' => $request->user()->shelter ? ['id' => $request->user()->shelter->id, 'name' => $request->user()->shelter->name] : null,
                    'facility' => $request->user()->facility ? ['id' => $request->user()->facility->id, 'name' => $request->user()->facility->name] : null,
                ] : null,
            ],
            'offlineEnrollment' => fn () => $request->user()?->role === UserRole::RELAWAN ? [
                'owner' => $request->user()->id,
                'origin' => \App\Support\LocalOfflineEnrollment::resolvedOrigin(
                    (string) app()->environment(), (string) config('app.url'),
                    (bool) config('offline.local_enrollment', false), $request,
                    $request->user(), (int) $request->user()->id, (array) config('offline.demo_origins', []),
                ),
                'allowed' => \App\Support\LocalOfflineEnrollment::allowed(
                    (string) app()->environment(), (string) config('app.url'),
                    (bool) config('offline.local_enrollment', false), $request,
                    $request->user(), (int) $request->user()->id,
                    (array) config('offline.demo_origins', []),
                ),
            ] : null,
            'clinicalScopeAvailable' => \App\Domain\Healthcare\HealthcareCaseAccess::available(),
            'healthcareChannel' => \App\Domain\Healthcare\HealthcareCaseAccess::available()
                && \App\Domain\Healthcare\HealthcareCaseAccess::facility($request->user()) !== null
                ? \App\Domain\Healthcare\CaseAudience::channel($request->user()->fresh()) : null,
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];

        if ($request->user()?->role === UserRole::HEALTHCARE && $request->is('healthcare/*')) {
            $shared['pendingT0Count'] = fn () => \App\Domain\Healthcare\HealthcareCaseAccess::available()
                ? \App\Domain\Healthcare\HealthcareCaseAccess::cases(EmergencyEvent::query(), $request->user())
                    ->where('status', EmergencyStatus::PENDING)->count() : null;
        }

        return $shared;
    }
}
