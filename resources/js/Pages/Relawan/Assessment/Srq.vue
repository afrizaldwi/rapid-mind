<template>
    <RelawanLayout @clinical-lock="scope.invalidate" @clinical-ready="loadDraft" @emergency-interrupt="interruptAssessment">
        <div class="space-y-6 pb-64">
            <!-- Top Patient & Progress Sticky Bar -->
            <div
                class="bg-white rounded-xl p-4 shadow-xs border border-slate-200 sticky top-16 z-20 space-y-3"
            >
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-sm font-bold text-slate-900">
                            {{ patient?.name || (isEn ? "Survivor" : "Penyintas") }}
                        </h2>
                        <p class="text-xs text-slate-500">
                            NIK: {{ patient?.nik || (isEn ? "Without NIK" : "Tanpa NIK") }}
                        </p>
                    </div>
                    <div class="text-right">
                        <span
                            class="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200"
                        >
                            {{ isEn ? `${answeredCount} of 20 Answered` : `${answeredCount} dari 20 Terjawab` }}
                        </span>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div
                    class="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                >
                    <div
                        class="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        :style="{ width: `${(answeredCount / 20) * 100}%` }"
                    ></div>
                </div>

                <!-- Verbal / Non-Verbal Mode & Dual-Mode STT -->
                <div
                    class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs"
                >
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold text-slate-600">Mode:</span>
                        <button
                            type="button"
                            @click="toggleMode"
                            :disabled="!draftReady || !!safety"
                            class="min-h-14 px-3 rounded-lg border font-bold inline-flex items-center gap-1.5"
                            :class="
                                isVerbal
                                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                            "
                        >
                            <Mic
                                v-if="isVerbal"
                                class="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                            <span>{{ isVerbal ? (isEn ? "Verbal" : "Verbal") : (isEn ? "Non-Verbal" : "Non-Verbal") }}</span>
                        </button>
                    </div>

                    <div
                        v-if="isVerbal"
                        class="flex flex-wrap items-center gap-2"
                    >
                        <div
                            role="group"
                            :aria-label="isEn ? 'STT mode options' : 'Pilihan mode STT'"
                            class="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5"
                        >
                            <button
                                type="button"
                                data-stt-mode="offline"
                                :aria-pressed="sttMode === 'offline'"
                                :disabled="!draftReady || !!safety"
                                @click="selectSttMode('offline')"
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition disabled:opacity-60"
                                :class="
                                    sttMode === 'offline'
                                        ? 'bg-teal-700 text-white shadow-2xs'
                                        : 'text-slate-700 hover:bg-slate-200'
                                "
                            >
                                {{ isEn ? "Offline" : "Offline" }}
                            </button>
                            <button
                                type="button"
                                data-stt-mode="online"
                                :aria-pressed="sttMode === 'online'"
                                :disabled="!draftReady || !!safety"
                                @click="selectSttMode('online')"
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition disabled:opacity-60"
                                :class="
                                    sttMode === 'online'
                                        ? 'bg-teal-700 text-white shadow-2xs'
                                        : 'text-slate-700 hover:bg-slate-200'
                                "
                            >
                                {{ isEn ? "Online" : "Online" }}
                            </button>
                        </div>

                        <button
                            type="button"
                            data-stt-action
                            :disabled="sttButtonDisabled"
                            @click="handleSttAction"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border disabled:opacity-60"
                            :class="
                                sttStatus === 'recording'
                                    ? 'bg-red-700 text-white border-red-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                            "
                        >
                            <Mic
                                v-if="sttStatus === 'ready'"
                                class="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                            <span>{{ sttButtonLabel }}</span>
                        </button>
                        <button
                            v-if="sttStatus === 'recording'"
                            type="button"
                            data-stt-cancel
                            @click="cancelRecording"
                            class="px-3 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100"
                        >
                            {{ isEn ? "Cancel" : "Batalkan" }}
                        </button>
                    </div>
                </div>

                <div
                    v-if="isVerbal"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                    aria-live="polite"
                >
                    <div
                        class="flex flex-wrap items-center justify-between gap-2"
                    >
                        <span class="font-bold text-slate-800">{{
                            sttStatusLabel
                        }}</span>
                        <span
                            v-if="sttMode === 'offline' && sttBackend"
                            class="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-bold text-teal-800"
                        >
                            Backend:
                            {{
                                sttBackend === "webgpu"
                                    ? "WebGPU"
                                    : "WASM / CPU"
                            }}
                        </span>
                        <span
                            v-else-if="sttMode === 'online'"
                            class="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-900"
                        >
                            Mode: Web Speech (id-ID)
                        </span>
                    </div>

                    <div
                        v-if="onlineConsentRequired"
                        data-stt-online-consent
                        class="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-2"
                    >
                        <p class="font-bold text-amber-900">
                            {{ isEn ? "Online STT Privacy Notice" : "Pemberitahuan Privasi STT Online" }}
                        </p>
                        <p class="leading-relaxed">
                            <template v-if="isEn">
                                Online STT mode uses browser built-in <em>SpeechRecognition</em> which may transmit and process voice via browser provider server services (not guaranteed to be processed privately on-device). This mode is only permitted for local testing with synthetic voice and data.
                            </template>
                            <template v-else>
                                Mode STT Online menggunakan <em>SpeechRecognition</em>
                                bawaan browser yang dapat mengirim dan memproses suara
                                melalui layanan server penyedia browser (tidak dijamin
                                diproses secara privat di perangkat). Mode ini hanya
                                diizinkan untuk pengujian lokal dengan suara dan data
                                sintetis.
                            </template>
                        </p>
                        <div class="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                type="button"
                                data-stt-consent-accept
                                @click="grantOnlineConsent"
                                class="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition"
                            >
                                {{ isEn ? "Accept & Enable Online STT (Synthetic Data)" : "Setuju & Aktifkan STT Online (Data Sintetis)" }}
                            </button>
                            <button
                                type="button"
                                data-stt-consent-decline
                                @click="declineOnlineConsent"
                                class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                            >
                                {{ isEn ? "Use Offline STT" : "Gunakan STT Offline" }}
                            </button>
                        </div>
                    </div>

                    <p
                        v-if="
                            sttMode === 'offline' &&
                            sttStatus === 'preparing' &&
                            sttProgress !== null
                        "
                        class="mt-1"
                    >
                        {{ isEn ? `Model file progress: ${sttProgress}%` : `Progres berkas model: ${sttProgress}%` }}
                    </p>
                    <p
                        v-if="sttMessage"
                        :class="
                            sttStatus === 'error'
                                ? 'mt-1 font-semibold text-red-800'
                                : 'mt-1 text-slate-600'
                        "
                    >
                        {{ sttMessage }}
                    </p>
                    <div
                        v-if="sttMode === 'online' && sttFallbackSuggested"
                        class="mt-2"
                    >
                        <button
                            type="button"
                            data-stt-fallback-offline
                            @click="fallbackToOffline"
                            class="px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs transition"
                        >
                            {{ isEn ? "Switch to Offline STT" : "Beralih ke STT Offline" }}
                        </button>
                    </div>
                    <p
                        v-if="localizedSttInterpretationNotice"
                        class="mt-1 font-semibold text-amber-900"
                    >
                        {{ localizedSttInterpretationNotice }}
                    </p>
                    <div
                        v-if="interimTranscript"
                        data-stt-interim
                        class="mt-2 rounded-lg bg-amber-50/70 p-2 text-sm text-slate-800 border border-amber-200"
                    >
                        <span
                            class="block text-[11px] font-bold uppercase tracking-wide text-amber-800"
                            >{{ isEn ? "Interim transcript (not yet answering)" : "Transkrip sementara (belum mengisi jawaban)" }}</span
                        >
                        <p class="mt-1 italic">“{{ interimTranscript }}”</p>
                    </div>
                    <div
                        v-if="transcriptSnippet"
                        data-stt-final
                        class="mt-2 rounded-lg bg-white p-2 text-sm text-slate-900 border border-slate-200"
                    >
                        <span
                            class="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
                            >{{ isEn ? "Final transcript" : "Transkrip final" }}</span
                        >
                        <p class="mt-1">“{{ transcriptSnippet }}”</p>
                    </div>
                    <p class="mt-2 text-[11px] text-slate-500">
                        <template v-if="sttMode === 'offline'">
                            {{ isEn
                                ? "Audio is processed entirely on-device. Only safely matching statements populate answers; manual corrections are always preserved."
                                : "Audio diproses di perangkat. Hanya pernyataan yang cocok dengan aman yang mengisi jawaban; koreksi manual selalu dipertahankan."
                            }}
                        </template>
                        <template v-else>
                            {{ isEn
                                ? "Online Mode (synthetic testing only): voice may be processed by browser provider services. Only final transcripts are checked against conservative SRQ rules; manual corrections are always preserved."
                                : "Mode Online (khusus uji sintetis): suara dapat diproses layanan penyedia browser. Hanya hasil transkripsi final yang diperiksa aturan SRQ konservatif; koreksi manual selalu dipertahankan."
                            }}
                        </template>
                    </p>
                </div>
            </div>

            <NonVerbalObservationFields v-if="!isVerbal || observations.non_verbal_reasons?.length"
                :model-value="observations" :disabled="!draftReady || !!safety"
                @toggle="saveObservations(toggleObservation(observations, $event))"
                @note="saveObservations({ ...observations, non_verbal_other_note: $event })"
                @clear="saveObservations({ non_verbal_reasons: [], non_verbal_other_note: null })" />
            <div v-if="metadataError" role="alert" class="rounded-lg bg-amber-50 p-3 text-base text-amber-900">{{ metadataError }} <button type="button" class="min-h-14 underline font-bold" :disabled="!draftReady || metadataPending > 0" @click="retryMetadata">{{ isEn ? "Try Saving Draft" : "Coba Simpan Draf" }}</button></div>

            <!-- SRQ-20 Scrollable Question List -->
            <div class="space-y-4">
                <div
                    v-for="q in srqQuestions"
                    :key="q.number"
                    :id="`srq-question-${q.number}`" tabindex="-1"
                    class="scroll-mt-64 bg-white p-5 rounded-xl border transition"
                    :class="
                        answers[q.number] === true
                            ? 'border-teal-400 shadow-xs'
                            : 'border-slate-200 shadow-xs'
                    "
                >
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-2">
                            <span
                                class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                            >
                                #{{ String(q.number).padStart(2, "0") }}
                            </span>
                            <span
                                v-if="q.number === 17"
                                class="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800"
                            >
                                <TriangleAlert
                                    class="h-3.5 w-3.5"
                                    aria-hidden="true"
                                />
                                <span>{{ $t('assessment.srq.redFlagGate', 'Red Flag Gate') }}</span>
                            </span>
                        </div>
                    </div>

                    <p
                        class="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                        {{ isEn ? "Question" : "Pertanyaan" }}
                    </p>
                    <h3
                        class="mt-1 text-xl font-bold leading-snug text-slate-900"
                    >
                        {{ $t(`assessment.srq.questions.${q.number}.script`, q.script) }}
                    </h3>

                    <SrqResponseControl :number="q.number" :answer="answers[q.number]"
                        :disabled="!draftReady || !!safety" @select="setManualAnswer(q.number, $event)" />

                    <div class="mt-3 border-t border-slate-100 pt-2">
                        <button
                            type="button"
                            class="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-bold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 cursor-pointer"
                            :aria-expanded="expandedGuidance.has(q.number)"
                            :aria-controls="`srq-guidance-${q.number}`"
                            @click="toggleGuidance(q.number)"
                        >
                            <span>{{ isEn ? "Volunteer guidance" : "Petunjuk relawan" }}</span>
                            <ChevronDown
                                class="h-5 w-5 shrink-0 transition-transform"
                                :class="
                                    expandedGuidance.has(q.number)
                                        ? 'rotate-180'
                                        : ''
                                "
                                aria-hidden="true"
                            />
                        </button>
                        <div
                            v-if="expandedGuidance.has(q.number)"
                            :id="`srq-guidance-${q.number}`"
                            class="mt-1 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700"
                        >
                            <p
                                class="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500"
                            >
                                {{ isEn ? "Volunteer Guidance" : "Petunjuk Relawan" }}
                            </p>
                            <p class="mt-1">{{ $t(`assessment.srq.questions.${q.number}.instruction`, q.volunteerInstruction) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sticky Bottom Navigation: Next to Risk Factors -->
            <div
                data-assessment-action-bar
                class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto"
            >
                <div class="flex items-center justify-between space-x-3">
                    <RelawanLink
                        href="/relawan/assessment"
                        class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                        ← {{ isEn ? "Back" : "Kembali" }}
                    </RelawanLink>
                    <button
                        type="button"
                        @click="saveAndNext"
                        :disabled="
                            isSaving || !draftReady || answeredCount !== 20 || !!safety || metadataPending > 0
                        "
                        class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60 cursor-pointer"
                    >
                        {{ isEn ? `Next: Risk Factors (${answeredCount}/20) →` : `Lanjut: Faktor Risiko (${answeredCount}/20) →` }}
                    </button>
                </div>
                <p
                    v-if="answeredCount !== 20"
                    class="mt-2 text-xs text-slate-600"
                >
                    {{ isEn ? `Complete all answers before proceeding (${answeredCount}/20).` : `Lengkapi semua jawaban sebelum melanjutkan (${answeredCount}/20).` }}
                </p>
                <p
                    v-if="draftWarning"
                    role="alert"
                    class="mt-2 text-xs font-semibold text-amber-900"
                >
                    {{ draftWarning }}
                </p>
                <p
                    v-if="saveError"
                    role="alert"
                    class="mt-2 text-xs font-semibold text-red-800"
                >
                    {{ saveError }}
                </p>
            </div>
        </div>

        <SrqSafetyDialog :state="safety" :evidence="safetyEvidence" @confirm="confirmQ17" @dismiss="dismissSafety" @escalate="handleEscalate" />

        <!-- T0 Verification Modal -->
        <T0Verification
            :show="showEmergencyVerification"
            :patient-id="patient?.id"
            :patient-name="patient?.name"
            :assessment-id="assessment?.id"
            suggested-red-flag="SUICIDAL_IDEATION"
            @close="showEmergencyVerification = false"
        />
    </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { ChevronDown, Mic, TriangleAlert } from "lucide-vue-next";
import RelawanLink from "@/relawan/RelawanLink.vue";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";
import { useRelawanRuntime } from "@/relawan/runtime";
import {
    mergeAssessmentDraft,
    readAssessmentDraft,
    saveAssessmentDraft, saveObservationDraft, saveAssessmentMode,
} from "@/offline/assessmentDraft";
import {
    loadAssessmentContext,
    relawanOwner,
} from "@/offline/assessmentWorkflow";
import type { LocalAssessment, LocalPatient } from "@/offline/db";
import T0Verification from "@/components/Relawan/T0Verification.vue";
import { useSrqSpeech } from "@/composables/useSrqSpeech";
import { useSrqResponses } from "@/composables/useSrqResponses";
import { useClinicalTaskScope } from "@/composables/useClinicalTaskScope";
import SrqResponseControl from "@/components/Relawan/Assessment/SrqResponseControl.vue";
import SrqSafetyDialog from "@/components/Relawan/Assessment/SrqSafetyDialog.vue";
import NonVerbalObservationFields from "@/components/Relawan/Assessment/NonVerbalObservationFields.vue";
import { srqQuestions } from "@/domain/srq/srqQuestions";
import type { SrqAnswers } from "@/domain/srq/srqAnswer";
import { toggleObservation } from "@/domain/assessment/observationPresentation";
import type { NonVerbalObservations } from "@/domain/assessment/nonVerbalObservations";

const props = defineProps<{
    assessment: any;
    patient: any;
    responses?: SrqAnswers;
}>();

const answers = ref<SrqAnswers>(
    mergeAssessmentDraft("srq_answers", props.responses, {}),
);
const runtime = useRelawanRuntime();
const { isEn, locale, t: $t } = useI18n();
const owner = relawanOwner();
const localAssessment = ref<LocalAssessment | null>(null);
const patient = ref<LocalPatient | null>(props.patient);
const isSaving = ref(false);
type LocalizedMsg = { id: string; en: string } | string;
const resolveMsg = (msg: LocalizedMsg) =>
    typeof msg === "string"
        ? localizeMessage(msg, locale.value)
        : isEn.value
          ? msg.en
          : msg.id;
const rawSaveError = ref<LocalizedMsg>("");
const rawDraftWarning = ref<LocalizedMsg>("");
const rawMetadataError = ref<LocalizedMsg>("");
const saveError = computed(() => resolveMsg(rawSaveError.value));
const draftWarning = computed(() => resolveMsg(rawDraftWarning.value));
const metadataError = computed(() => resolveMsg(rawMetadataError.value));
const localizedSttInterpretationNotice = computed(() =>
    localizeMessage(sttInterpretationNotice.value, locale.value),
);
const draftReady = ref(false);
const isVerbal = ref(props.assessment?.mode !== "NON_VERBAL");
const observations = ref<NonVerbalObservations>({});
const metadataPending = ref(0);
const showEmergencyVerification = ref(false);
const expandedGuidance = ref(new Set<number>());
const scope = useClinicalTaskScope(() => {
    cleanupStt();
    reset();
    showEmergencyVerification.value = false;
    draftReady.value = false;
    answers.value = {};
    observations.value = {};
    patient.value = null;
    localAssessment.value = null;
    metadataPending.value = 0;
    isSaving.value = false;
    rawSaveError.value = "";
    rawDraftWarning.value = "";
    rawMetadataError.value = "";
});
const { safety, safetyEvidence, answeredCount, setManualAnswer, confirmQ17, dismissSafety,
    applySpeechTranscript, reset } = useSrqResponses(answers, () => draftReady.value,
        persistDraft, () => cleanupStt());
const {
    sttMode,
    onlineConsentRequired,
    sttFallbackSuggested,
    sttStatus,
    sttBackend,
    sttProgress,
    sttMessage,
    interimTranscript,
    transcriptSnippet,
    sttInterpretationNotice,
    sttButtonDisabled,
    sttButtonLabel,
    sttStatusLabel,
    selectSttMode,
    grantOnlineConsent,
    declineOnlineConsent,
    fallbackToOffline,
    handleSttAction,
    cancelRecording,
    cleanupStt,
} = useSrqSpeech(
    () => draftReady.value && isVerbal.value && !safety.value && !showEmergencyVerification.value,
    text => { const notice = applySpeechTranscript(text); if (notice) sttInterpretationNotice.value = notice; },
);
function interruptAssessment() {
    cleanupStt();
    dismissSafety();
    showEmergencyVerification.value = false;
}

function toggleGuidance(questionNumber: number) {
    const next = new Set(expandedGuidance.value);
    if (next.has(questionNumber)) next.delete(questionNumber);
    else next.add(questionNumber);
    expandedGuidance.value = next;
}

function handleEscalate() {
    cleanupStt();
    dismissSafety();
    showEmergencyVerification.value = true;
}

async function toggleMode() {
    if (!draftReady.value || !localAssessment.value || safety.value) return;
    const current = scope.capture();
    const nextMode = isVerbal.value ? "NON_VERBAL" : "VERBAL";
    if (nextMode === "NON_VERBAL") cleanupStt();
    isVerbal.value = nextMode === "VERBAL";
    localAssessment.value.mode = nextMode;
    metadataPending.value++;
    try {
        await saveAssessmentMode(owner, props.assessment.id, nextMode, current);
        if (current()) rawMetadataError.value = "";
    } catch {
        if (current()) {
            rawMetadataError.value = {
                id: "Mode atau antrean sinkronisasinya belum tersimpan. Coba simpan draf kembali.",
                en: "Mode or its sync queue has not been saved yet. Try saving draft again.",
            };
        }
    } finally { if (current()) metadataPending.value--; }
}

async function saveObservations(value: NonVerbalObservations) {
    if (!draftReady.value || safety.value) return;
    const current = scope.capture();
    observations.value = value;
    metadataPending.value++;
    try {
        await saveObservationDraft(owner, props.assessment.id, value, current);
        if (current()) rawMetadataError.value = "";
    } catch {
        if (current()) {
            rawMetadataError.value = {
                id: "Observasi atau antrean sinkronisasinya belum tersimpan. Coba simpan draf kembali.",
                en: "Observations or their sync queue have not been saved yet. Try saving draft again.",
            };
        }
    } finally { if (current()) metadataPending.value--; }
}
async function retryMetadata() {
    if (!draftReady.value) return;
    const current = scope.capture();
    metadataPending.value++;
    try {
        await saveAssessmentMode(owner, props.assessment.id, isVerbal.value ? "VERBAL" : "NON_VERBAL", current);
        await saveObservationDraft(owner, props.assessment.id, observations.value, current);
        if (current()) rawMetadataError.value = "";
    } catch {
        if (current()) {
            rawMetadataError.value = {
                id: "Mode atau observasi belum tersimpan. Coba lagi.",
                en: "Mode or observations have not been saved yet. Please try again.",
            };
        }
    } finally { if (current()) metadataPending.value--; }
}

async function persistDraft() {
    const current = scope.capture();
    if (!draftReady.value) return;
    try {
        if (!localAssessment.value)
            throw new Error("Asesmen lokal belum siap.");
        await saveAssessmentDraft(
            { ...localAssessment.value, user_id: owner },
            "srq_answers",
            answers.value, current,
        );
        if (current()) rawDraftWarning.value = "";
    } catch {
        if (!current()) return;
        rawDraftWarning.value = {
            id: "Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.",
            en: "Local draft is not saved yet. Answers on this page remain intact; please try selecting an answer again.",
        };
    }
}

async function loadDraft() {
    if (runtime.owner !== owner) return;
    const current = scope.capture();
    draftReady.value = false;
    try {
        const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === "OFFLINE_FIELD_MODE");
        if (!current()) return;
        const local = await readAssessmentDraft(owner, props.assessment.id, "srq_answers");
        if (!current()) return;
        localAssessment.value = context.assessment;
        isVerbal.value = context.assessment.mode === "VERBAL";
        patient.value = context.patient;
        observations.value = {
            non_verbal_reasons: context.assessment.non_verbal_reasons ?? [],
            non_verbal_other_note: context.assessment.non_verbal_other_note ?? null,
        };
        answers.value = mergeAssessmentDraft("srq_answers", props.responses, local);
        draftReady.value = context.assessment.status === "IN_PROGRESS";
        rawDraftWarning.value = draftReady.value
            ? ""
            : {
                  id: "Asesmen selesai tidak dapat diubah.",
                  en: "Completed assessments cannot be modified.",
              };
        const target = window.location.hash;
        if (/^#srq-question-(?:[1-9]|1[0-9]|20)$/.test(target)) {
            await nextTick();
            if (current()) document.querySelector<HTMLElement>(target)?.focus();
        }
    } catch (error) {
        if (current()) {
            rawDraftWarning.value = error instanceof Error
                ? error.message
                : {
                      id: "Asesmen lokal tidak dapat dibaca.",
                      en: "Local assessment cannot be read.",
                  };
        }
    }
}

async function saveAndNext() {
    if (isSaving.value || !draftReady.value || safety.value || metadataPending.value) return;
    const current = scope.capture();
    if (answeredCount.value !== 20) {
        rawSaveError.value = {
            id: "Lengkapi semua jawaban sebelum melanjutkan.",
            en: "Complete all answers before proceeding.",
        };
        return;
    }
    isSaving.value = true;
    rawSaveError.value = "";
    try {
        await persistDraft();
        if (!current()) return;
        if (metadataError.value) throw new Error(metadataError.value);
        if (draftWarning.value) throw new Error(draftWarning.value);
        runtime.navigate(`/relawan/assessment/${props.assessment.id}/risk`);
    } catch {
        if (!current()) return;
        rawSaveError.value = {
            id: "Jawaban belum tersimpan di perangkat ini. Coba lagi.",
            en: "Answers are not saved on this device yet. Please try again.",
        };
    } finally {
        if (current()) isSaving.value = false;
    }
}
</script>
