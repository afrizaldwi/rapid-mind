<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use App\Models\AuditLog;
use App\Models\HealthcareFacility;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\User;
use RuntimeException;

/** Resolve only marker-owned fixture accounts and their original assignments. */
final class FixtureAccountRoster
{
    public static function read(bool $legacy = false, bool $strictNames = true): array
    {
        $marker = AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->get();
        if ($marker->count() !== 1 || $marker->first()->entity_id !== FixtureDefinition::VERSION) {
            throw new RuntimeException('Competition account marker unavailable.');
        }
        $m = $marker->first()->new_values;
        if (($m['fixture'] ?? null) !== FixtureDefinition::VERSION
            || ! in_array(Region::find($m['region_id'] ?? null)?->name, [FixtureDefinition::REGION, FixtureDefinition::LEGACY_REGION], true)
            || count($m['user_ids'] ?? []) !== 6 || array_diff(array_keys($m['user_ids'] ?? []), array_keys(FixtureDefinition::ACCOUNTS))
            || count(array_unique($m['user_ids'])) !== 6
        ) {
            throw new RuntimeException('Competition account manifest inconsistent.');
        }
        foreach (['a', 'b'] as $key) {
            $f = HealthcareFacility::find($m['facility_ids'][$key] ?? null);
            if (! $f?->is_active || $f->name !== '[SINTETIS KOMPETISI] Faskes ' . strtoupper($key)) {
                throw new RuntimeException('Competition facility inconsistent.');
            }
        }
        foreach (range(1, 3) as $n) {
            $s = Shelter::find($m['shelter_ids'][$n] ?? null);
            if (
                ! $s?->is_active || ! in_array($s->name, [FixtureDefinition::POSKO[$n]['name'], '[SINTETIS KOMPETISI] Posko ' . $n], true)
                || $s->region_id !== $m['region_id']
                || $s->primary_facility_id !== $m['facility_ids'][FixtureDefinition::facility($n)]
            ) {
                throw new RuntimeException('Competition Posko routing inconsistent.');
            }
        }
        $users = [];
        foreach (FixtureDefinition::ACCOUNTS as $alias => $role) {
            $u = User::find($m['user_ids'][$alias]);
            $shelter = $role === 'RELAWAN' ? $m['shelter_ids'][(int) substr($alias, -1)] : null;
            $facility = $role === 'HEALTHCARE' ? $m['facility_ids'][substr($alias, -1)] : null;
            if (
                ! $u?->is_active || $u->role->value !== $role || $u->shelter_id !== $shelter
                || $u->facility_id !== $facility
                || $u->email !== ($legacy ? $alias . '@competition.example.invalid' : FixtureDefinition::email($alias))
                || ($strictNames && $u->name !== ($legacy ? '[SINTETIS KOMPETISI] ' . $alias : FixtureDefinition::name($alias)))
            ) {
                throw new RuntimeException('Competition account identity or assignment inconsistent.');
            }
            $users[$alias] = $u;
        }

        return $users;
    }
}
