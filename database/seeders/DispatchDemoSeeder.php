<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Healthcare\ClinicalReferralWorkflow;
use App\Domain\Healthcare\DispatchWorkflow;
use App\Domain\Healthcare\HealthcareOperationsRead;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Additive synthetic scenarios. Existing fixture roots are never rewritten on repeat runs. */
final class DispatchDemoSeeder extends Seeder
{
    public const SCENARIOS = [
        1 => ['Tanpa rujukan atau respons', null, false, false, false],
        2 => ['Respons ditugaskan tanpa rujukan', 'ASSIGNED', false, false, false],
        3 => ['Menuju lokasi dengan rujukan', 'EN_ROUTE', true, false, false],
        4 => ['Di lokasi dengan rujukan dihubungkan kemudian', 'ON_SITE', true, false, true],
        5 => ['Transport pasien', 'TRANSPORT', true, false, false],
        6 => ['Respons selesai, rujukan aktif', 'COMPLETED', true, false, false],
        7 => ['Rujukan selesai, respons aktif', 'ON_SITE', true, true, false],
        8 => ['Rujukan dan respons selesai', 'COMPLETED', true, true, true],
        9 => ['Tanpa identitas, respons di lokasi', 'ON_SITE', false, false, false],
        10 => ['Rujukan asesmen non-T0', null, true, false, false],
    ];

    public static function id(int $scenario, int $entity = 1): string
    {
        return sprintf('2de00000-2026-5000-8000-%06d%06d', $scenario, $entity);
    }

