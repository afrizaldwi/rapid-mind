<template>
    <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4"
    >
        <div
            class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
            <!-- Header -->
            <div
                class="bg-red-800 text-white px-6 py-4 flex items-center justify-between"
            >
                <div class="flex items-center space-x-3">
                    <Siren class="h-6 w-6" aria-hidden="true" />
                    <div>
                        <h2
                            class="text-lg font-extrabold tracking-wide uppercase"
                        >
                            Verifikasi T0 Darurat
                        </h2>
                        <p class="text-xs text-red-200">
                            Sinyal Prioritas Tinggi ke PSC 119 & Tim Medis
                            Faskes
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    @click="$emit('close')"
                    class="text-red-200 hover:text-white p-1 rounded-lg"
                    aria-label="Tutup"
                >
                    <X class="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <!-- Scrollable Form Body -->
            <div class="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
                <!-- Gate 1: Penyintas -->
                <div class="space-y-3">
                    <label
                        class="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                        1. Identitas Penyintas
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
                                Penyintas dari asesmen aktif
                            </p>
                        </div>
                        <template v-else>
                            <div
                                v-if="chosenPatientId"
                                class="flex items-center justify-between gap-3"
                            >
                                <div class="min-w-0">
                                    <p class="text-xs text-slate-500">
                                        Penyintas terpilih
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
                                    class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                                >
                                    Ganti
                                </button>
                            </div>
                            <div v-else class="space-y-2">
                                <p class="text-sm font-semibold text-slate-700">
                                    Penyintas belum teridentifikasi
                                </p>
                                <p class="text-xs text-slate-500">
                                    Identitas dapat dilengkapi setelah kondisi
                                    darurat tertangani.
                                </p>
                                <label
                                    for="t0-patient-search"
                                    class="block text-sm font-semibold text-slate-700"
                                    >Cari penyintas (opsional)</label
                                >
                                <input
                                    id="t0-patient-search"
                                    v-model="patientSearch"
                                    type="search"
                                    placeholder="Cari nama penyintas..."
                                    class="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-3 text-sm"
                                />
                                <div class="space-y-2">
                                    <p
                                        v-if="filteredPatients.length"
                                        class="text-xs font-bold uppercase text-slate-500"
                                    >
                                        {{
                                            patientSearch.trim()
                                                ? "Hasil"
                                                : "Penyintas tersedia"
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
                                            class="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-800 break-words"
                                        >
                                            {{ patient.name }}
                                        </button>
                                    </div>

                                    <p
                                        v-else-if="patientSearch.trim()"
                                        class="text-sm text-slate-600"
                                    >
                                        Tidak ada penyintas yang cocok. T0 tetap
                                        dapat dikirim sebagai penyintas belum
                                        teridentifikasi.
                                    </p>
                                </div>
                            </div>
                        </template>
                        <p class="text-xs text-slate-500">
                            Jangan tinggalkan penyintas sendirian untuk mencari
                            identitas. Bantuan darurat tetap dapat dikirimkan.
                        </p>
                    </div>
                </div>

                <!-- Gate 2: Alasan Red Flag -->
                <div class="space-y-3">
                    <label
                        class="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                        2. Indikator Red Flag Utama *
                    </label>
                    <div class="grid grid-cols-1 gap-2.5">
                        <button
                            v-for="rf in redFlagOptions"
                            :key="rf.type"
                            type="button"
                            @click="selectRedFlag(rf.type)"
                            class="text-left p-3.5 rounded-xl border text-sm font-medium transition"
                            :class="
                                selectedRedFlag === rf.type
                                    ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-2 ring-red-500/20'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span>{{ rf.title }}</span>
                                <span
                                    v-if="selectedRedFlag === rf.type"
                                    class="text-red-700 font-bold text-base"
                                    >✓</span
                                >
                            </div>
                            <p class="text-xs text-slate-500 mt-1 font-normal">
                                {{ rf.desc }}
                            </p>
                        </button>
                    </div>
                </div>

                <!-- Gate 3: Catatan & Lokasi -->
                <div class="space-y-3">
                    <label
                        class="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                        3. Catatan Lapangan & Lokasi Penjemputan
                    </label>
                    <textarea
                        v-model="notes"
                        rows="2"
                        placeholder="Contoh: nama penyintas jika diketahui, tanda bahaya fisik, lokasi tenda spesifik, atau kondisi penyintas saat ini..."
                        class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    ></textarea>

                    <div
                        class="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200"
                    >
                        <div class="flex items-center space-x-2">
                            <MapPin class="h-4 w-4" aria-hidden="true" />
                            <span v-if="coordinates"
                                >Koordinat GPS tersedia</span
                            >
                            <span v-else
                                >GPS belum tersedia; T0 tetap dapat
                                disimpan</span
                            >
                        </div>
                        <button
                            type="button"
                            @click="acquireGps"
                            class="font-semibold text-teal-700 hover:text-teal-900"
                        >
                            {{ coordinates ? "Perbarui GPS" : "Cari GPS" }}
                        </button>
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
                class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3"
            >
                <button
                    type="button"
                    @click="$emit('close')"
                    class="sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
                >
                    Batalkan
                </button>
                <button
                    type="button"
                    :disabled="!selectedRedFlag || isSubmitting"
                    @click="submitEmergency"
                    class="sm:flex-2 py-3.5 px-6 rounded-xl bg-red-800 hover:bg-red-900 text-white font-extrabold text-sm tracking-wide shadow-md transition disabled:opacity-50"
                >
                    <span v-if="isSubmitting">Menyimpan T0-Suspect…</span>
                    <span v-else>KIRIM T0-SUSPECT</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { MapPin, Siren, X } from "lucide-vue-next";
import { patientRepository } from "@/offline/patientRepository";
import type { LocalPatient } from "@/offline/db";
import { relawanOwner } from "@/offline/assessmentWorkflow";
import { useRelawanRuntime } from "@/relawan/runtime";
import { createLocalEmergency } from "@/offline/emergencyWorkflow";
import { syncManager } from "@/offline/syncManager";

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

const owner = relawanOwner();
const runtime = useRelawanRuntime();
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
const selectedPatientName = computed(
    () =>
        selectablePatients.value.find(
            (patient) => patient.id === chosenPatientId.value,
        )?.name ||
        (chosenPatientId.value === props.patientId
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
const selectedRedFlag = ref("");
const notes = ref("");
const isSubmitting = ref(false);
const submissionError = ref("");
const coordinates = ref<{ lat: number; lng: number } | null>(null);

const redFlagOptions = [
    {
        type: "SUICIDAL_IDEATION",
        title: "Ideasi / Perilaku Bunuh Diri",
        desc: "Ungkapan ingin mengakhiri hidup (SRQ #17) atau tindakan melukai diri aktif.",
    },
    {
        type: "PSYCHOSIS",
        title: "Gejala Psikosis Akut / Disosiasi Berat",
        desc: "Halusinasi, delusi paranoid, mutisme total/katatonia pascabencana.",
    },
    {
        type: "SEVERE_AGITATION",
        title: "Amuk / Agitasi Fisik Parah",
        desc: "Perilaku merusak, membahayakan keselamatan diri dan orang lain di posko.",
    },
    {
        type: "MEDICAL_CRISIS",
        title: "Kegawatdaruratan Medis & Somatik",
        desc: "Pingsan berulang, hiperventilasi parah, atau nyeri dada psikosomatik krisis.",
    },
];

function acquireGps() {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
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
        if (!show) return;
        selectedRedFlag.value =
            props.suggestedRedFlag === "SUICIDAL_IDEATION"
                ? props.suggestedRedFlag
                : "";
        notes.value = "";
        chosenPatientId.value = props.assessmentId
            ? (props.patientId ?? "")
            : "";
        patientSearch.value = "";
        availablePatients.value = [];
        fetchedPatients.value = [];
        void patientRepository
            .list(owner)
            .then((patients) => {
                if (props.show && check === patientLoadCheck)
                    availablePatients.value = patients;
            })
            .catch(() => {
                if (check === patientLoadCheck) availablePatients.value = [];
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
                    if (props.show && check === patientLoadCheck && Array.isArray(patients))
                        fetchedPatients.value = patients;
                })
                .catch(() => {
                    // Local patients and existing page snapshots remain usable.
                });
        }
        coordinates.value = null;
        submissionError.value = "";
        acquireGps();
    },
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
    selectedRedFlag.value = type;
    submissionError.value = "";
}

async function submitEmergency() {
    if (isSubmitting.value || !selectedRedFlag.value) return;
    submissionError.value = "";
    isSubmitting.value = true;
    let id: string;
    try {
        if (
            chosenPatientId.value &&
            !(await patientRepository.get(owner, chosenPatientId.value))
        ) {
            const serverPatient = serverPatientOptions.value.find(
                (patient) => patient.id === chosenPatientId.value,
            );
            if (serverPatient)
                await patientRepository.saveServerSnapshot(
                    owner,
                    serverPatient,
                );
        }
        id = await createLocalEmergency(owner, {
            patientId: chosenPatientId.value || null,
            assessmentId: props.assessmentId,
            redFlagType: selectedRedFlag.value,
            shelterId: runtime.shelterId,
            notes: notes.value,
            latitude: coordinates.value?.lat ?? null,
            longitude: coordinates.value?.lng ?? null,
        });
    } catch (error) {
        submissionError.value = `T0 BELUM TERSIMPAN. ${error instanceof Error ? error.message : "Coba simpan kembali."}`;
        isSubmitting.value = false;
        return;
    }
    isSubmitting.value = false;
    window.dispatchEvent(
        new CustomEvent("rapid-mind:emergency-created", {
            detail: { owner, id },
        }),
    );
    emit("close");
    await nextTick();
    if (runtime.mode === "ONLINE_SERVER") void syncManager.sync(owner);
}
</script>
