<?php

declare(strict_types=1);
use Database\Seeders\Competition\FixtureAccountUpdate;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
try {
    $input = env('COMPETITION_FIXTURE_PASSWORD_FILE');
    if (! is_string($input) || $input === '') {
        throw new RuntimeException('Private input required.');
    }
    $result = app(FixtureAccountUpdate::class)->run($input);
    echo json_encode(['competition_accounts' => $result, 'credentials_private' => true], JSON_THROW_ON_ERROR), "\n";
} catch (Throwable) {
    fwrite(STDERR, "Account update refused/stopped. Preserve current DB and protected pending files; no automatic retry or recovery.\n");
    exit(1);
}
