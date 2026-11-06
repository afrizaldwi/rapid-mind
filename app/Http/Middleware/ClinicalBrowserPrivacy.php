<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ClinicalBrowserPrivacy
{
    public function handle(Request $request, Closure $next): Response
    {
        $clinical = $request->is('relawan', 'relawan/*', 'healthcare', 'healthcare/*', 'api/*');
        if ($clinical) {
            Inertia::encryptHistory();
        }

        $response = $next($request);
        if ($clinical) {
            $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}
