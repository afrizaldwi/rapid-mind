<?php

declare(strict_types=1);

namespace App\Http\Controllers\Relawan;

use App\Domain\Assessment\AssessmentResume;
use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\TriageCategory;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\FunctionResponse;
use App\Models\Patient;
use App\Models\RiskResponse;
use App\Models\Shelter;
use App\Models\SrqResponse;
use App\Models\TriageResult;
use App\Domain\Triage\TriageCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class RelawanController extends Controller
{
    public function home(AssessmentResume $resume): InertiaResponse
    {
        $user = Auth::user();

        $activeDraft = Assessment::with(['patient', 'srqResponses', 'riskAssessment', 'functionAssessment'])
            ->where('user_id', $user->id)
            ->where('status', AssessmentStatus::IN_PROGRESS)
            ->latest('updated_at')
            ->first();

        if ($activeDraft) {
            $resume->attach($activeDraft);
        }

        $recentAssessments = Assessment::with(['patient', 'triageResult'])
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->take(5)
            ->get();

        $activeEmergency = EmergencyEvent::with('patient')
            ->where('user_id', $user->id)
            ->whereIn('status', [EmergencyStatus::PENDING, EmergencyStatus::ACKNOWLEDGED, EmergencyStatus::REVIEWING])
            ->latest()
            ->first();

        $shelter = $user->shelter_id ? Shelter::find($user->shelter_id) : null;

        return Inertia::render('Relawan/Home', [
            'activeDraft' => $activeDraft,
            'recentAssessments' => $recentAssessments,
            'activeEmergency' => $activeEmergency,
            'shelter' => $shelter,
        ]);
    }

    public function pfa(): InertiaResponse
    {
        return Inertia::render('Relawan/Pfa');
    }

    public function assessmentIndex(AssessmentResume $resume): InertiaResponse
    {
        $user = Auth::user();

        $inProgressAssessments = Assessment::with(['patient', 'srqResponses', 'riskAssessment', 'functionAssessment'])
            ->where('user_id', $user->id)
            ->where('status', AssessmentStatus::IN_PROGRESS)
            ->latest()
            ->get();

        $inProgressAssessments->each(fn (Assessment $assessment) => $resume->attach($assessment));

        $patients = Patient::where(fn ($query) => $query->where('created_by', $user->id)
            ->when($user->shelter_id, fn ($query) => $query->orWhere('shelter_id', $user->shelter_id)))
            ->latest()
            ->get();

        return Inertia::render('Relawan/Assessment/Index', [
            'inProgressAssessments' => $inProgressAssessments,
            'patients' => $patients,
        ]);
    }

    public function createAssessment(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'patient_id' => ['nullable', 'uuid', 'exists:patients,id'],
            'nik' => ['nullable', 'string', 'max:20'],
            'name' => ['required_without:patient_id', 'nullable', 'string', 'max:100'],
            'age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'gender' => ['nullable', 'string', 'in:Laki-laki,Perempuan'],
            'mode' => ['nullable', 'string', 'in:VERBAL,NON_VERBAL'],
        ]);

        $patientId = $validated['patient_id'] ?? null;

        if ($patientId && !Patient::whereKey($patientId)
            ->where(fn ($query) => $query->where('created_by', $user->id)
                ->when($user->shelter_id, fn ($query) => $query->orWhere('shelter_id', $user->shelter_id)))
            ->exists()) {
            throw ValidationException::withMessages(['patient_id' => 'Penyintas tidak tersedia untuk Relawan ini.']);
        }

        if (!$patientId) {
            $patient = Patient::create([
                'nik' => $validated['nik'] ?? null,
                'name' => $validated['name'],
                'age' => $validated['age'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'shelter_id' => $user->shelter_id,
                'created_by' => $user->id,
            ]);
            $patientId = $patient->id;
        }

        $assessment = Assessment::create([
            'patient_id' => $patientId,
            'user_id' => $user->id,
            'status' => AssessmentStatus::IN_PROGRESS,
            'mode' => isset($validated['mode']) ? AssessmentMode::from($validated['mode']) : AssessmentMode::VERBAL,
            'started_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json(['assessment_id' => $assessment->id], 201);
        }

        return redirect("/relawan/assessment/{$assessment->id}/srq");
    }

    public function assessmentIdentity(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, 'patient');

        return Inertia::render('Relawan/Assessment/Identity', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
        ]);
    }

    public function assessmentSrq(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, ['patient', 'srqResponses']);

        $existingResponses = $assessment?->srqResponses->pluck('answer', 'question_number')->toArray() ?? [];

        return Inertia::render('Relawan/Assessment/Srq', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
            'responses' => $existingResponses,
        ]);
    }

    public function saveSrq(Request $request, string $assessmentId): JsonResponse
    {
        $assessment = $this->ownedAssessment($assessmentId);

        $validated = $request->validate([
            'responses' => ['required', 'array', 'size:20'],
            'responses.*' => ['required', 'array:question_number,answer'],
            'responses.*.question_number' => ['required', 'integer', 'between:1,20', 'distinct:strict'],
            'responses.*.answer' => ['required', function ($attribute, $value, $fail) {
                if (!is_bool($value)) $fail('Jawaban SRQ harus Ya atau Tidak.');
            }],
            'mode' => ['nullable', 'string', 'in:VERBAL,NON_VERBAL'],
        ]);

        DB::transaction(function () use ($assessment, $validated) {
            if (isset($validated['mode'])) {
                $assessment->update(['mode' => AssessmentMode::from($validated['mode'])]);
            }

            foreach ($validated['responses'] as $resp) {
                SrqResponse::updateOrCreate(
                    ['assessment_id' => $assessment->id, 'question_number' => $resp['question_number']],
                    ['answer' => $resp['answer']]
                );
            }
        });

        return response()->json(['message' => 'Jawaban SRQ tersimpan di server.']);
    }

    public function assessmentRisk(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, ['patient', 'riskAssessment']);

        $existingRisks = $assessment?->riskAssessment->pluck('answer', 'indicator')->toArray() ?? [];

        return Inertia::render('Relawan/Assessment/Risk', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
            'risks' => $existingRisks,
        ]);
    }

    public function saveRisk(Request $request, string $assessmentId): JsonResponse
    {
        $assessment = $this->ownedAssessment($assessmentId);

        $validated = $request->validate([
            'risks' => ['required', 'array:R1,R2,R3,R4,R5', 'size:5'],
            ...collect(['R1', 'R2', 'R3', 'R4', 'R5'])->mapWithKeys(fn ($code) => ["risks.$code" => ['required', function ($attribute, $value, $fail) {
                if (!is_bool($value)) $fail('Jawaban risiko harus Ya atau Tidak.');
            }]])->all(),
        ]);

        $weights = ['R1' => 2, 'R2' => 2, 'R3' => 1, 'R4' => 2, 'R5' => 1];

        DB::transaction(function () use ($assessment, $validated, $weights) {
            foreach ($validated['risks'] as $indicator => $answer) {
                RiskResponse::updateOrCreate(
                    ['assessment_id' => $assessment->id, 'indicator' => $indicator],
                    ['answer' => $answer, 'weight' => $weights[$indicator]]
                );
            }
        });

        return response()->json(['message' => 'Faktor risiko tersimpan.']);
    }

    public function assessmentFunction(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, ['patient', 'functionAssessment']);

        $existingFunctions = $assessment?->functionAssessment->pluck('level', 'domain')->toArray() ?? [];

        return Inertia::render('Relawan/Assessment/Function', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
            'functions' => $existingFunctions,
        ]);
    }

    public function saveFunction(Request $request, string $assessmentId): JsonResponse
    {
        $assessment = $this->ownedAssessment($assessmentId);

        $validated = $request->validate([
            'functions' => ['required', 'array:F1,F2,F3', 'size:3'],
            ...collect(['F1', 'F2', 'F3'])->mapWithKeys(fn ($code) => ["functions.$code" => ['required', function ($attribute, $value, $fail) {
                if (!is_int($value) || !in_array($value, [0, 1, 3], true)) $fail('Nilai fungsi harus 0, 1, atau 3.');
            }]])->all(),
        ]);

        DB::transaction(function () use ($assessment, $validated) {
            foreach ($validated['functions'] as $domain => $level) {
                FunctionResponse::updateOrCreate(
                    ['assessment_id' => $assessment->id, 'domain' => $domain],
                    ['level' => $level]
                );
            }
        });

        return response()->json(['message' => 'Fungsi harian tersimpan.']);
    }

    public function assessmentReview(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, ['patient', 'srqResponses', 'riskAssessment', 'functionAssessment']);

        return Inertia::render('Relawan/Assessment/Review', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
            'srqResponses' => $assessment?->srqResponses->pluck('answer', 'question_number') ?? [],
            'riskResponses' => $assessment?->riskAssessment->pluck('answer', 'indicator') ?? [],
            'functionResponses' => $assessment?->functionAssessment->pluck('level', 'domain') ?? [],
        ]);
    }

    public function completeAssessment(Request $request, string $assessmentId, TriageCalculator $calculator): JsonResponse|RedirectResponse
    {
        $assessment = $this->ownedAssessment($assessmentId, ['srqResponses', 'riskAssessment', 'functionAssessment']);

        if (!$this->hasExactResponseSet($assessment->srqResponses, range(1, 20), 'question_number', 'answer', [true, false])
            || !$this->hasExactResponseSet($assessment->riskAssessment, ['R1', 'R2', 'R3', 'R4', 'R5'], 'indicator', 'answer', [true, false])
            || !$this->hasExactResponseSet($assessment->functionAssessment, ['F1', 'F2', 'F3'], 'domain', 'level', [0, 1, 3])) {
            throw ValidationException::withMessages([
                'assessment' => 'Asesmen belum lengkap atau memiliki jawaban tidak valid. Periksa SRQ-20, faktor risiko, dan fungsi harian.',
            ]);
        }

        $srqMap = $assessment->srqResponses->pluck('answer', 'question_number')->toArray();
        $riskMap = $assessment->riskAssessment->pluck('answer', 'indicator')->toArray();
        $functionMap = $assessment->functionAssessment->pluck('level', 'domain')->toArray();

        $result = $calculator->calculate($srqMap, $riskMap, $functionMap);

        TriageResult::updateOrCreate(
            ['assessment_id' => $assessment->id],
            [
                'srq_score' => $result->srqScore,
                'risk_score' => $result->riskScore,
                'function_score' => $result->functionScore,
                'total_score' => $result->totalScore,
                'system_recommendation' => $result->recommendation,
                'is_red_flag_override' => $result->isRedFlagOverride,
                'red_flag_source' => $result->redFlagSource,
            ]
        );

        $assessment->update([
            'status' => AssessmentStatus::COMPLETED,
            'completed_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Asesmen berhasil diselesaikan.',
                'result' => $result,
            ]);
        }

        return redirect("/relawan/assessment/{$assessment->id}/result");
    }

    private function hasExactResponseSet($responses, array $expectedKeys, string $key, string $value, array $allowedValues): bool
    {
        $actualKeys = $responses->pluck($key)->all();
        sort($actualKeys);
        sort($expectedKeys);

        return $actualKeys === $expectedKeys
            && $responses->every(fn ($response) => in_array($response->{$value}, $allowedValues, true));
    }

    public function assessmentResult(string $assessmentId): InertiaResponse
    {
        $assessment = $this->assessmentShell($assessmentId, ['patient', 'triageResult']);

        return Inertia::render('Relawan/Assessment/Result', [
            'assessment' => $assessment,
            'patient' => $assessment?->patient,
            'triageResult' => $assessment?->triageResult,
        ]);
    }

    private function ownedAssessment(string $assessmentId, array $relations = []): Assessment
    {
        abort_unless(\Illuminate\Support\Str::isUuid($assessmentId), 404);
        return Assessment::with($relations)->whereKey($assessmentId)
            ->where('user_id', Auth::id())->firstOrFail();
    }

    private function assessmentShell(string $assessmentId, array|string $relations = []): Assessment
    {
        abort_unless(\Illuminate\Support\Str::isUuid($assessmentId), 404);
        $assessment = Assessment::with($relations)->find($assessmentId);
        if ($assessment) {
            abort_unless($assessment->user_id === Auth::id(), 404);
            return $assessment;
        }

        $shell = new Assessment(['user_id' => Auth::id()]);
        $shell->id = $assessmentId;
        return $shell;
    }

    public function data(AssessmentResume $resume): InertiaResponse
    {
        $user = Auth::user();

        $inProgress = Assessment::with(['patient', 'srqResponses', 'riskAssessment', 'functionAssessment'])
            ->where('user_id', $user->id)
            ->where('status', AssessmentStatus::IN_PROGRESS)
            ->latest('updated_at')
            ->get();

        $inProgress->each(fn (Assessment $assessment) => $resume->attach($assessment));

        $completed = Assessment::with(['patient', 'triageResult'])
            ->where('user_id', $user->id)
            ->where('status', AssessmentStatus::COMPLETED)
            ->latest('completed_at')
            ->get();

        return Inertia::render('Relawan/Data', [
            'inProgress' => $inProgress,
            'completed' => $completed,
        ]);
    }

    public function emergencyDetail(string $emergencyId): InertiaResponse
    {
        $emergency = EmergencyEvent::with(['patient', 'shelter', 'verifications.verifier'])->findOrFail($emergencyId);

        return Inertia::render('Relawan/Emergency', [
            'emergency' => $emergency,
        ]);
    }

    public function triggerEmergency(Request $request): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'patient_id' => ['nullable', 'uuid', 'exists:patients,id'],
            'red_flag_type' => ['required', Rule::enum(RedFlagType::class)],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'assessment_id' => ['nullable', 'uuid', 'exists:assessments,id'],
        ]);

        $patientId = $validated['patient_id'] ?? null;
        if (isset($validated['assessment_id'])) {
            $assessment = Assessment::find($validated['assessment_id']);

            if (!$assessment || $assessment->user_id !== $user->id) {
                throw ValidationException::withMessages([
                    'assessment_id' => 'Asesmen tidak tersedia untuk Relawan ini.',
                ]);
            }

            if ($patientId !== null && $patientId !== $assessment->patient_id) {
                throw ValidationException::withMessages([
                    'patient_id' => 'Penyintas tidak sesuai dengan asesmen yang dipilih.',
                ]);
            }

            $patientId = $assessment->patient_id;
        }

        $redFlag = RedFlagType::from($validated['red_flag_type']);

        $emergency = EmergencyEvent::create([
            'patient_id' => $patientId,
            'assessment_id' => $validated['assessment_id'] ?? null,
            'user_id' => $user->id,
            'red_flag_type' => $redFlag,
            'status' => EmergencyStatus::PENDING,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'shelter_id' => $user->shelter_id,
            'notes' => $validated['notes'] ?? null,
        ]);

        $realtimeDelivered = true;
        try {
            event(new \App\Events\EmergencyCreated($emergency));
        } catch (\Throwable $exception) {
            $realtimeDelivered = false;
            report($exception);
        }

        $warning = 'Insiden T0 telah tersimpan di server, tetapi notifikasi realtime ke Healthcare belum dapat dikonfirmasi. Gunakan kanal komunikasi darurat cadangan bila diperlukan.';

        if ($request->wantsJson()) {
            return response()->json([
                'message' => $realtimeDelivered
                    ? 'Insiden T0 tersimpan di server dan notifikasi realtime berhasil dikirim.'
                    : 'Insiden T0 tersimpan di server.',
                'emergency_id' => $emergency->id,
                'realtime_delivered' => $realtimeDelivered,
                ...($realtimeDelivered ? [] : ['warning' => $warning]),
            ], 201);
        }

        $response = redirect("/relawan/emergencies/{$emergency->id}");

        return $realtimeDelivered ? $response : $response->with('error', $warning);
    }
}
