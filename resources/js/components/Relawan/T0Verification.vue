<template>
    <div
        v-if="show"
        class="rm-app fixed inset-0 z-50 bg-slate-50 flex justify-center"
    >
        <div ref="dialogPanel" role="dialog" aria-modal="true" aria-labelledby="t0-verification-title" tabindex="-1" @keydown="keydown"
            class="t0-page bg-white w-full overflow-hidden flex flex-col"
        >
            <!-- Header -->
            <div
                class="t0-header flex items-center justify-between gap-3"
            >
                <div class="flex items-center space-x-3">
                    <Siren class="size-11 shrink-0 rounded-xl bg-red-50 p-2.5 text-red-800" :stroke-width="1.6" aria-hidden="true" />
                    <div>
                        <h2 id="t0-verification-title"
                            class="text-xl sm:text-2xl font-semibold tracking-tight"
                        >
                            {{ isEn ? "Verify T0 Emergency" : "Verifikasi T0 Darurat" }}
                        </h2>
                        <p class="text-sm text-slate-600">
                            {{ isEn ? "Emergency report for the authorized Healthcare team" : "Laporan darurat untuk tim Healthcare berwenang" }}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    :disabled="isSubmitting"
                    @click="$emit('close')"
                    class="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                    :aria-label="isEn ? 'Close' : 'Tutup'"
                >
                    <X class="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <!-- Scrollable Form Body -->
            <div class="t0-body overflow-y-auto flex-1 min-h-0 text-slate-900">
                <div class="t0-content">
                <LockedEmergencyGuidance />
                <!-- Gate 1: Penyintas -->
                <div class="space-y-3">
                    <label
                        class="block text-lg font-semibold tracking-tight text-slate-900"
                    >
                        {{ isEn ? "Survivor identity" : "Identitas penyintas" }}
                    </label>
                    <div
                        class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                        <div
                            v-if="assessmentId"
                            class="font-bold text-slate-800 text-base"
                        >
                            {{ selectedPatientName }}
                            <p class="text-xs font-normal text-slate-500">
                                {{ isEn ? "Survivor from active assessment" : "Penyintas dari asesmen aktif" }}
                            </p>
                        </div>
                        <template v-else>
                            <div
                                v-if="chosenPatientId"
                                class="flex items-center justify-between gap-3"
                            >
                                <div class="min-w-0">
                                    <p class="text-xs text-slate-500">
                                        {{ isEn ? "Selected survivor" : "Penyintas terpilih" }}
                                    </p>
                                    <p
                                        class="font-bold text-slate-800 break-words"
                                    >
                                        {{ selectedPatientName }}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    @click="clearPatientSelection"
                                    class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 cursor-pointer"
                                >
                                    {{ isEn ? "Change" : "Ganti" }}
                                </button>
                            </div>
                            <div v-else class="space-y-2">
                                <p class="text-sm font-semibold text-slate-700">
                                    {{ isEn ? "Survivor not yet identified" : "Penyintas belum teridentifikasi" }}
                                </p>
                                <p class="text-xs text-slate-500">
                                    {{ isEn ? "Identity details can be completed after the emergency is addressed." : "Identitas dapat dilengkapi setelah kondisi darurat tertangani." }}
                                </p>
                                <label
                                    for="t0-patient-search"
                                    class="block text-sm font-semibold text-slate-700"
                                    >{{ isEn ? "Search survivor (optional)" : "Cari penyintas (opsional)" }}</label
                                >
                                <input
                                    id="t0-patient-search"
                                    v-model="patientSearch"
                                    type="search"
                                    :placeholder="isEn ? 'Search survivor name...' : 'Cari nama penyintas...'"
                                    class="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-3 text-sm"
                                />
                                <div class="space-y-2">
                                    <p
                                        v-if="filteredPatients.length"
                                        class="text-xs font-bold uppercase text-slate-500"
                                    >
                                        {{
                                            patientSearch.trim()
                                                ? (isEn ? "Results" : "Hasil")
                                                : (isEn ? "Available survivors" : "Penyintas tersedia")
                                        }}
                                    </p>

                                    <div
                                        v-if="filteredPatients.length"
                                        class="max-h-56 overflow-y-auto space-y-1"
                                    >
                                        <button
                                            v-for="patient in filteredPatients"
                                            :key="patient.id"
                                            type="button"
                                            @click="choosePatient(patient.id)"
                                            class="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-800 break-words cursor-pointer"
                                        >
                                            {{ patient.name }}
                                        </button>
                                    </div>

                                    <p
                                        v-else-if="patientSearch.trim()"
                                        class="text-sm text-slate-600"
                                    >
                                        {{ isEn ? "No matching survivors found. T0 can still be submitted as unidentified." : "Tidak ada penyintas yang cocok. T0 tetap dapat dikirim sebagai penyintas belum teridentifikasi." }}
                                    </p>
                                </div>
                            </div>
                        </template>
                        <p class="text-xs text-slate-500">
                            {{ isEn ? "Do not leave survivor alone to search for identity. Emergency assistance can still be sent." : "Jangan tinggalkan penyintas sendirian untuk mencari identitas. Bantuan darurat tetap dapat dikirimkan." }}
                        </p>
                    </div>
                </div>

                <!-- Gate 2: Alasan Red Flag -->
                <fieldset class="min-w-0" :disabled="isSubmitting">
                    <legend class="text-lg font-semibold tracking-tight">{{ isEn ? 'Primary red flags' : 'Indikator red flag utama' }}</legend>
                    <div class="mt-1 mb-3 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                        <p>{{ isEn ? 'Select all that apply. Choose at least one.' : 'Pilih semua yang sesuai, minimal satu.' }}</p>
                        <span aria-live="polite" class="font-semibold tabular-nums">{{ selectedFlags.length }} {{ isEn ? 'selected' : 'dipilih' }}</span>
                    </div>
                    <div class="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 divide-y divide-slate-200">
                        <button v-for="rf in redFlagOptions" :key="rf.type" type="button"
                            :aria-pressed="selectedFlags.includes(rf.type)" @click="selectRedFlag(rf.type)"
                            class="t0-option">
                            <span aria-hidden="true" class="t0-check">{{ selectedFlags.includes(rf.type) ? '✓' : '' }}</span>
                            <span><strong class="block font-semibold">{{ rf.title }}</strong>
                                <span class="mt-1 block text-sm text-slate-600">{{ rf.desc }}</span>
                            </span>
                        </button>
                    </div>
                </fieldset>

                <!-- Gate 3: Catatan & Lokasi -->
                <div class="space-y-3">
                    <label for="t0-notes"
                        class="block text-lg font-semibold tracking-tight text-slate-900"
                    >
                        {{ isEn ? "Field notes & pickup location" : "Catatan & lokasi penjemputan" }}
                    </label>
                    <textarea id="t0-notes" maxlength="1000"
                        v-model="notes"
                        rows="2"
                        :placeholder="isEn ? 'Example: survivor name if known, physical danger signs, specific tent location, or current condition...' : 'Contoh: nama penyintas jika diketahui, tanda bahaya fisik, lokasi tenda spesifik, atau kondisi penyintas saat ini...'"
                        class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    ></textarea>

                    <div
                        class="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200"
                    >
                        <div class="flex items-center space-x-2">
                            <MapPin class="h-4 w-4" aria-hidden="true" />
                            <span v-if="coordinates"
                                >{{ isEn ? "GPS coordinates available" : "Koordinat GPS tersedia" }}</span
                            >
                            <span v-else
                                >{{ isEn ? "GPS not available yet; T0 can still be saved" : "GPS belum tersedia; T0 tetap dapat disimpan" }}</span
                            >
                        </div>
                        <button
                            type="button"
                            @click="acquireGps"
                            class="font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                        >
                            {{ coordinates ? (isEn ? "Update GPS" : "Perbarui GPS") : (isEn ? "Find GPS" : "Cari GPS") }}
                        </button>
                    </div>
                </div>
                </div>
            </div>

            <div
                v-if="submissionError"
                role="alert"
                class="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900"
            >
                {{ submissionError }}
            </div>

            <!-- Action Footer -->
            <div
                class="t0-footer flex items-center gap-3"
            >
                <button
                    type="button"
                    :disabled="isSubmitting"
                    @click="$emit('close')"
                    class="py-3 px-4 rounded-full text-slate-700 font-semibold text-sm hover:bg-slate-100 transition cursor-pointer"
                >
                    {{ isEn ? "Cancel" : "Batalkan" }}
                </button>
                <button
                    type="button"
                    :disabled="!selectedFlags.length || isSubmitting"
                    @click="submitEmergency"
                    class="flex-1 sm:flex-none py-3 px-5 rounded-full bg-red-800 hover:bg-red-900 text-white font-extrabold text-sm tracking-wide transition disabled:opacity-50 cursor-pointer"
                >
                    <span v-if="isSubmitting">{{ isEn ? "Saving T0-Suspect…" : "Menyimpan T0-Suspect…" }}</span>
                    <span v-else>{{ isEn ? "SEND T0-SUSPECT REPORT" : "KIRIM T0-SUSPECT" }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject } from "vue";