    public function run(): void
    {
        if (! app(HealthcareOperationsRead::class)->ready()) {
            throw new RuntimeException('Synthetic Dispatch fixtures require the additive 2B schema; no migration is run by this seeder.');
        }
        // Reuse demo actors without changing roles, activation, passwords, or memberships.
        $actor = User::where('email', 'nakes@rapidmind.id')->where('role', UserRole::HEALTHCARE)->where('is_active', true)->firstOrFail();
        $volunteer = User::where('email', 'relawan@rapidmind.id')->where('role', UserRole::RELAWAN)->where('is_active', true)->firstOrFail();
        $facility = $actor->facility()->where('is_active', true)->firstOrFail();
        $unit = ResponseUnit::firstOrCreate(['code' => 'SYNTHETIC-2DE-01'], [
            'name' => 'Unit Respons Sintetis 2DE',
            'facility_id' => $facility->id,
            'is_active' => true,
        ]);
        $workflow = app(DispatchWorkflow::class);
        $referrals = app(ClinicalReferralWorkflow::class);

        foreach (self::SCENARIOS as $index => [$name, $status, $hasReferral, $referralDone, $laterLink]) {
            // Each scenario commits atomically. A retry skips the complete existing root, even after manual progression.
            DB::transaction(function () use ($index, $name, $status, $hasReferral, $referralDone, $laterLink, $actor, $volunteer, $facility, $unit, $workflow, $referrals): void {
                $root = $index === 10 ? Assessment::find(self::id($index)) : EmergencyEvent::find(self::id($index));
                if ($root) {
                    return;
                }
                Carbon::withTestNow(Carbon::parse('2026-10-24 01:00:00 UTC')->addHours($index), function () use ($index, $name, $status, $hasReferral, $referralDone, $laterLink, $actor, $volunteer, $facility, $unit, $workflow, $referrals): void {
                    $marker = '[SINTETIS 2DE] ' . $name;
                    $patient = $index === 9 ? null : Patient::forceCreate([
                        'id' => self::id($index, 2),
                        'name' => $marker,
                        'created_by' => $volunteer->id,
                        'shelter_id' => $volunteer->shelter_id,
                    ]);
                    $emergency = null;
                    $verification = null;
                    $validation = null;
                    if ($index === 10) {
                        $assessment = Assessment::forceCreate([
                            'id' => self::id($index),
                            'patient_id' => $patient->id,
                            'user_id' => $volunteer->id,
                            'mode' => 'VERBAL',
                            'status' => 'COMPLETED',
                            'started_at' => now()->subMinutes(20),
                            'completed_at' => now()->subMinutes(10),
                        ]);
                        TriageResult::create(['assessment_id' => $assessment->id, 'system_recommendation' => 'T1', 'total_score' => 20]);
                        $validation = ClinicalValidation::create([
                            'assessment_id' => $assessment->id,
                            'validated_by' => $actor->id,
                            'clinical_result' => 'T1',
                            'diagnosis_notes' => $marker,
                            'referral_required' => true,
                        ]);
                        $this->audit($actor->id, 'ASSESSMENT_VALIDATED', 'Assessment', $assessment->id, ['clinical_result' => 'T1']);
                    } else {
                        $emergency = EmergencyEvent::forceCreate([
                            'id' => self::id($index),
                            'patient_id' => $patient?->id,
                            'user_id' => $volunteer->id,
                            'status' => 'CONFIRMED',
                            'red_flag_type' => 'MEDICAL_CRISIS',
                            'notes' => $marker,
                            'shelter_id' => $volunteer->shelter_id,
                            'latitude' => '-7.68920000',
                            'longitude' => '110.42340000',
                            'created_at' => now()->subMinutes(30),
                        ]);
                        EmergencyVerification::forceCreate([
                            'emergency_event_id' => $emergency->id,
                            'verified_by' => $actor->id,
                            'method' => 'FIELD_TEAM',
                            'notes' => $marker . ' — verifikasi sekunder',
                            'created_at' => now()->subMinutes(20),
                        ]);
                        $verification = EmergencyVerification::forceCreate([
                            'emergency_event_id' => $emergency->id,
                            'verified_by' => $actor->id,
                            'clinical_result' => 'T0_CONFIRMED',
                            'notes' => $marker . ' — keputusan klinis',
                            'created_at' => now()->subMinutes(10),
                        ]);
                        $this->audit($actor->id, 'EMERGENCY_CLASSIFIED', 'EmergencyEvent', $emergency->id, ['status' => 'CONFIRMED', 'clinical_result' => 'T0_CONFIRMED']);
                    }
                    $referral = null;
                    $createReferral = function () use (&$referral, $index, $emergency, $verification, $validation, $patient, $actor, $facility, $marker, $referrals): void {
                        $referral = Referral::forceCreate([
                            'id' => self::id($index, 3),
                            'patient_id' => $patient->id,
                            'referred_by' => $actor->id,
                            'facility_id' => $facility->id,
                            'status' => 'ACTIVE',
                            'notes' => $marker,
                            'emergency_event_id' => $emergency?->id,
                            'emergency_verification_id' => $verification?->id,
                            'clinical_validation_id' => $validation?->id,
                        ]);
                        $referrals->recordCreated($referral, $actor, $marker);
                    };
                    if ($hasReferral && ! $laterLink) {
                        $createReferral();
                    }
                    if ($status !== null) {
                        $dispatch = $workflow->assign($actor, $emergency->id, [
                            'response_unit_id' => $unit->id,
                            'referral_id' => $referral?->id,
                            'target_source' => $index === 9 ? 'MANUAL' : ($index === 4 && $volunteer->shelter_id ? 'SHELTER' : 'GPS'),
                            'target_description' => $index === 9 ? 'Titik temu sintetis 2DE dekat gerbang Posko' : null,
                            'notes' => $marker,
                        ])->record;
                        $path = ['EN_ROUTE', 'ON_SITE', ...($index === 8 ? [] : ['TRANSPORT']), 'COMPLETED'];
                        if ($status !== 'ASSIGNED') {
                            foreach ($path as $step => $next) {
                                Carbon::setTestNow(now()->addMinutes(5));
                                if ($next === 'ON_SITE' && $laterLink) {
                                    $createReferral();
                                    $workflow->linkReferral($actor, $dispatch->id, ['referral_id' => $referral->id, 'expected_referral_id' => null, 'notes' => $marker]);
                                }
                                $dispatch = $workflow->transition($actor, $dispatch->id, ['expected_status' => $dispatch->status->value, 'status' => $next, 'notes' => $marker])->record;
                                if ($next === $status) {
                                    break;
                                }
                            }
                        }
                    }
                    if ($referralDone) {
                        Carbon::setTestNow(now()->addMinutes(5));
                        $referrals->complete($actor, $referral->id, ['expected_status' => 'ACTIVE', 'notes' => $marker]);
                    }
                });
            });
        }
    }

    private function audit(int $actorId, string $action, string $type, string|int $id, array $values): void
    {
        AuditLog::create(['actor_id' => $actorId, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id, 'new_values' => $values]);
    }
}
