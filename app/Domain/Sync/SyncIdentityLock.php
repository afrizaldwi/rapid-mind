<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use Illuminate\Support\Facades\DB;

final class SyncIdentityLock
{
    /** Serialize concurrent first submissions for the same stable UUID before a row exists. */
    public static function acquire(array $identities): void
    {
        $keys = array_unique(array_map(fn (array $identity) => implode(':', $identity), $identities));
        sort($keys);
        foreach ($keys as $key) {
            DB::select('select pg_advisory_xact_lock(hashtext(?))', [$key]);
        }
    }
}
