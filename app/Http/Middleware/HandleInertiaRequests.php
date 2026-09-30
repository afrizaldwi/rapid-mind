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
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];

        if ($request->user()?->role === UserRole::HEALTHCARE && $request->is('healthcare/*')) {
            $shared['pendingT0Count'] = fn () => EmergencyEvent::where('status', EmergencyStatus::PENDING)->count();
        }

        return $shared;
    }
}
