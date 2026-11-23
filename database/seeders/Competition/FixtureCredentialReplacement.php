<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use RuntimeException;

/** Durable pending marker makes any interrupted DB/file handoff fail closed. */
final class FixtureCredentialReplacement
{
    private string $directory;

    private string $originalHash;

    private string $nextHash;

    public function __construct()
    {
        $this->directory = storage_path('app/private/competition-fixture');
        $this->originalHash = hash_file('sha256', $this->directory.'/credentials.json');
        foreach (['.account-update.pending.json', '.account-update.next.json'] as $file) {
            if (file_exists($this->directory.'/'.$file) || is_link($this->directory.'/'.$file)) {
                throw new RuntimeException('Competition credential reconciliation pending; explicit recovery required.');
            }
        }
    }

    public function stage(array $accounts): void
    {
        $this->write('.account-update.pending.json', ['state' => 'prepared', 'identity_version' => FixtureDefinition::IDENTITY_VERSION]);
        $this->write('.account-update.next.json', ['version' => FixtureDefinition::VERSION,
            'identity_version' => FixtureDefinition::IDENTITY_VERSION, 'accounts' => $accounts]);
        $this->nextHash = hash_file('sha256', $this->directory.'/.account-update.next.json');
    }

    public function publish(): void
    {
        $path = $this->directory.'/credentials.json';
        $next = $this->directory.'/.account-update.next.json';
        foreach ([$path, $next, $this->directory.'/.account-update.pending.json'] as $file) {
            clearstatcache(true, $file);
            if (is_link($file) || ! is_file($file) || (fileperms($file) & 0777) !== 0600
                || fileowner($file) !== posix_geteuid() || stat($file)['nlink'] !== 1) {
                throw new RuntimeException('Competition credential publication unsafe; explicit recovery required.');
            }
        }
        if (hash_file('sha256', $path) !== $this->originalHash
            || hash_file('sha256', $next) !== $this->nextHash || ! rename($next, $path)) {
            throw new RuntimeException('Competition credential publication failed; explicit recovery required.');
        }
        if (hash_file('sha256', $path) !== $this->nextHash
            || ! unlink($this->directory.'/.account-update.pending.json')) {
            throw new RuntimeException('Competition credential completion pending; explicit recovery required.');
        }
    }

    private function write(string $name, array $data): void
    {
        $old = umask(0077);
        try {
            $file = fopen($this->directory.'/'.$name, 'x');
            if (! $file) {
                throw new RuntimeException('Competition credential staging refused.');
            }
            try {
                $bytes = json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
                if (fwrite($file, $bytes) !== strlen($bytes) || ! fflush($file) || ! fsync($file)) {
                    throw new RuntimeException('Competition credential staging not durable.');
                }
            } finally {
                fclose($file);
            }
        } finally {
            umask($old);
        }
    }
}
