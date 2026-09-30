<?php

declare(strict_types=1);

namespace App\Http\Controllers\Healthcare;

use App\Enums\EmergencyStatus;
use App\Enums\ReferralStatus;
use App\Enums\TriageCategory;
use App\Enums\VerificationMethod;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\ReferralStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Throwable;

final class HealthcareController extends Controller
{
    private function activeReferralFacility(int|string|null $requestedId, int|string|null $assignedId): int
    {
        $facilityId = $requestedId
            ?? HealthcareFacility::whereKey($assignedId)->where('is_active', true)->value('id')
            ?? HealthcareFacility::where('is_active', true)->orderBy('id')->value('id');

        if (!$facilityId || !HealthcareFacility::whereKey($facilityId)->where('is_active', true)->exists()) {
            throw ValidationException::withMessages([
                'facility_id' => 'Pilih Faskes aktif untuk rujukan baru.',
            ]);
        }

        return (int) $facilityId;
    }

    public function emergencies(): InertiaResponse
    {
        $user = Auth::user();

        $emergencies = EmergencyEvent::with(['patient', 'shelter', 'user:id,name', 'verifications.verifier'])
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN created_at END ASC")
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN id END ASC")
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $facility = $user->facility_id ? HealthcareFacility::find($user->facility_id) : null;

        return Inertia::render('Healthcare/Emergencies/Index', [
            'emergencies' => $emergencies,
            'facility' => $facility,
        ]);
    }

    public function emergencyDetail(string $emergencyId): InertiaResponse
    {
        $emergency = EmergencyEvent::with([
            'patient.assessments.triageResult',
            'shelter',
            'user:id,name,phone_number',
            'verifications.verifier',
            'referrals.facility',
            'referrals.statusHistory.changer',
        ])->findOrFail($emergencyId);

        $facilities = HealthcareFacility::where('is_active', true)->get();

        return Inertia::render('Healthcare/Emergencies/Show', [
            'emergency' => $emergency,
            'facilities' => $facilities,
        ]);
    }

