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
    public function emergencies(): InertiaResponse
    {
        $user = Auth::user();

        $emergencies = EmergencyEvent::with([
            'patient.shelter',
            'patient.assessments.triageResult',
            'patient.assessments.srqResponses',
            'patient.assessments.riskAssessment',
            'patient.assessments.functionAssessment',
            'patient.assessments.clinicalValidation.validator:id,name',
            'assessment.triageResult',
            'assessment.srqResponses',
            'assessment.riskAssessment',
            'assessment.functionAssessment',
            'shelter',
            'user:id,name',
            'verifications.verifier:id,name',
            'referrals.facility',
            'referrals.statusHistory.changer:id,name',
        ])
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN created_at END ASC")
            ->orderByRaw("CASE WHEN status = 'PENDING' THEN id END ASC")
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $assessments = Assessment::with([
            'patient.shelter',
            'triageResult',
            'srqResponses',
            'riskAssessment',
            'functionAssessment',
            'clinicalValidation.validator:id,name',
            'user:id,name',
        ])
            ->where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->orderByDesc('completed_at')
            ->get();

        $facilities = HealthcareFacility::where('is_active', true)->get();
        $facility = $user->facility_id ? HealthcareFacility::find($user->facility_id) : null;

        return Inertia::render('Healthcare/Emergencies/Index', [
            'emergencies' => $emergencies,
            'assessments' => $assessments,
            'facilities' => $facilities,
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
        $result = DB::transaction(function () use ($emergencyId, $user): array {
            $emergency = EmergencyEvent::whereKey($emergencyId)->lockForUpdate()->firstOrFail();

            if ($emergency->status === EmergencyStatus::ACKNOWLEDGED) {
                return ['replay' => true];
            }
            if ($emergency->status !== EmergencyStatus::PENDING) {
                return ['conflict' => true, 'current' => $emergency->status];
            }

            $emergency->update(['status' => EmergencyStatus::ACKNOWLEDGED]);
            AuditLog::create([
                'actor_id' => $user->id,
                'action' => 'EMERGENCY_ACKNOWLEDGED',
                'entity_type' => 'EmergencyEvent',
                'entity_id' => $emergency->id,
                'new_values' => ['status' => EmergencyStatus::ACKNOWLEDGED->value],
            ]);

            return ['updated' => true];
        });

        if (isset($result['conflict'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Kasus sudah melewati tahap pengakuan dan tidak dapat dimundurkan.',
                $result['current'],
            );
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Kasus berhasil diakui.']);
        }

        return back()->with('message', 'Kasus berhasil diakui.');
    }

    public function verify(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'method' => ['required', 'string', 'in:PHONE,VIDEO,FIELD_TEAM'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $method = VerificationMethod::from($validated['method']);
        $notes = $validated['notes'] ?? null;

        $result = DB::transaction(function () use ($emergencyId, $user, $method, $notes): array {
            $emergency = EmergencyEvent::whereKey($emergencyId)->lockForUpdate()->firstOrFail();
            $savedVerification = $emergency->verifications()
                ->whereNotNull('method')
                ->whereNull('clinical_result')
                ->oldest('id')
                ->first();

            if ($emergency->status === EmergencyStatus::REVIEWING) {
                $isExactReplay = $savedVerification
                    && $savedVerification->verified_by === $user->id
                    && $savedVerification->method === $method
                    && $savedVerification->notes === $notes;

                return $isExactReplay
                    ? ['replay' => true]
                    : ['conflict' => true, 'current' => $emergency->status];
            }
            if ($emergency->status !== EmergencyStatus::ACKNOWLEDGED || $savedVerification) {
                return ['conflict' => true, 'current' => $emergency->status];
            }

            EmergencyVerification::create([
                'emergency_event_id' => $emergency->id,
                'verified_by' => $user->id,
                'method' => $method,
                'notes' => $notes,
            ]);
            $emergency->update(['status' => EmergencyStatus::REVIEWING]);
            AuditLog::create([
                'actor_id' => $user->id,
                'action' => 'EMERGENCY_VERIFIED',
                'entity_type' => 'EmergencyEvent',
                'entity_id' => $emergency->id,
                'new_values' => ['method' => $method->value, 'notes' => $notes],
            ]);

            return ['updated' => true];
        });

        if (isset($result['conflict'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Verifikasi sekunder tidak dapat disimpan karena tahap kasus sudah berubah.',
                $result['current'],
            );
        }

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
        ]);

        $clinicalResult = TriageCategory::from($validated['clinical_result']);

        $newStatus = match ($clinicalResult) {
            TriageCategory::T0_CONFIRMED => EmergencyStatus::CONFIRMED,
            TriageCategory::T1, TriageCategory::T2 => EmergencyStatus::DOWNGRADED,
            default => EmergencyStatus::REVIEWING,
        };

        $result = DB::transaction(function () use ($emergency, $newStatus, $user, $clinicalResult, $validated): array {
            $emergency = EmergencyEvent::whereKey($emergency->id)->lockForUpdate()->firstOrFail();

            if (in_array($emergency->status, [EmergencyStatus::CONFIRMED, EmergencyStatus::DOWNGRADED], true)) {
                $savedDecision = $emergency->verifications()
                    ->whereNotNull('clinical_result')
                    ->oldest('id')
                    ->first();

                return $savedDecision?->clinical_result === $clinicalResult
                    ? ['replay' => true]
                    : ['conflict' => true, 'current' => $emergency->status];
            }
            if ($emergency->status !== EmergencyStatus::REVIEWING) {
                return ['conflict' => true, 'current' => $emergency->status];
            }

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

            return ['updated' => true];
        });

        if (isset($result['conflict'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Keputusan klinis tidak dapat disimpan karena tahap atau hasil klinis kasus sudah berubah.',
                $result['current'],
            );
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Status klinis darurat berhasil diperbarui.']);
        }

        return back()->with('message', 'Status klinis darurat berhasil diperbarui.');
    }

    public function createEmergencyReferral(Request $request, string $emergencyId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $validated = $request->validate([
            'facility_id' => ['required', 'integer', Rule::exists('healthcare_facilities', 'id')->where('is_active', true)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($emergencyId, $user, $validated): array {
            $emergency = EmergencyEvent::whereKey($emergencyId)->lockForUpdate()->firstOrFail();

            if ($emergency->status !== EmergencyStatus::CONFIRMED) {
                return ['conflict' => true, 'current' => $emergency->status];
            }
            if (! $emergency->patient_id) {
                return ['patient_missing' => true];
            }

            $existingReferral = $emergency->referrals()->oldest('created_at')->oldest('id')->first();
            if ($existingReferral) {
                return $existingReferral->facility_id === (int) $validated['facility_id']
                    ? ['replay' => true]
                    : ['referral_conflict' => true, 'referral' => $existingReferral];
            }

            $referral = $emergency->referrals()->create([
                'patient_id' => $emergency->patient_id,
                'referred_by' => $user->id,
                'facility_id' => (int) $validated['facility_id'],
                'status' => ReferralStatus::ACTIVE,
                'notes' => $validated['notes'] ?? null,
            ]);
            ReferralStatusHistory::create([
                'referral_id' => $referral->id,
                'status' => ReferralStatus::ACTIVE,
                'changed_by' => $user->id,
                'notes' => 'Rujukan darurat diterbitkan setelah konfirmasi T0.',
            ]);

            return ['created' => true];
        });

        if (isset($result['conflict'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Rujukan darurat hanya dapat dibuat setelah T0 dikonfirmasi.',
                $result['current'],
            );
        }
        if (isset($result['patient_missing'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Rujukan tidak dapat dibuat karena identitas pasien belum tercatat.',
                EmergencyStatus::CONFIRMED,
            );
        }
        if (isset($result['referral_conflict'])) {
            return $this->emergencyConflictResponse(
                $request,
                'Rujukan untuk kasus ini sudah tercatat ke Faskes lain dan tidak dapat diubah.',
                EmergencyStatus::CONFIRMED,
            );
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Rujukan darurat berhasil dibuat.']);
        }

        return back()->with('message', 'Rujukan darurat berhasil dibuat.');
    }

    private function emergencyConflictResponse(
        Request $request,
        string $message,
        EmergencyStatus $currentStatus,
    ): JsonResponse|RedirectResponse {
        if ($request->wantsJson()) {
            return response()->json([
                'message' => $message,
                'current_status' => $currentStatus->value,
            ], 409);
        }

        return back()->withErrors(['conflict' => $message]);
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
