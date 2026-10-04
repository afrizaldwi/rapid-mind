<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="utf-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'RAPID-MIND') }}</title>

    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3">
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3">
    <link rel="apple-touch-icon" href="/pwa-192.png?v=3">
    <link rel="manifest" href="/manifest.webmanifest?v=3" crossorigin="use-credentials">
    <meta name="theme-color" content="#0F766E">
    @php
        // When accessed via external tunnel / ngrok / non-local domains,
        // Vite's hot file (http://127.0.0.1:5173 or http://0.0.0.0:5173) causes CORS / Private Network Access (loopback) blocks.
        // Automatically switch to compiled production build assets if accessed remotely or via tunnel.
        $requestHost = request()->getHost();
        $isLocalHost = in_array($requestHost, ['localhost', '127.0.0.1', '::1'])
            || str_ends_with($requestHost, '.local')
            || str_ends_with($requestHost, '.test');

        if (!$isLocalHost) {
            $vite = app(\Illuminate\Foundation\Vite::class);
            if ($vite->isRunningHot()) {
                $hotContent = @file_get_contents($vite->hotFile()) ?: '';
                if (!str_contains($hotContent, $requestHost)) {
                    $vite->useHotFile('/dev/null');
                }
            }
        }
    @endphp
    @vite('resources/js/app.ts')
    @inertiaHead
</head>

<body>
    @inertia
</body>

</html>