    public function acknowledge(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $emergency = EmergencyEvent::findOrFail($emergencyId);

        $emergency->update([
            'status' => EmergencyStatus::ACKNOWLEDGED,
        ]);

        AuditLog::create([
            'actor_id' => $user->id,
            'action' => 'EMERGENCY_ACKNOWLEDGED',
            'entity_type' => 'EmergencyEvent',
            'entity_id' => $emergency->id,
            'new_values' => ['status' => EmergencyStatus::ACKNOWLEDGED->value],
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Kasus berhasil diakui.']);
        }

        return back()->with('message', 'Kasus berhasil diakui.');
    }

    public function verify(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $emergency = EmergencyEvent::findOrFail($emergencyId);

        $validated = $request->validate([
            'method' => ['required', 'string', 'in:PHONE,VIDEO,FIELD_TEAM'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        EmergencyVerification::create([
            'emergency_event_id' => $emergency->id,
            'verified_by' => $user->id,
            'method' => VerificationMethod::from($validated['method']),
            'notes' => $validated['notes'] ?? null,
        ]);

        $emergency->update([
            'status' => EmergencyStatus::REVIEWING,
        ]);

        AuditLog::create([
            'actor_id' => $user->id,
            'action' => 'EMERGENCY_VERIFIED',
            'entity_type' => 'EmergencyEvent',
            'entity_id' => $emergency->id,
            'new_values' => [
                'method' => $validated['method'],
                'notes' => $validated['notes'] ?? null,
            ],
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Verifikasi sekunder tersimpan.']);
        }

        return back()->with('message', 'Verifikasi sekunder tersimpan.');
    }

    public function classify(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $emergency = EmergencyEvent::findOrFail($emergencyId);

        $validated = $request->validate([
            'clinical_result' => ['required', 'string', 'in:T0_CONFIRMED,T1,T2'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'create_referral' => ['nullable', 'boolean'],
            'facility_id' => ['nullable', 'integer', Rule::exists('healthcare_facilities', 'id')->where('is_active', true)],
        ]);

        $clinicalResult = TriageCategory::from($validated['clinical_result']);

        $newStatus = match ($clinicalResult) {
            TriageCategory::T0_CONFIRMED => EmergencyStatus::CONFIRMED,
            TriageCategory::T1, TriageCategory::T2 => EmergencyStatus::DOWNGRADED,
            default => EmergencyStatus::REVIEWING,
        };

        DB::transaction(function () use ($emergency, $newStatus, $user, $clinicalResult, $validated): void {
            $emergency = EmergencyEvent::whereKey($emergency->id)->lockForUpdate()->firstOrFail();
            $emergency->update([
                'status' => $newStatus,
            ]);

            // Record verification outcome
            EmergencyVerification::create([
                'emergency_event_id' => $emergency->id,
                'verified_by' => $user->id,
                'clinical_result' => $clinicalResult,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Historical referrals remain unchanged on a replay.
            if ((($validated['create_referral'] ?? false) || $clinicalResult === TriageCategory::T0_CONFIRMED)
                && $emergency->patient_id && ! $emergency->referrals()->exists()) {
                $facilityId = $this->activeReferralFacility($validated['facility_id'] ?? null, $user->facility_id);
                $referral = $emergency->referrals()->create([
                    'patient_id' => $emergency->patient_id,
                    'referred_by' => $user->id,
                    'facility_id' => $facilityId,
                    'status' => ReferralStatus::ACTIVE,
                    'notes' => $validated['notes'] ?? 'Rujukan darurat T0 dikonfirmasi.',
                ]);
                ReferralStatusHistory::create([
                    'referral_id' => $referral->id,
                    'status' => ReferralStatus::ACTIVE,
                    'changed_by' => $user->id,
                    'notes' => 'Rujukan darurat diterbitkan.',
                ]);
            }

            AuditLog::create([
                'actor_id' => $user->id,
                'action' => 'EMERGENCY_CLASSIFIED',
                'entity_type' => 'EmergencyEvent',
                'entity_id' => $emergency->id,
                'new_values' => [
                    'clinical_result' => $clinicalResult->value,
                    'status' => $newStatus->value,
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Status klinis darurat berhasil diperbarui.']);
        }

        return back()->with('message', 'Status klinis darurat berhasil diperbarui.');
    }

    public function validations(): InertiaResponse
    {
        $assessments = Assessment::with(['patient', 'user:id,name,shelter_id', 'user.shelter', 'triageResult', 'clinicalValidation.validator'])
            ->where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->whereHas('triageResult', fn ($query) => $query->whereIn('system_recommendation', ['T1', 'T2']))
            ->get()
            ->sortBy(fn (Assessment $assessment) => sprintf(
                '%d-%s-%s',
                $assessment->triageResult->system_recommendation === TriageCategory::T1 ? 1 : 2,
                $assessment->completed_at?->format('YmdHis.u') ?? $assessment->created_at->format('YmdHis.u'),
                $assessment->id,
            ))->values();

        return Inertia::render('Healthcare/Validations/Index', [
            'pendingAssessments' => $assessments->filter(fn (Assessment $a) => $a->clinicalValidation === null)->values(),
            'completedAssessments' => $assessments->filter(fn (Assessment $a) => $a->clinicalValidation !== null)->values(),
        ]);
    }

    public function validationDetail(string $assessmentId): InertiaResponse
    {
        $assessment = Assessment::with([
            'patient.shelter', 'user:id,name,shelter_id', 'user.shelter', 'triageResult', 'srqResponses',
            'riskAssessment', 'functionAssessment', 'clinicalValidation.validator',
            'clinicalValidation.referral.facility',
        ])->where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->whereHas('triageResult', fn ($query) => $query->whereIn('system_recommendation', ['T1', 'T2']))
            ->findOrFail($assessmentId);

        $previousAssessments = Assessment::with(['triageResult', 'clinicalValidation.validator'])
            ->where('patient_id', $assessment->patient_id)
            ->where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->where('completed_at', '<', $assessment->completed_at)
            ->orderByDesc('completed_at')->orderByDesc('id')->limit(5)->get();

        return Inertia::render('Healthcare/Validations/Show', [
            'assessment' => $assessment,
            'previousAssessments' => $previousAssessments,
            'facilities' => HealthcareFacility::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
        ]);
    }

    public function validateAssessment(Request $request, string $assessmentId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $assessment = Assessment::where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->whereHas('triageResult', fn ($query) => $query->whereIn('system_recommendation', ['T1', 'T2']))
            ->findOrFail($assessmentId);

        // Completed decisions are immutable in this MVP; a replay is a successful no-op.
        if ($assessment->clinicalValidation()->exists()) {
            return $this->validationSavedResponse($request);
        }

        $validated = $request->validate([
            'clinical_result' => ['required', 'string', 'in:T1,T2,T3'],
            'diagnosis_notes' => ['nullable', 'string', 'max:2000'],
            'intervention_plan' => ['nullable', 'string', 'max:2000'],
            'referral_required' => ['nullable', 'boolean'],
            'facility_id' => [Rule::requiredIf($request->boolean('referral_required')), 'nullable', 'integer', Rule::exists('healthcare_facilities', 'id')->where('is_active', true)],
        ]);

        $clinicalResult = TriageCategory::from($validated['clinical_result']);

        try {
            DB::transaction(function () use ($assessment, $user, $clinicalResult, $validated): void {
                $assessment = Assessment::whereKey($assessment->id)
                    ->where('status', \App\Enums\AssessmentStatus::COMPLETED)
                    ->whereHas('triageResult', fn ($query) => $query->whereIn('system_recommendation', ['T1', 'T2']))
                    ->lockForUpdate()->firstOrFail();
                if ($assessment->clinicalValidation()->exists()) {
                    return;
                }
                $validation = ClinicalValidation::create(
                    [
                        'assessment_id' => $assessment->id,
                        'validated_by' => $user->id,
                        'clinical_result' => $clinicalResult,
                        'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                        'intervention_plan' => $validated['intervention_plan'] ?? null,
                        'referral_required' => (bool)($validated['referral_required'] ?? false),
                    ]
                );

                if (($validated['referral_required'] ?? false) && ! $validation->referral()->exists()) {
                    $facilityId = (int) $validated['facility_id'];
                    $referral = $validation->referral()->create([
                        'patient_id' => $assessment->patient_id,
                        'referred_by' => $user->id,
                        'facility_id' => $facilityId,
                        'status' => ReferralStatus::ACTIVE,
                        'notes' => $validated['intervention_plan'] ?? 'Rujukan tindak lanjut klinis.',
                    ]);
                    ReferralStatusHistory::create([
                        'referral_id' => $referral->id,
                        'status' => ReferralStatus::ACTIVE,
                        'changed_by' => $user->id,
                        'notes' => 'Rujukan klinis diterbitkan pasca-validasi asesmen.',
                    ]);
                }

                AuditLog::create([
                    'actor_id' => $user->id,
                    'action' => 'ASSESSMENT_VALIDATED',
                    'entity_type' => 'Assessment',
                    'entity_id' => $assessment->id,
                    'new_values' => [
                        'clinical_result' => $clinicalResult->value,
                        'referral_required' => $validated['referral_required'] ?? false,
                    ],
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);
            if ($request->wantsJson()) {
                throw $exception;
            }
            return back()->withErrors(['form' => 'Validasi belum tersimpan karena gangguan server. Coba lagi.']);
        }

        return $this->validationSavedResponse($request);
    }

    private function validationSavedResponse(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->wantsJson()) {
            return response()->json(['message' => 'Validasi klinis berhasil disimpan.']);
        }

        return back()->with('message', 'Validasi klinis berhasil disimpan.');
    }

    public function referrals(): InertiaResponse
    {
        $referrals = Referral::with(['patient', 'facility', 'referrer', 'emergencyEvent', 'statusHistory.changer'])
            ->latest('created_at')
            ->get();

        return Inertia::render('Healthcare/Referrals/Index', [
            'referrals' => $referrals,
        ]);
    }

    public function updateReferralStatus(Request $request, string $referralId): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'expected_status' => ['required', 'string', Rule::enum(ReferralStatus::class)],
            'status' => ['required', 'string', Rule::enum(ReferralStatus::class)],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $expectedStatus = ReferralStatus::from($validated['expected_status']);
        $newStatus = ReferralStatus::from($validated['status']);

        $result = DB::transaction(function () use ($referralId, $expectedStatus, $newStatus, $validated): array {
            $referral = Referral::whereKey($referralId)->lockForUpdate()->firstOrFail();
            $current = $referral->status;

            // A response lost after a successful write may be retried with the old expectation.
            if ($current === $newStatus) {
                return ['replay' => true, 'current' => $current];
            }
            if ($current !== $expectedStatus) {
                return ['conflict' => true, 'current' => $current];
            }
            if (! $current->canTransitionTo($newStatus)) {
                throw ValidationException::withMessages([
                    'status' => 'Perubahan status rujukan ini tidak diizinkan.',
                ]);
            }

            $referral->update(['status' => $newStatus]);
            ReferralStatusHistory::create([
                'referral_id' => $referral->id,
                'status' => $newStatus,
                'changed_by' => Auth::id(),
                'notes' => $validated['notes'] ?? null,
            ]);

            return ['updated' => true];
        });

        if (isset($result['conflict'])) {
            $message = 'Data telah diperbarui oleh pengguna lain. Muat data terbaru sebelum melakukan perubahan.';
            if ($request->wantsJson()) {
                return response()->json(['message' => $message, 'current_status' => $result['current']->value], 409);
            }
            return back()->withErrors(['conflict' => $message]);
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Status rujukan berhasil diperbarui.']);
        }
        return back()->with('message', 'Status rujukan berhasil diperbarui.');
    }

    public function patients(): InertiaResponse
    {
        $patients = Patient::with(['shelter', 'assessments.triageResult', 'emergencyEvents'])
            ->latest('created_at')
            ->get();

        return Inertia::render('Healthcare/Patients/Index', [
            'patients' => $patients,
        ]);
    }

    public function patientDetail(string $patientId): InertiaResponse
    {
        $patient = Patient::with([
            'shelter',
            'assessments.srqResponses',
            'assessments.riskAssessment',
            'assessments.functionAssessment',
            'assessments.triageResult',
            'assessments.clinicalValidation.validator',
            'emergencyEvents.verifications.verifier',
            'emergencyEvents.referrals.facility',
            'referrals' => fn ($query) => $query->orderByDesc('created_at')->orderByDesc('id'),
            'referrals.facility',
            'referrals.referrer',
            'referrals.statusHistory.changer',
            'referrals.emergencyEvent',
            'referrals.clinicalValidation.assessment.triageResult',
        ])->findOrFail($patientId);

        return Inertia::render('Healthcare/Patients/Show', [
            'patient' => $patient,
        ]);
    }
}