import { MapPin, Siren, X } from "lucide-vue-next";
import { patientRepository } from "@/offline/patientRepository";
import type { LocalPatient } from "@/offline/db";
import { relawanOwner, loadAssessmentContext } from "@/offline/assessmentWorkflow";
import { onlineAssessmentContextKey } from "@/relawan/onlineAssessmentContext";
import { useRelawanRuntime } from "@/relawan/runtime";
import { createLocalEmergency } from "@/offline/emergencyWorkflow";
import { syncManager } from "@/offline/syncManager";
import { useClinicalTaskScope } from "@/composables/useClinicalTaskScope";
import { clinicalKeyReady, clinicalKeyVersion } from "@/offline/encryptedClinicalStorage";
import { cacheRelawanPatients } from "@/offline/cacheRelawanPage";
import { waitForDeviceClinicalAccess } from "@/offline/deviceKeyWorkflow";
import LockedEmergencyGuidance from "@/components/Relawan/LockedEmergencyGuidance.vue";
import { useDialogFocus } from "@/composables/useDialogFocus";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const { locale } = useI18n();
const isEn = computed(() => locale.value === "en");

const props = defineProps<{
    show: boolean;
    patientId?: string;
    patientName?: string;
    assessmentId?: string;
    suggestedRedFlag?: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const dialogPanel = ref<HTMLElement | null>(null);
const { keydown } = useDialogFocus(dialogPanel, () => props.show, () => { if (!isSubmitting.value) emit("close"); });
const scope = useClinicalTaskScope(() => {
    if (dialogPanel.value) dialogPanel.value.style.display = "none";
    ++patientLoadCheck;
    availablePatients.value = [];
    fetchedPatients.value = [];
    patientSearch.value = "";
    chosenPatientId.value = "";
    notes.value = "";
    coordinates.value = null;
    selectedFlags.value = [];
}, { serverOnly: true });
const owner = relawanOwner();
let keyWasReady = clinicalKeyReady(owner);
watch(clinicalKeyVersion, () => {
    const ready = clinicalKeyReady(owner);
    const restoring = !keyWasReady && ready;
    keyWasReady = ready;
    if (!restoring) scope.invalidate();
}, { flush: "sync" });
const runtime = useRelawanRuntime();
const onlineAssessmentContext = inject(onlineAssessmentContextKey, undefined);
const chosenPatientId = ref("");
const patientSearch = ref("");
const availablePatients = ref<LocalPatient[]>([]);
type ServerPatientOption = Pick<LocalPatient, "id" | "name"> & Partial<LocalPatient>;
const fetchedPatients = ref<ServerPatientOption[]>([]);
const serverPatients = computed(
    () =>
        (runtime.pageProps.patients as
            | ServerPatientOption[]
            | undefined) ?? [],
);
const serverPatientOptions = computed(() => [
    ...serverPatients.value,
    ...fetchedPatients.value,
]);
const selectablePatients = computed(() => {
    const byId = new Map(
        availablePatients.value.map((patient) => [patient.id, patient]),
    );
    for (const patient of serverPatientOptions.value)
        if (!byId.has(patient.id))
            byId.set(patient.id, {
                ...patient,
                owner_user_id: owner,
                sync_state: "SYNCED",
            });
    return [...byId.values()];
});
// Assessment context is authoritative; a synchronous show watcher can run before
// Vue finishes updating the other dynamic props in a production render block.
const effectivePatientId = computed(() =>
    props.assessmentId ? (props.patientId ?? "") : chosenPatientId.value,
);
const selectedPatientName = computed(
    () =>
        selectablePatients.value.find(
            (patient) => patient.id === effectivePatientId.value,
        )?.name ||
        (effectivePatientId.value === props.patientId
            ? props.patientName
            : undefined),
);
const filteredPatients = computed(() => {
    const query = patientSearch.value.trim().toLocaleLowerCase();

    if (!query) {
        return selectablePatients.value;
    }

    return selectablePatients.value.filter((patient) =>
        patient.name.toLocaleLowerCase().includes(query),
    );
});
const selectedFlags = ref<string[]>([]);
const notes = ref("");
const isSubmitting = ref(false);
const rawSubmissionError = ref<{ id: string; detail?: string } | string>("");
const submissionError = computed(() => {
    const val = rawSubmissionError.value;
    if (!val) return "";
    if (typeof val === "string") {
        return localizeMessage(val, locale.value);
    }
    const prefix = isEn.value ? "T0 NOT SAVED YET." : "T0 BELUM TERSIMPAN.";
    const fallback = isEn.value ? "Try saving again." : "Coba simpan kembali.";
    const detail = val.detail ? localizeMessage(val.detail, locale.value) : fallback;
    return `${prefix} ${detail}`;
});
const coordinates = ref<{ lat: number; lng: number } | null>(null);

const redFlagOptions = computed(() => [
    {
        type: "SUICIDAL_IDEATION",
        title: isEn.value ? "Suicidal Ideation / Behavior" : "Ideasi / Perilaku Bunuh Diri",
        desc: isEn.value
            ? "Expression of desire to end life (SRQ #17) or active self-harm."
            : "Ungkapan ingin mengakhiri hidup (SRQ #17) atau tindakan melukai diri aktif.",
    },
    {
        type: "PSYCHOSIS",
        title: isEn.value ? "Acute Psychosis / Severe Dissociation" : "Gejala Psikosis Akut / Disosiasi Berat",
        desc: isEn.value
            ? "Hallucinations, paranoid delusions, complete mutism / catatonia post-disaster."
            : "Halusinasi, delusi paranoid, mutisme total/katatonia pascabencana.",
    },
    {
        type: "SEVERE_AGITATION",
        title: isEn.value ? "Severe Agitation / Violent Outburst" : "Amuk / Agitasi Fisik Parah",
        desc: isEn.value
            ? "Destructive behavior, endangering self and others at the shelter."
            : "Perilaku merusak, membahayakan keselamatan diri dan orang lain di posko.",
    },
    {
        type: "MEDICAL_CRISIS",
        title: isEn.value ? "Medical & Somatic Crisis" : "Kegawatdaruratan Medis & Somatik",
        desc: isEn.value
            ? "Recurrent fainting, severe hyperventilation, or crisis psychosomatic chest pain."
            : "Pingsan berulang, hiperventilasi parah, atau nyeri dada psikosomatik krisis.",
    },
]);

function acquireGps() {
    const current = scope.capture();
    const check = patientLoadCheck;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (!current() || !props.show || check !== patientLoadCheck) return;
                coordinates.value = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
            },
            () => {
                // Fallback silently if GPS denied or offline
            },
            { timeout: 5000 },
        );
    }
}

