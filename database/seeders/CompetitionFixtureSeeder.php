<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Events\AssessmentUpdated;
use App\Events\DispatchUpdated;
use App\Events\EmergencyCreated;
use App\Events\EmergencyUpdated;
use App\Events\ReferralUpdated;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\ResponseUnit;
use App\Models\Shelter;
use App\Models\User;
use Database\Seeders\Competition\FixtureCases;
use Database\Seeders\Competition\FixtureCredentials;
use Database\Seeders\Competition\FixtureDefinition;
use Database\Seeders\Competition\FixtureEmptyDataset;
use Database\Seeders\Competition\FixtureGuard;
use Database\Seeders\Competition\FixtureOrganizations;
use Illuminate\Database\QueryException;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/** Additive, all-or-nothing fixture. Never called by DatabaseSeeder or legacy seeders. */
final class CompetitionFixtureSeeder extends Seeder
{
    public function run(): void
    {
        $date = FixtureGuard::check();
        try {
            Event::fakeFor(function () use ($date): void {
                DB::transaction(function () use ($date): void {
                    DB::select("SELECT pg_advisory_xact_lock(hashtextextended('competition-fixture-v1', 0))");
                    $marker = AuditLog::where('action', 'COMPETITION_FIXTURE_COMPLETED')->where('entity_id', FixtureDefinition::VERSION)->first();
                    if ($marker) {
                        $this->assertCompleted($marker);

                        return; // Preserve manual progress, assignments, passwords and histories.
                    }
                    $this->assertNoCollisions();
                    FixtureEmptyDataset::check();
                    $credentials = FixtureCredentials::load();
                    Carbon::withTestNow(Carbon::parse($date . ' 00:00:00 UTC')->subDays(14), function () use ($date, $credentials): void {
                        $actors = app(FixtureOrganizations::class)->create($credentials);
                        app(FixtureCases::class)->create($actors, $date);
                        Carbon::setTestNow(Carbon::parse($date . ' 00:00:00 UTC'));
                        AuditLog::create([
                            'actor_id' => $actors['users']['admin']->id,
                            'action' => 'COMPETITION_FIXTURE_COMPLETED',
                            'entity_type' => 'SyntheticFixture',
                            'entity_id' => FixtureDefinition::VERSION,
                            'new_values' => [
                                'fixture' => FixtureDefinition::VERSION,
                                'anchor_date_utc' => $date,
                                'region_id' => $actors['region']->id,
                                'facility_ids' => array_map(fn($item) => $item->id, $actors['facilities']),
                                'shelter_ids' => array_map(fn($item) => $item->id, $actors['posko']),
                                'unit_ids' => array_map(fn($item) => $item->id, $actors['units']),
                                'user_ids' => array_map(fn($user) => $user->id, $actors['users']),
                                'scripted_synthetic_history' => true,
                                'notifications_suppressed' => true,
                            ],
                        ]);
                    });
                });
            }, [AssessmentUpdated::class, EmergencyCreated::class, EmergencyUpdated::class, ReferralUpdated::class, DispatchUpdated::class]);
        } catch (QueryException) {
            // SQL error bindings can contain password hashes. Never expose them
            // through the console exception chain or an automatic recovery path.
            throw new RuntimeException('Competition fixture database operation failed; inspect protected state, no automatic recovery.');
        }
        $this->command?->info('Synthetic competition fixture ready. Credentials remain in protected local storage; no notification delivery is claimed.');
    }

    private function assertNoCollisions(): void
    {
        if (
            Region::where('name', FixtureDefinition::REGION)->exists()
            || User::whereIn('email', array_map(FixtureDefinition::email(...), array_keys(FixtureDefinition::ACCOUNTS)))->exists()
            || Shelter::where('name', 'like', '[SINTETIS KOMPETISI]%')->exists()
            || HealthcareFacility::where('name', 'like', '[SINTETIS KOMPETISI]%')->exists()
            || ResponseUnit::whereIn('code', ['COMP-SYNTH-V1-A', 'COMP-SYNTH-V1-B'])->exists()
            || Patient::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n), range(1, 12)))->exists()
            || Assessment::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n, 2), range(1, 12)))->exists()
            || EmergencyEvent::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n, 3), range(1, 12)))->exists()
        ) {
            throw new RuntimeException('Fixture identity collision or partial installation; no existing data changed.');
        }
    }

    private function assertCompleted(AuditLog $marker): void
    {
        $credentials = FixtureCredentials::load(false);
        $manifest = $marker->new_values;
        if (($manifest['fixture'] ?? null) !== FixtureDefinition::VERSION || ! Region::find($manifest['region_id'] ?? null)) {
            throw new RuntimeException('Fixture marker inconsistent; no automatic repair.');
        }
        foreach ([HealthcareFacility::class => ['facility_ids', 2], Shelter::class => ['shelter_ids', 3], ResponseUnit::class => ['unit_ids', 2]] as $model => [$field, $count]) {
            $ids = array_values($manifest[$field] ?? []);
            if (count($ids) !== $count || $model::whereIn('id', $ids)->count() !== $count) {
                throw new RuntimeException('Fixture organization missing; no automatic repair.');
            }
        }
        foreach ($credentials as $alias => $credential) {
            $user = User::find($manifest['user_ids'][$alias] ?? null);
            if (! $user || $user->email !== $credential['email'] || ! Hash::check($credential['password'], $user->password)) {
                throw new RuntimeException('Fixture account/credential changed; no rotation or automatic repair.');
            }
        }
        if (
            EmergencyEvent::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n, 3), range(7, 11)))->count() !== 5
            || Patient::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n), range(1, 12)))->count() !== 12
            || Assessment::whereIn('id', array_map(fn($n) => FixtureDefinition::id($n, 2), range(1, 12)))->count() !== 12
        ) {
            throw new RuntimeException('Fixture records missing; no automatic repair.');
        }
    }
}
