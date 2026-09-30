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
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class HealthcareController extends Controller
{
    public function emergencies(): InertiaResponse
    {
        $user = Auth::user();

        $emergencies = EmergencyEvent::with(['patient', 'shelter', 'user', 'verifications.verifier'])
            ->latest('created_at')
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
            'user',
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
            'facility_id' => ['nullable', 'integer', 'exists:healthcare_facilities,id'],
        ]);

        $clinicalResult = TriageCategory::from($validated['clinical_result']);

        $newStatus = match ($clinicalResult) {
            TriageCategory::T0_CONFIRMED => EmergencyStatus::CONFIRMED,
            TriageCategory::T1, TriageCategory::T2 => EmergencyStatus::DOWNGRADED,
            default => EmergencyStatus::REVIEWING,
        };

        DB::transaction(function () use ($emergency, $newStatus, $user, $clinicalResult, $validated): void {
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

            // If referral requested or confirmed T0, create referral
            if (($validated['create_referral'] ?? false) || $clinicalResult === TriageCategory::T0_CONFIRMED) {
                $facilityId = $validated['facility_id'] ?? $user->facility_id ?? HealthcareFacility::first()?->id;

                if ($emergency->patient_id && $facilityId) {
                    $referral = Referral::create([
                        'emergency_event_id' => $emergency->id,
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
        $assessments = Assessment::with(['patient', 'user.shelter', 'triageResult', 'clinicalValidation.validator'])
            ->where('status', \App\Enums\AssessmentStatus::COMPLETED)
            ->latest('completed_at')
            ->get();

        return Inertia::render('Healthcare/Validations/Index', [
            'assessments' => $assessments,
        ]);
    }

    public function validateAssessment(Request $request, string $assessmentId): JsonResponse|RedirectResponse
    {
        $user = Auth::user();
        $assessment = Assessment::findOrFail($assessmentId);

        $validated = $request->validate([
            'clinical_result' => ['required', 'string', 'in:T1,T2,T3'],
            'diagnosis_notes' => ['nullable', 'string', 'max:2000'],
            'intervention_plan' => ['nullable', 'string', 'max:2000'],
            'referral_required' => ['nullable', 'boolean'],
            'facility_id' => ['nullable', 'integer', 'exists:healthcare_facilities,id'],
        ]);

        $clinicalResult = TriageCategory::from($validated['clinical_result']);

        DB::transaction(function () use ($assessment, $user, $clinicalResult, $validated): void {
            ClinicalValidation::updateOrCreate(
                ['assessment_id' => $assessment->id],
                [
                    'validated_by' => $user->id,
                    'clinical_result' => $clinicalResult,
                    'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                    'intervention_plan' => $validated['intervention_plan'] ?? null,
                    'referral_required' => (bool)($validated['referral_required'] ?? false),
                ]
            );

            if ($validated['referral_required'] ?? false) {
                $facilityId = $validated['facility_id'] ?? $user->facility_id ?? HealthcareFacility::first()?->id;
                if ($facilityId) {
                    $ref = Referral::create([
                        'patient_id' => $assessment->patient_id,
                        'referred_by' => $user->id,
                        'facility_id' => $facilityId,
                        'status' => ReferralStatus::ACTIVE,
                        'notes' => $validated['intervention_plan'] ?? 'Rujukan tindak lanjut klinis.',
                    ]);

                    ReferralStatusHistory::create([
                        'referral_id' => $ref->id,
                        'status' => ReferralStatus::ACTIVE,
                        'changed_by' => $user->id,
                        'notes' => 'Rujukan klinis diterbitkan pasca-validasi asesmen.',
                    ]);
                }
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
        $user = Auth::user();
        $referral = Referral::findOrFail($referralId);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:ACTIVE,EN_ROUTE,ON_SITE,TRANSPORT,COMPLETED'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $newStatus = ReferralStatus::from($validated['status']);

        DB::transaction(function () use ($referral, $newStatus, $user, $validated): void {
            $referral->update([
                'status' => $newStatus,
            ]);

            ReferralStatusHistory::create([
                'referral_id' => $referral->id,
                'status' => $newStatus,
                'changed_by' => $user->id,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

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
        ])->findOrFail($patientId);

        return Inertia::render('Healthcare/Patients/Show', [
            'patient' => $patient,
        ]);
    }
}