let patientLoadCheck = 0;
watch(
    () => props.show,
    (show) => {
        const check = ++patientLoadCheck;
        if (!show) { scope.invalidate(); return; }
        const current = scope.capture();
        selectedFlags.value =
            props.suggestedRedFlag === "SUICIDAL_IDEATION"
                ? [props.suggestedRedFlag]
                : [];
        notes.value = "";
        isSubmitting.value = false;
        chosenPatientId.value = "";
        patientSearch.value = "";
        availablePatients.value = [];
        fetchedPatients.value = [];
        if (clinicalKeyReady(owner)) void patientRepository
            .list(owner)
            .then((patients) => {
                if (current() && props.show && check === patientLoadCheck)
                    availablePatients.value = patients;
            })
            .catch(() => {
                if (current() && check === patientLoadCheck) availablePatients.value = [];
            });
        if (runtime.mode === "ONLINE_SERVER" && navigator.onLine) {
            void fetch("/relawan/patients/options", {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            })
                .then(async (response) => {
                    if (!response.ok) throw new Error("Patient options unavailable");
                    return (await response.json()) as ServerPatientOption[];
                })
                .then((patients) => {
                    if (current() && props.show && check === patientLoadCheck && Array.isArray(patients)) {
                        fetchedPatients.value = patients;
                        void cacheRelawanPatients(owner, patients).catch(() => {});
                    }
                })
                .catch(() => {
                    // Local patients and existing page snapshots remain usable.
                });
        }
        coordinates.value = null;
        rawSubmissionError.value = "";
        acquireGps();
    },
    { flush: "sync" },
);

