<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DispatchTargetSource;
use App\Enums\EmergencyDispatchEventType;
use App\Enums\EmergencyDispatchStatus;
use App\Enums\EmergencyStatus;
use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Models\EmergencyDispatch;
use App\Models\EmergencyDispatchHistory;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use App\Models\Region;
use App\Models\ResponseUnit;
use App\Models\Shelter;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class EmergencyDispatchDomainTest extends TestCase
{
    use RefreshDatabase;

    private function assertConstraintViolation(Closure $write, string $sqlState): void
    {
        // Roll back the savepoint so PostgreSQL remains usable after the expected error.
        try {
            DB::transaction($write);
            $this->fail('Expected a PostgreSQL constraint violation.');
        } catch (QueryException $exception) {
            $this->assertSame($sqlState, $exception->errorInfo[0]);
        }
    }

    private function shelter(): Shelter
    {
        return Shelter::create([
            'region_id' => Region::create(['name' => 'Wilayah Sintetis Uji'])->id,
            'name' => 'Posko Sintetis Uji',
            'address' => 'Lokasi sintetis untuk pengujian',
        ]);
    }

    public function test_fresh_migration_chain_creates_the_domain_and_postgis_remains_available(): void
    {
        foreach (['response_units', 'emergency_dispatches', 'emergency_dispatch_history'] as $table) {
            $this->assertTrue(Schema::hasTable($table));
        }
        $this->assertTrue(Schema::hasColumn('referrals', 'emergency_verification_id'));
        $this->assertTrue(Schema::hasColumn('referral_status_history', 'previous_status'));
        $this->assertSame('rapid_mind_testing', DB::selectOne('select current_database() as name')->name);
        $this->assertNotEmpty(DB::selectOne('select PostGIS_Version() as version')->version);
    }

    public function test_factory_creates_an_identified_confirmed_t0_dispatch_without_referral(): void
    {
        $dispatch = EmergencyDispatch::factory()->create();

        $this->assertTrue(Str::isUuid($dispatch->id));
        $this->assertNull($dispatch->referral_id);
        $this->assertNull($dispatch->referral);
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $dispatch->status);
        $this->assertSame(DispatchTargetSource::GPS, $dispatch->target_source);
        $this->assertInstanceOf(CarbonImmutable::class, $dispatch->assigned_at);
        $this->assertSame(EmergencyStatus::CONFIRMED, $dispatch->emergencyEvent->status);
        $this->assertSame(TriageCategory::T0_CONFIRMED, $dispatch->emergencyEvent->verifications->sole()->clinical_result);
        $this->assertSame($dispatch->id, $dispatch->emergencyEvent->dispatch->id);
        $this->assertSame($dispatch->id, $dispatch->responseUnit->dispatches->sole()->id);
        $this->assertSame($dispatch->assigned_by, $dispatch->assigner->id);
        $this->assertSame('-7.68920000', $dispatch->target_latitude);
        $this->assertSame('110.42340000', $dispatch->target_longitude);
        $this->assertSame(0, Referral::count());
    }

    public function test_dispatch_can_reference_an_unidentified_emergency(): void
    {
        $emergency = EmergencyEvent::factory()->confirmed()->create(['patient_id' => null]);
        $dispatch = EmergencyDispatch::factory()->for($emergency)->create();

        $this->assertNull($dispatch->emergencyEvent->patient_id);
        $this->assertNull($dispatch->referral_id);
        $this->assertSame($dispatch->id, $emergency->fresh()->dispatch->id);
    }

    public function test_referral_source_and_dispatch_relationships_are_explicit(): void
    {
        $referral = Referral::factory()->create();
        $dispatch = EmergencyDispatch::factory()->for($referral->emergencyEvent)->for($referral)->create();

        $this->assertSame($referral->id, $dispatch->referral->id);
        $this->assertSame($dispatch->id, $referral->fresh()->dispatch->id);
        $this->assertSame($referral->emergency_event_id, $referral->emergencyVerification->emergency_event_id);
        $this->assertSame(TriageCategory::T0_CONFIRMED, $referral->emergencyVerification->clinical_result);
        $this->assertSame($referral->patient_id, $dispatch->emergencyEvent->patient_id);
    }

    public function test_response_unit_can_have_a_facility_and_be_retained_when_inactive(): void
    {
        $facility = HealthcareFacility::create(['name' => 'Faskes Sintetis Uji']);
        $unit = ResponseUnit::factory()->create(['facility_id' => $facility->id]);
        $dispatch = EmergencyDispatch::factory()->for($unit)->create();
        $unit->update(['is_active' => false]);

        $this->assertSame($facility->id, $unit->facility->id);
        $this->assertFalse($dispatch->fresh()->responseUnit->is_active);
        $this->assertSame($unit->id, $dispatch->fresh()->response_unit_id);
        $this->assertNull(ResponseUnit::factory()->create()->facility);
    }

    public function test_history_casts_relationships_and_deterministic_order(): void
    {
        $dispatch = EmergencyDispatch::factory()->create();
        $time = Carbon::parse('2026-10-24 10:00:00');
        $later = EmergencyDispatchHistory::factory()->for($dispatch, 'dispatch')->create([
            'event_type' => EmergencyDispatchEventType::STATUS_CHANGED,
            'previous_status' => EmergencyDispatchStatus::ASSIGNED,
            'status' => EmergencyDispatchStatus::EN_ROUTE,
            'metadata' => ['source' => 'synthetic-test'],
            'created_at' => $time->copy()->addMinute(),
        ]);
        $earlier = EmergencyDispatchHistory::factory()->for($dispatch, 'dispatch')->create(['created_at' => $time]);
        $tie = EmergencyDispatchHistory::factory()->for($dispatch, 'dispatch')->create([
            'event_type' => EmergencyDispatchEventType::REFERRAL_LINKED,
            'previous_status' => EmergencyDispatchStatus::ASSIGNED,
            'created_at' => $time,
        ]);

        $this->assertSame('emergency_dispatch_history', $later->getTable());
        $this->assertSame($dispatch->id, $later->dispatch->id);
        $this->assertSame($dispatch->assigned_by, $later->changer->id);
        $this->assertSame(EmergencyDispatchEventType::STATUS_CHANGED, $later->fresh()->event_type);
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $later->previous_status);
        $this->assertSame(EmergencyDispatchStatus::EN_ROUTE, $later->status);
        $this->assertSame(['source' => 'synthetic-test'], $later->fresh()->metadata);
        $this->assertNull($earlier->previous_status);
        $this->assertSame([$earlier->id, $tie->id, $later->id], $dispatch->history->modelKeys());
    }

    public function test_dispatch_and_referral_status_writes_do_not_change_each_other_or_the_clinical_decision(): void
    {
        $referral = Referral::factory()->create();
        $dispatch = EmergencyDispatch::factory()->for($referral->emergencyEvent)->for($referral)->create();
        $decision = $referral->emergencyVerification;

        // Persistence independence only; guarded transition commands belong to Checkpoint 2C.
        $dispatch->update(['status' => EmergencyDispatchStatus::EN_ROUTE]);
        $this->assertSame(ReferralStatus::ACTIVE, $referral->fresh()->status);
        $referral->update(['status' => ReferralStatus::COMPLETED]);
        $this->assertSame(EmergencyDispatchStatus::EN_ROUTE, $dispatch->fresh()->status);
        $dispatch->update(['status' => EmergencyDispatchStatus::COMPLETED]);
        $this->assertSame(ReferralStatus::COMPLETED, $referral->fresh()->status);
        $this->assertSame(EmergencyDispatchStatus::COMPLETED, $dispatch->fresh()->status);
        $this->assertSame(EmergencyStatus::CONFIRMED, $dispatch->emergencyEvent->fresh()->status);
        $this->assertSame(TriageCategory::T0_CONFIRMED, $decision->fresh()->clinical_result);
        $this->assertSame(1, $dispatch->emergencyEvent->verifications()->count());
    }

    public function test_target_shelter_and_snapshot_survive_later_shelter_changes(): void
    {
        $shelter = $this->shelter();
        $dispatch = EmergencyDispatch::factory()->create([
            'target_source' => DispatchTargetSource::SHELTER,
            'target_shelter_id' => $shelter->id,
            'target_latitude' => null,
            'target_longitude' => null,
            'target_description' => $shelter->name.' — '.$shelter->address,
        ]);
        $snapshot = $dispatch->target_description;
        $shelter->update(['name' => 'Posko Diperbarui', 'address' => 'Alamat Diperbarui']);

        $this->assertSame($shelter->id, $dispatch->targetShelter->id);
        $this->assertSame($snapshot, $dispatch->fresh()->target_description);
        $this->assertNull($dispatch->target_latitude);
        $this->assertNull($dispatch->target_longitude);
    }

    public function test_manual_description_and_zero_coordinates_are_valid_targets(): void
    {
        $manual = EmergencyDispatch::factory()->create([
            'target_source' => DispatchTargetSource::MANUAL,
            'target_latitude' => null,
            'target_longitude' => null,
            'target_description' => 'Titik pertemuan sintetis di lapangan',
        ]);
        $zero = EmergencyDispatch::factory()->create(['target_latitude' => 0, 'target_longitude' => 0]);

        $this->assertSame(DispatchTargetSource::MANUAL, $manual->fresh()->target_source);
        $this->assertSame('0.00000000', $zero->fresh()->target_latitude);
        $this->assertSame('0.00000000', $zero->fresh()->target_longitude);
    }

    public function test_database_prevents_duplicate_dispatch_for_one_emergency(): void
    {
        $dispatch = EmergencyDispatch::factory()->create();
        $this->assertConstraintViolation(fn () => EmergencyDispatch::factory()->for($dispatch->emergencyEvent)->create(), '23505');
        $this->assertSame(1, $dispatch->emergencyEvent->dispatch()->count());
    }

    public function test_database_rejects_linking_another_emergency_referral(): void
    {
        $dispatch = EmergencyDispatch::factory()->create();
        $referral = Referral::factory()->create();
        $this->assertConstraintViolation(fn () => $dispatch->update(['referral_id' => $referral->id]), '23503');
        $this->assertNull($dispatch->fresh()->referral_id);
    }

    public function test_database_rejects_linking_a_non_emergency_referral(): void
    {
        $referral = Referral::factory()->create();
        $referral->update(['emergency_event_id' => null, 'emergency_verification_id' => null]);
        $dispatch = EmergencyDispatch::factory()->create();
        $this->assertConstraintViolation(fn () => $dispatch->update(['referral_id' => $referral->id]), '23503');
        $this->assertNull($dispatch->fresh()->referral_id);
    }

    public function test_database_requires_unique_response_unit_codes(): void
    {
        $unit = ResponseUnit::factory()->create();
        $this->assertConstraintViolation(fn () => ResponseUnit::factory()->create(['code' => $unit->code]), '23505');
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidDispatchValues(): array
    {
        return [
            'referral status is not dispatch status' => [['status' => 'ACTIVE']],
            'unapproved cancellation' => [['status' => 'CANCELLED']],
            'unknown target source' => [['target_source' => 'UNKNOWN']],
            'latitude without longitude' => [['target_longitude' => null]],
            'longitude without latitude' => [['target_latitude' => null]],
            'latitude out of range' => [['target_latitude' => 90.00000001]],
            'negative latitude out of range' => [['target_latitude' => -90.00000001]],
            'longitude out of range' => [['target_longitude' => 180.00000001]],
            'negative longitude out of range' => [['target_longitude' => -180.00000001]],
            'target absent' => [['target_latitude' => null, 'target_longitude' => null, 'target_description' => null]],
            'blank description alone' => [['target_latitude' => null, 'target_longitude' => null, 'target_description' => '   ']],
        ];
    }

    #[DataProvider('invalidDispatchValues')]
    public function test_database_rejects_invalid_dispatch_values(array $values): void
    {
        $dispatch = EmergencyDispatch::factory()->create();
        $this->assertConstraintViolation(fn () => DB::table('emergency_dispatches')->where('id', $dispatch->id)->update($values), '23514');
        $this->assertSame(EmergencyDispatchStatus::ASSIGNED, $dispatch->fresh()->status);
    }

    public function test_database_requires_assignment_and_existing_parent_records(): void
    {
        $dispatch = EmergencyDispatch::factory()->create();
        foreach (['emergency_event_id', 'response_unit_id', 'assigned_by', 'assigned_at', 'status', 'target_source'] as $column) {
            $this->assertConstraintViolation(fn () => DB::table('emergency_dispatches')->where('id', $dispatch->id)->update([$column => null]), '23502');
        }
        foreach (['emergency_event_id', 'referral_id'] as $column) {
            $this->assertConstraintViolation(fn () => DB::table('emergency_dispatches')->where('id', $dispatch->id)->update([$column => (string) Str::uuid()]), '23503');
        }
        foreach (['response_unit_id', 'assigned_by', 'target_shelter_id'] as $column) {
            $this->assertConstraintViolation(fn () => DB::table('emergency_dispatches')->where('id', $dispatch->id)->update([$column => 2147483647]), '23503');
        }
    }

    public function test_history_rejects_unknown_enum_values_and_missing_parents(): void
    {
        $history = EmergencyDispatchHistory::factory()->create();
        foreach (['event_type', 'status', 'previous_status'] as $column) {
            $this->assertConstraintViolation(fn () => DB::table('emergency_dispatch_history')->where('id', $history->id)->update([$column => 'UNKNOWN']), '23514');
        }
        $this->assertConstraintViolation(fn () => DB::table('emergency_dispatch_history')->where('id', $history->id)->update(['emergency_dispatch_id' => (string) Str::uuid()]), '23503');
        $this->assertConstraintViolation(fn () => DB::table('emergency_dispatch_history')->where('id', $history->id)->update(['changed_by' => 2147483647]), '23503');
    }

    public function test_new_domain_foreign_keys_preserve_assignment_and_history_on_parent_delete(): void
    {
        $history = EmergencyDispatchHistory::factory()->create();
        $dispatch = $history->dispatch;
        foreach ([$dispatch, $dispatch->emergencyEvent, $dispatch->responseUnit, $dispatch->assigner] as $parent) {
            $this->assertConstraintViolation(fn () => $parent->delete(), '23503');
        }
        $this->assertSame($history->id, $dispatch->fresh()->history->sole()->id);
    }

    public function test_new_referral_provenance_foreign_key_rejects_missing_or_deleted_decisions(): void
    {
        $referral = Referral::factory()->create();
        $this->assertConstraintViolation(fn () => $referral->update(['emergency_verification_id' => 2147483647]), '23503');
        $this->assertConstraintViolation(fn () => $referral->fresh()->emergencyVerification->delete(), '23503');
        $this->assertNotNull($referral->fresh()->emergencyVerification);
    }

    public function test_linked_referral_cannot_be_deleted_or_shared_between_emergencies(): void
    {
        $referral = Referral::factory()->create();
        EmergencyDispatch::factory()->for($referral->emergencyEvent)->for($referral)->create();
        $other = EmergencyDispatch::factory()->create();
        $this->assertConstraintViolation(fn () => $referral->delete(), '23503');
        // Both uniqueness and same-emergency constraints forbid sharing; PostgreSQL checks uniqueness first.
        $this->assertConstraintViolation(fn () => $other->update(['referral_id' => $referral->id]), '23505');
    }

    public function test_foundation_does_not_restrict_existing_referral_statuses_sources_or_history_writers(): void
    {
        $referral = Referral::factory()->create(['emergency_verification_id' => null]);
        foreach (ReferralStatus::cases() as $status) {
            $referral->update(['status' => $status]);
            $history = ReferralStatusHistory::create([
                'referral_id' => $referral->id,
                'status' => $status,
                'changed_by' => $referral->referred_by,
            ]);
            $this->assertSame($status, $referral->fresh()->status);
            $this->assertNull($history->previous_status);
        }
        $history->update(['previous_status' => ReferralStatus::TRANSPORT]);
        $this->assertSame(ReferralStatus::TRANSPORT, $history->fresh()->previous_status);
        $this->assertNull($referral->fresh()->emergency_verification_id);

        $duplicate = Referral::factory()->for($referral->emergencyEvent)->create(['emergency_verification_id' => null]);
        $this->assertNotSame($referral->id, $duplicate->id);
        $referral->update(['emergency_event_id' => null]);
        $this->assertNull($referral->fresh()->emergency_event_id);
        $this->assertNull($referral->clinical_validation_id);
    }
}
