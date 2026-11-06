<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Middleware\AuthenticateJwt;
use App\Http\Middleware\ClinicalBrowserPrivacy;
use App\Http\Middleware\ValidateWebSessionVersion;
use App\Models\User;
use Illuminate\Container\Container;
use Illuminate\Contracts\Routing\ResponseFactory as ResponseFactoryContract;
use Illuminate\Database\Connection;
use Illuminate\Database\ConnectionResolver;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Routing\ResponseFactory;
use Illuminate\Routing\RouteCollection;
use Illuminate\Routing\UrlGenerator;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Facade;
use Inertia\Inertia;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Response;

/** No Laravel boot, PDO, HTTP, PostgreSQL, or real session storage. */
final class ClinicalBrowserPrivacyTest extends TestCase
{
    private Container $container;

    protected function setUp(): void
    {
        $this->container = new Container();
        Container::setInstance($this->container);
        Facade::setFacadeApplication($this->container);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        User::unsetConnectionResolver();
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication(null);
        Container::setInstance(null);
    }

    private function request(string $path, string $method = 'GET'): Request
    {
        $request = Request::create('http://localhost:8080' . $path, $method);
        $session = new Store('synthetic', new ArraySessionHandler(120));
        $request->setLaravelSession($session);
        $redirect = new Redirector(new UrlGenerator(new RouteCollection(), $request));
        $redirect->setSession($session);
        $this->container->instance('redirect', $redirect);
        $this->container->instance(ResponseFactoryContract::class, new ResponseFactory(
            Mockery::mock(\Illuminate\Contracts\View\Factory::class),
            $redirect,
        ));

        return $request;
    }

    private function assertPrivate(Response $response): void
    {
        self::assertTrue($response->headers->hasCacheControlDirective('private'));
        self::assertTrue($response->headers->hasCacheControlDirective('no-store'));
        self::assertSame('0', (string) $response->headers->getCacheControlDirective('max-age'));
        self::assertSame('no-cache', $response->headers->get('Pragma'));
    }

    #[DataProvider('responsePaths')]
    public function test_private_responses_preserve_status_body_and_location(string $path, string $method, int $status, bool $clinical): void
    {
        Inertia::shouldReceive('encryptHistory')->times($clinical ? 1 : 0);
        $response = new Response('synthetic-body', $status, ['Location' => '/login', 'Cache-Control' => 'public, max-age=600']);
        $actual = (new ClinicalBrowserPrivacy())->handle($this->request($path, $method), fn() => $response);
        self::assertSame($response, $actual);
        self::assertSame($status, $actual->getStatusCode());
        self::assertSame('synthetic-body', $actual->getContent());
        self::assertSame('/login', $actual->headers->get('Location'));
        self::assertFalse($actual->headers->hasCacheControlDirective('public'));
        $this->assertPrivate($actual);
    }

    public static function responsePaths(): array
    {
        return [
            ['/', 'GET', 200, false],
            ['/login?reauth=1', 'GET', 200, false],
            ['/login', 'POST', 422, false],
            ['/logout', 'POST', 302, false],
            ['/login', 'POST', 419, false],
            ['/login', 'POST', 429, false],
            ['/relawan/home', 'GET', 200, true],
            ['/healthcare/patients/example', 'GET', 403, true],
            ['/relawan/session-status', 'GET', 401, true],
            ['/api/auth/login', 'POST', 401, true],
            ['/api/auth/refresh', 'POST', 200, true],
            ['/api/auth/logout', 'POST', 200, true],
            ['/broadcasting/auth', 'POST', 403, false],
        ];
    }

    #[DataProvider('rejectedSessions')]
    public function test_actual_session_early_returns_are_wrapped(bool $active, bool $json, string $path, int $status): void
    {
        Inertia::shouldReceive('encryptHistory')->once();
        $request = $this->request($path);
        if ($json) $request->headers->set('Accept', 'application/json');
        $request->session()->put(ValidateWebSessionVersion::USER_ID, 101);
        $request->session()->put(ValidateWebSessionVersion::VERSION, 1);
        // Actual Eloquent hydration, with SELECT returning only an in-memory row.
        // No PDO exists: any unexpected database operation fails.
        $connection = Mockery::mock(Connection::class . '[select]', [null, 'synthetic']);
        $connection->shouldReceive('select')->once()->andReturn([(object) [
            'id' => 101,
            'is_active' => $active,
            'token_version' => 2,
            'role' => 'RELAWAN',
        ]]);
        $resolver = new ConnectionResolver(['synthetic' => $connection]);
        $resolver->setDefaultConnection('synthetic');
        User::setConnectionResolver($resolver);
        $guard = Mockery::mock();
        $guard->shouldReceive('check')->once()->andReturn(true);
        $guard->shouldReceive('id')->once()->andReturn(101);
        $guard->shouldReceive('logout')->once();
        Auth::swap(Mockery::mock());
        Auth::shouldReceive('guard')->with('web')->once()->andReturn($guard);
        $response = (new ClinicalBrowserPrivacy())->handle($request, fn($request) => (new ValidateWebSessionVersion())->handle($request, fn() => self::fail('Rejected session reached controller')));
        self::assertSame($status, $response->getStatusCode());
        self::assertNull($request->session()->get(ValidateWebSessionVersion::USER_ID));
        if (!$json) self::assertSame('http://localhost:8080/login', $response->headers->get('Location'));
        $this->assertPrivate($response);
    }

    public static function rejectedSessions(): array
    {
        return [
            [true, true, '/relawan/session-status', 401],
            [false, true, '/relawan/session-status', 403],
            [true, false, '/relawan/home', 302],
            [true, true, '/healthcare/patients', 401]
        ];
    }

    public function test_missing_api_bearer_remains_unauthorized_and_private(): void
    {
        Inertia::shouldReceive('encryptHistory')->once();
        $request = $this->request('/api/auth/me');
        $response = (new ClinicalBrowserPrivacy())->handle($request, fn($request) => (new AuthenticateJwt())->handle($request, fn() => self::fail('Missing bearer reached controller')));
        self::assertSame(401, $response->getStatusCode());
        $this->assertPrivate($response);
    }

    public function test_real_bootstrap_places_one_privacy_wrapper_before_session_and_csrf(): void
    {
        // Resolving the kernel configures middleware only; do not bootstrap it.
        $app = require dirname(__DIR__, 2) . '/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
        foreach (['web', 'api'] as $group) {
            $stack = $kernel->getMiddlewareGroups()[$group];
            self::assertSame(ClinicalBrowserPrivacy::class, $stack[0]);
            self::assertCount(1, array_keys($stack, ClinicalBrowserPrivacy::class));
        }
        self::assertFalse($app->isBooted());
    }

    public function test_public_static_paths_are_unchanged(): void
    {
        Inertia::shouldReceive('encryptHistory')->never();
        $response = new Response('asset', 200, ['Cache-Control' => 'public, max-age=600']);
        (new ClinicalBrowserPrivacy())->handle($this->request('/build/offline.html'), fn() => $response);
        self::assertSame('max-age=600, public', $response->headers->get('Cache-Control'));
        self::assertFalse($response->headers->has('Pragma'));
    }
}