function choosePatient(id: string) {
    chosenPatientId.value = id;
    patientSearch.value = "";
}

function clearPatientSelection() {
    chosenPatientId.value = "";
    patientSearch.value = "";
}

function selectRedFlag(type: string) {
    if (isSubmitting.value) return;
    selectedFlags.value = selectedFlags.value.includes(type)
        ? selectedFlags.value.filter(flag => flag !== type)
        : [...selectedFlags.value, type];
    rawSubmissionError.value = "";
}

async function submitEmergency() {
    if (!props.show || isSubmitting.value || !selectedFlags.value.length) return;
    const current = scope.capture();
    const input = {
        patientId: effectivePatientId.value || null, assessmentId: props.assessmentId,
        redFlagType: selectedFlags.value[0], redFlagTypes: [...selectedFlags.value], shelterId: runtime.shelterId, notes: notes.value,
        latitude: coordinates.value?.lat ?? null, longitude: coordinates.value?.lng ?? null,
        serverKnownAssessment: false,
        serverAssessmentMode: undefined as "VERBAL" | "NON_VERBAL" | undefined,
    };
    rawSubmissionError.value = "";
    isSubmitting.value = true;
    let id: string;
    try {
        await waitForDeviceClinicalAccess(owner);
        if (!current() || !props.show) return;
        const context = input.assessmentId ? onlineAssessmentContext?.() : null;
        if (context && context.assessment.id === input.assessmentId &&
            context.assessment.user_id === owner && context.patient.id === input.patientId) {
            await loadAssessmentContext(owner, context.assessment, context.patient);
            if (!current() || !props.show) return;
            input.serverKnownAssessment = true;
            input.serverAssessmentMode = context.assessment.mode;
        }
        const patient = input.patientId ? await patientRepository.get(owner, input.patientId) : null;
        if (!current() || !props.show) return;
        if (input.patientId && !patient) {
            const serverPatient = serverPatientOptions.value.find(patient => patient.id === input.patientId);
            if (serverPatient) await patientRepository.saveServerSnapshot(owner, serverPatient);
        }
        if (!current() || !props.show) return;
        // Once started, the existing atomic emergency/outbox write retains its durability guarantee.
        id = await createLocalEmergency(owner, input);
    } catch (error) {
        if (!current() || !props.show) return;
        rawSubmissionError.value = {
            id: "T0 BELUM TERSIMPAN.",
            detail: error instanceof Error ? error.message : "",
        };
        isSubmitting.value = false;
        return;
    }
    if (!current() || !props.show) return;
    isSubmitting.value = false;
    window.dispatchEvent(
        new CustomEvent("rapid-mind:emergency-created", {
            detail: { owner, id },
        }),
    );
    void syncManager.sync(owner).catch(() => {});
    emit("close");
}
</script>

