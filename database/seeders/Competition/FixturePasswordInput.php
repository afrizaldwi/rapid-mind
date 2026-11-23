<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use RuntimeException;

/** Explicit private CLI input; never an application or frontend default. */
final class FixturePasswordInput
{
    public static function read(string $path): string
    {
        clearstatcache(true, $path);
        if (! app()->runningInConsole() || ! app()->environment(['local', 'testing'])
            || is_link($path) || ! is_file($path) || (fileperms($path) & 0777) !== 0600
            || fileowner($path) !== posix_geteuid() || stat($path)['nlink'] !== 1) {
            throw new RuntimeException('Private fixture password input refused.');
        }
        $value = rtrim(file_get_contents($path), "\r\n");
        if (strlen($value) < 8 || strlen($value) > 128) {
            throw new RuntimeException('Private fixture password input invalid.');
        }

        return $value;
    }
}
