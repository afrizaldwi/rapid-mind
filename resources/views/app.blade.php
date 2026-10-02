<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="utf-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'RAPID-MIND') }}</title>

    <link rel="manifest" href="/build/manifest.webmanifest">
    <meta name="theme-color" content="#0F766E">
    @vite('resources/js/app.ts')
    @inertiaHead
</head>

<body>
    @inertia
</body>

</html>