<style scoped>
.t0-page { height: 100%; height: 100dvh; }
.t0-header,.t0-footer { flex: none; padding: .8rem max(1rem,calc((100% - 48rem)/2)); background: white; }
.t0-header { border-top: .25rem solid #991b1b; box-shadow: inset 0 -1px #e2e8f0; }
.t0-body { background: #f5f7f8; overscroll-behavior: contain; }
.t0-content { width: min(100%,50rem); margin-inline: auto; padding: 1rem; display: grid; gap: 1.5rem; }
.t0-content > div.space-y-3 { padding: 1rem; border-radius: 1rem; background: white; box-shadow: 0 2px 12px #33415508; }
.t0-option { width: 100%; display: flex; align-items: flex-start; gap: .85rem; text-align: start; padding: .95rem 1rem; }
.t0-option:hover { background: #f8fafc; }
.t0-option[aria-pressed=true] { background: #fff4f3; color: #78171b; }
.t0-check { margin-top: .15em; width: 1.25rem; height: 1.25rem; flex: none; border: 1.5px solid #64748b; border-radius: .35rem; display: grid; place-items: center; line-height: 1; }
[aria-pressed=true] > .t0-check { background: #991b1b; border-color: #991b1b; color: white; }
.t0-option:focus-visible { outline: 2px solid #0f766e; outline-offset: -3px; }
.t0-footer { justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-bottom: max(.8rem,env(safe-area-inset-bottom)); }
@media(min-width: 48rem) { .t0-content { padding-block: 1.75rem; gap: 1.75rem; } }
@media(prefers-reduced-motion: no-preference) { .t0-check { transition: transform .16s cubic-bezier(.2,.8,.2,1); } .t0-option:active .t0-check { transform: scale(.94); } }
</style>
