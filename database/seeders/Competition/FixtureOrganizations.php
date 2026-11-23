<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use App\Models\AuditLog;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\ResponseUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class FixtureOrganizations
{
    public function create(array $credentials): array
    {
        $region = Region::create(['name' => FixtureDefinition::REGION]);
        DB::update('UPDATE regions SET geometry = ST_Multi(ST_GeomFromText(?,4326)) WHERE id = ?', [FixtureDefinition::GEOMETRY, $region->id]);
        $facilities = $units = $posko = $users = [];
        foreach (['a', 'b'] as $alias) {
            [$lat, $lon] = FixtureDefinition::facilityCoordinates($alias);
            $facilities[$alias] = HealthcareFacility::forceCreate([
                'name' => '[SINTETIS KOMPETISI] Faskes '.strtoupper($alias),
                'type' => 'Puskesmas', 'address' => 'Lokasi simulasi, bukan alamat layanan nyata.',
                'is_active' => true, 'latitude' => $lat, 'longitude' => $lon,
            ]);
            $units[$alias] = ResponseUnit::create([
                'code' => 'COMP-SYNTH-V1-'.strtoupper($alias), 'name' => '[SINTETIS KOMPETISI] Unit '.strtoupper($alias),
                'facility_id' => $facilities[$alias]->id, 'is_active' => true,
            ]);
        }
        foreach (range(1, 3) as $n) {
            $point = FixtureDefinition::POSKO[$n];
            $posko[$n] = Shelter::create([
                'region_id' => $region->id, 'name' => $point['name'],
                'address' => FixtureDefinition::LOCATION_NOTE,
                'primary_facility_id' => $facilities[FixtureDefinition::facility($n)]->id, 'is_active' => true,
            ]);
            DB::update('UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(?, ?),4326) WHERE id = ?', [$point['longitude'], $point['latitude'], $posko[$n]->id]);
        }
        foreach (FixtureDefinition::ACCOUNTS as $alias => $role) {
            $n = $role === 'RELAWAN' ? (int) substr($alias, -1) : null;
            $users[$alias] = User::create([
                'name' => FixtureDefinition::name($alias), 'email' => $credentials[$alias]['email'],
                'password' => $credentials[$alias]['password'], 'role' => $role,
                'shelter_id' => $n ? $posko[$n]->id : null,
                'facility_id' => $role === 'HEALTHCARE' ? $facilities[substr($alias, -1)]->id : null,
                'phone_number' => null, 'is_active' => true, 'token_version' => 1,
            ]);
        }
        foreach ($posko as $shelter) {
            AuditLog::create([
                'actor_id' => $users['admin']->id, 'action' => 'COMPETITION_POSKO_ROUTED',
                'entity_type' => 'Shelter', 'entity_id' => $shelter->id,
                'new_values' => ['primary_facility_id' => $shelter->primary_facility_id, 'fixture' => FixtureDefinition::VERSION],
            ]);
        }
        foreach (range(1, 12) as $n) {
            Patient::forceCreate([
                'id' => FixtureDefinition::id($n), 'nik' => null,
                'name' => sprintf('[SINTETIS KOMPETISI] Penyintas %02d', $n),
                'age' => [28, 45, 61, 19, 33, 54, 26, 47, 38, 65, 42, 31][$n - 1],
                'gender' => $n % 2 ? 'Laki-laki' : 'Perempuan',
                'shelter_id' => $posko[FixtureDefinition::posko($n)]->id,
                'created_by' => $users['relawan-'.FixtureDefinition::posko($n)]->id,
            ]);
        }

        return compact('region', 'facilities', 'posko', 'units', 'users');
    }
}
