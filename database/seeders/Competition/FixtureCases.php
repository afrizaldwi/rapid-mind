<?php

declare(strict_types=1);

namespace Database\Seeders\Competition;

use App\Domain\Healthcare\ClinicalReferralWorkflow;
use App\Domain\Healthcare\DispatchWorkflow;
use App\Domain\Sync\AssessmentSynchronizer;
use App\Domain\Sync\EmergencySynchronizer;
use App\Domain\Sync\SyncPayload;
use App\Http\Controllers\Healthcare\HealthcareController;
use App\Models\AuditLog;
use App\Models\EmergencyEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/** Scripted fictional prior decisions through existing validated server boundaries.
 * These are not evidence of browser confirmation, notification delivery or real response.
 */
final class FixtureCases
{
    public function create(array $actors, string $date): void
    {
        $guard = Auth::guard('web');
        $previous = $guard->hasUser() ? $guard->user() : null;
        try {
            foreach (range(1, 12) as $n) {
                Carbon::withTestNow(Carbon::parse($date.' 00:00:00 UTC')->subDays(13 - $n), function () use ($actors, $n, $guard): void {
                    $posko = FixtureDefinition::posko($n);
                    $facility = FixtureDefinition::facility($posko);
                    $volunteer = $actors['users']['relawan-'.$posko];
                    $medic = $actors['users']['healthcare-'.$facility];
                    $data = FixtureDefinition::payload($n);
                    $data['started_at'] = now()->toIso8601String();
                    if (FixtureDefinition::completed($n)) {
                        $data['completed_at'] = now()->addMinutes(10)->toIso8601String();
                    }
                    app(AssessmentSynchronizer::class)->synchronize(SyncPayload::assessment($this->request($data)), $volunteer);
                    Carbon::setTestNow(now()->addMinutes(10));
                    $guard->setUser($medic);
                    $controller = app(HealthcareController::class);
                    if (in_array($n, [3, 12], true)) {
                        $this->success($controller->validateAssessment($this->request([
                            'clinical_result' => $n === 3 ? 'T2' : 'T1',
                            'diagnosis_notes' => '[SIMULASI] Keputusan fiktif untuk fixture, bukan diagnosis pasien nyata.',
                            'intervention_plan' => '[SIMULASI] Uji tindak lanjut melalui aplikasi; tanpa kontak eksternal.',
                            'referral_required' => $n === 12,
                            'facility_id' => $n === 12 ? $actors['facilities']['a']->id : null,
                        ]), $data['id'], app(ClinicalReferralWorkflow::class)));
                    }
                    if (in_array($n, [7, 8, 9, 10, 11], true)) {
                        app(EmergencySynchronizer::class)->synchronize(SyncPayload::emergency($this->request([
                            'id' => FixtureDefinition::id($n, 3),
                            'patient' => $data['patient'],
                            'assessment_id' => $data['id'],
                            'assessment_mode' => $data['mode'],
                            'red_flag_type' => 'MEDICAL_CRISIS',
                            'latitude' => FixtureDefinition::POSKO[$posko]['latitude'],
                            'longitude' => FixtureDefinition::POSKO[$posko]['longitude'],
                            'notes' => '[SIMULASI] Laporan darurat sintetis; tidak ada kontak atau pengerahan nyata.',
                        ])), $volunteer);
                        if ($n !== 7) {
                            $this->decision($controller, $n);
                        }
                        if ($n === 9) {
                            $this->success($controller->createEmergencyReferral($this->request([
                                'facility_id' => $actors['facilities']['a']->id,
                                'notes' => '[SIMULASI] Rujukan lintas fasilitas sintetis.',
                            ]), FixtureDefinition::id($n, 3), app(ClinicalReferralWorkflow::class)));
                        }
                        if (in_array($n, [9, 11], true)) {
                            $this->dispatch($actors, $n, $medic, $facility);
                        }
                    }
                    AuditLog::create([
                        'actor_id' => $volunteer->id,
                        'action' => 'COMPETITION_SCENARIO_CREATED',
                        'entity_type' => 'Patient',
                        'entity_id' => FixtureDefinition::id($n),
                        'new_values' => ['fixture' => FixtureDefinition::VERSION, 'scenario' => $n, 'scripted_synthetic_history' => true],
                    ]);
                });
            }
        } finally {
            $guard->forgetUser();
            if ($previous) {
                $guard->setUser($previous);
            }
        }
    }

    private function decision(HealthcareController $controller, int $n): void
    {
        $id = FixtureDefinition::id($n, 3);
        Carbon::setTestNow(now()->addMinute());
        $this->success($controller->acknowledge($this->request([]), $id));
        Carbon::setTestNow(now()->addMinute());
        $this->success($controller->verify($this->request([
            'method' => 'FIELD_TEAM',
            'notes' => '[SIMULASI] Verifikasi sekunder fiktif; tidak ada komunikasi nyata.',
        ]), $id));
        Carbon::setTestNow(now()->addMinute());
        $this->success($controller->classify($this->request([
            'clinical_result' => $n === 10 ? 'T3' : 'T0_CONFIRMED',
            'notes' => '[SIMULASI] Keputusan eksplisit aktor Healthcare sintetis untuk kondisi awal fixture.',
        ]), $id));
    }

    private function dispatch(array $actors, int $n, User $medic, string $facility): void
    {
        $emergency = EmergencyEvent::findOrFail(FixtureDefinition::id($n, 3));
        $workflow = app(DispatchWorkflow::class);
        $dispatch = $workflow->assign($medic, $emergency->id, [
            'response_unit_id' => $actors['units'][$facility]->id,
            'referral_id' => $emergency->referrals()->value('id'),
            'target_source' => 'SHELTER',
            'notes' => '[SIMULASI] Penugasan internal fiktif, tanpa respons nyata.',
        ])->record;
        if ($n === 11) {
            foreach (['EN_ROUTE', 'ON_SITE', 'COMPLETED'] as $next) {
                Carbon::setTestNow(now()->addMinutes(5));
                $dispatch = $workflow->transition($medic, $dispatch->id, [
                    'expected_status' => $dispatch->status->value,
                    'status' => $next,
                    'notes' => '[SIMULASI] Riwayat progres sintetis, bukan gerakan kendaraan nyata.',
                ])->record;
            }
        }
    }

    private function request(array $data): Request
    {
        return Request::create('/competition-fixture', 'POST', $data, server: ['HTTP_ACCEPT' => 'application/json']);
    }

    private function success($response): void
    {
        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException('Fixture workflow rejected; transaction aborted.');
        }
    }
}
