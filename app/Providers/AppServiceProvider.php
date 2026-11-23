<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $loginLimits = function (Request $request): array {
            $identifier = $request->input('email');
            $normalized = is_string($identifier)
                ? mb_strtolower(trim(mb_substr($identifier, 0, 255)))
                : '';
            // Email and username aliases for the same known account share a budget.
            $userId = $normalized !== ''
                ? User::whereRaw('lower(email) = ?', [$normalized])
                    ->orWhereRaw('lower(name) = ?', [$normalized])->value('id')
                : null;
            $identity = $userId === null ? 'unknown:'.$normalized : 'user:'.$userId;

            return [
                Limit::perMinute(5)->by('login-identity:'.self::privateKey($identity)),
                Limit::perMinute(30)->by('login-ip:'.self::sourceKey($request)),
            ];
        };

        RateLimiter::for('web-login', function (Request $request) use ($loginLimits): array {
            return array_map(
                fn (Limit $limit) => $limit->response(function (Request $request, array $headers) {
                    $response = Inertia::render('Auth/Login', [
                        'errors' => ['email' => 'Terlalu banyak percobaan masuk. Coba lagi sebentar.'],
                    ])->toResponse($request);
                    $response->setStatusCode(429);
                    foreach ($headers as $name => $value) {
                        $response->headers->set($name, $value);
                    }

                    return $response;
                }),
                $loginLimits($request),
            );
        });

        RateLimiter::for('api-login', fn (Request $request): array => array_map(
            fn (Limit $limit) => $limit->response(self::apiThrottleResponse(...)),
            $loginLimits($request),
        ));

        RateLimiter::for('api-refresh', function (Request $request): array {
            $credential = $request->input('refresh_token');
            $credentialKey = is_string($credential) && strlen($credential) <= 256
                ? self::privateKey($credential)
                : self::privateKey('invalid-credential');

            return [
                Limit::perMinute(10)->by('refresh-credential:'.$credentialKey)->response(self::apiThrottleResponse(...)),
                Limit::perMinute(60)->by('refresh-ip:'.self::sourceKey($request))->response(self::apiThrottleResponse(...)),
            ];
        });
    }

    private static function privateKey(string $value): string
    {
        return hash_hmac('sha256', $value, config('app.key'));
    }

    private static function sourceKey(Request $request): string
    {
        // Nginx passes its real peer as FastCGI REMOTE_ADDR. The current
        // wildcard trusted-proxy setting makes client-supplied XFF unsuitable.
        return self::privateKey((string) $request->server('REMOTE_ADDR', 'unknown'));
    }

    private static function apiThrottleResponse(Request $request, array $headers): JsonResponse
    {
        return response()->json(['message' => 'Terlalu banyak percobaan. Coba lagi sebentar.'], 429)
            ->withHeaders($headers);
    }
}
