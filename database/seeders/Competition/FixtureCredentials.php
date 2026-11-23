<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use RuntimeException;

/** Separate private credential lifecycle; never print or rotate on a rerun. */
final class FixtureCredentials
{
    public static function load(bool $allowCreate = true, bool $legacy = false): array
    {
        $directory = storage_path('app/private/competition-fixture');
        if (file_exists($directory.'/.account-update.pending.json') || is_link($directory.'/.account-update.pending.json')) {
            throw new RuntimeException('Fixture credential reconciliation pending; stop for explicit recovery.');
        }
        foreach ([storage_path(), storage_path('app'), storage_path('app/private'), $directory] as $path) {
            if (is_link($path)) {
                throw new RuntimeException('Fixture credential symlink refused.');
            }
        }
        if (! is_dir($directory) && ! $allowCreate) {
            throw new RuntimeException('Fixture credentials missing; no automatic regeneration.');
        }
        if (! is_dir($directory) && ! mkdir($directory, 0700, true)) {
            throw new RuntimeException('Private credential directory unavailable.');
        }
        self::protected($directory, 0700);
        $path = "$directory/credentials.json";
        if (! file_exists($path) && ! is_link($path)) {
            if (! $allowCreate) {
                throw new RuntimeException('Fixture credentials missing; no automatic regeneration.');
            }
            $input = env('COMPETITION_FIXTURE_PASSWORD_FILE');
            $shared = is_string($input) && $input !== '' ? FixturePasswordInput::read($input) : null;
            if (app()->environment('local') && $shared === null) {
                throw new RuntimeException('Local fixture creation requires explicit private password input.');
            }
            $accounts = [];
            foreach (FixtureDefinition::ACCOUNTS as $alias => $role) {
                $accounts[$alias] = ['email' => FixtureDefinition::email($alias), 'password' => $shared ?? bin2hex(random_bytes(24))];
            }
            $oldMask = umask(0077);
            try {
                $file = fopen($path, 'x');
                if (! $file) {
                    throw new RuntimeException('Exclusive credential creation failed.');
                }
                try {
                    $json = json_encode(['version' => FixtureDefinition::VERSION, 'identity_version' => FixtureDefinition::IDENTITY_VERSION, 'accounts' => $accounts], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
                    if (fwrite($file, $json) !== strlen($json) || ! fflush($file) || ! fsync($file)) {
                        throw new RuntimeException('Credential persistence failed.');
                    }
                } finally {
                    fclose($file);
                }
            } finally {
                umask($oldMask);
            }
        }
        self::protected($path, 0600);
        if (! is_file($path) || stat($path)['nlink'] !== 1) {
            throw new RuntimeException('Credential file must be a single regular private file.');
        }
        $data = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        if (($legacy ? isset($data['identity_version']) : ($data['identity_version'] ?? null) !== FixtureDefinition::IDENTITY_VERSION)
            || ($data['version'] ?? null) !== FixtureDefinition::VERSION || array_keys($data['accounts'] ?? []) !== array_keys(FixtureDefinition::ACCOUNTS)) {
            throw new RuntimeException('Credential inventory does not match fixture version.');
        }
        foreach ($data['accounts'] as $alias => $account) {
            if (($account['email'] ?? null) !== ($legacy ? $alias.'@competition.example.invalid' : FixtureDefinition::email($alias))
                || ! is_string($account['password'] ?? null)
                || ($legacy && ! preg_match('/^[a-f0-9]{48}$/D', $account['password'])) || strlen($account['password']) < 8 || strlen($account['password']) > 128
            ) {
                throw new RuntimeException('Invalid protected fixture credentials.');
            }
        }

        return $data['accounts'];
    }

    private static function protected(string $path, int $mode): void
    {
        clearstatcache(true, $path);
        if (
            is_link($path) || (fileperms($path) & 0777) !== $mode
            || ! function_exists('posix_geteuid') || fileowner($path) !== posix_geteuid()
        ) {
            throw new RuntimeException('Fixture credential ownership/permissions unsafe; no automatic repair.');
        }
    }
}
