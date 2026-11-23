<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AuditLog;
use Database\Seeders\Competition\FixtureAccountRoster;
use Database\Seeders\Competition\FixtureDefinition;
use Database\Seeders\Competition\FixtureGuard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Explicit geography-only update of marker-owned demo records; never resets or replays clinical history. */
final class CompetitionKarhutlaGeographySeeder extends Seeder
{
    public function run(): void
    {
        FixtureGuard::check();
        DB::transaction(function (): void {
            DB::select("SELECT pg_advisory_xact_lock(hashtextextended('competition-fixture-v1', 0))");
            DB::statement("SET LOCAL lock_timeout = '5s'");
            $users = FixtureAccountRoster::read();
            $marker = AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->sole()->new_values;
            $previous = AuditLog::where('action', 'COMPETITION_GEOGRAPHY_UPDATED')
                ->where('entity_id', FixtureDefinition::GEOGRAPHY_VERSION)->first();
            if ($previous) {
                return; // Preserve subsequent manual geographic edits on rerun.
            }
            $shelters = array_values($marker['shelter_ids']);
            $facilities = array_values($marker['facility_ids']);
            $eventIds = array_map(fn ($n) => FixtureDefinition::id($n, 3), range(7, 11));
            if (DB::table('emergency_events')->whereIn('id', $eventIds)->count() !== 5) {
                throw new RuntimeException('Demo emergency inventory inconsistent; geography update refused.');
            }
            $before = [
                'region' => DB::table('regions')->selectRaw('id, name, ST_AsText(geometry) as geometry')->where('id', $marker['region_id'])->first(),
                'shelters' => DB::table('shelters')->selectRaw('id, name, address, ST_AsText(location) as location')->whereIn('id', $shelters)->get()->all(),
                'facilities' => DB::table('healthcare_facilities')->whereIn('id', $facilities)->get(['id', 'latitude', 'longitude'])->all(),
                'emergencies' => DB::table('emergency_events')->whereIn('id', $eventIds)->get(['id', 'latitude', 'longitude'])->all(),
            ];
            DB::update('UPDATE regions SET name=?, geometry=ST_Multi(ST_GeomFromText(?,4326)) WHERE id=?', [FixtureDefinition::REGION, FixtureDefinition::GEOMETRY, $marker['region_id']]);
            foreach (FixtureDefinition::POSKO as $n => $point) {
                DB::update('UPDATE shelters SET name=?, address=?, location=ST_SetSRID(ST_MakePoint(?,?),4326) WHERE id=?', [$point['name'], FixtureDefinition::LOCATION_NOTE, $point['longitude'], $point['latitude'], $marker['shelter_ids'][$n]]);
            }
            foreach ($marker['facility_ids'] as $alias => $id) {
                [$lat, $lon] = FixtureDefinition::facilityCoordinates($alias);
                DB::table('healthcare_facilities')->where('id', $id)->update(['latitude' => $lat, 'longitude' => $lon]);
            }
            foreach (range(7, 11) as $n) {
                $point = FixtureDefinition::POSKO[FixtureDefinition::posko($n)];
                $event = DB::table('emergency_events')->where('id', FixtureDefinition::id($n, 3))->first(['shelter_id', 'patient_id']);
                if ($event->shelter_id !== $marker['shelter_ids'][FixtureDefinition::posko($n)] || $event->patient_id !== FixtureDefinition::id($n)) {
                    throw new RuntimeException('Demo emergency ownership inconsistent; transaction rolled back.');
                }
                DB::table('emergency_events')->where('id', FixtureDefinition::id($n, 3))->update(['latitude' => $point['latitude'], 'longitude' => $point['longitude']]);
            }
            AuditLog::create([
                'actor_id' => $users['admin']->id, 'action' => 'COMPETITION_GEOGRAPHY_UPDATED',
                'entity_type' => 'SyntheticFixture', 'entity_id' => FixtureDefinition::GEOGRAPHY_VERSION,
                'old_values' => $before,
                'new_values' => ['fixture' => FixtureDefinition::VERSION, 'geography' => FixtureDefinition::GEOGRAPHY_VERSION, 'synthetic_cases' => true, 'historical_reference_not_live_response' => true],
            ]);
        });
    }
}
