<template>
    <div v-if="emergency" class="space-y-5 pb-20">
        <div class="rounded-xl bg-red-800 p-6 text-white shadow-xl">
            <div class="flex items-center gap-2 text-xs font-bold uppercase">
                <Siren class="h-4 w-4" aria-hidden="true" />
                <p>Insiden T0-Suspect</p>
            </div>
            <h2 class="mt-2 text-2xl font-black">
                {{ emergency.patient_name || "Penyintas Tanpa Nama" }}
            </h2>
            <p class="mt-1 text-sm">{{ reason }}</p>
        </div>

        <div
            class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm"
        >
            <div class="flex justify-between gap-3">
                <span>Status klinis</span><strong>{{ clinicalStatus }}</strong>
            </div>
            <div class="flex justify-between gap-3">
                <span>Transmisi</span><strong>{{ transmission }}</strong>
            </div>
            <div class="flex justify-between gap-3">
                <span>Respons Healthcare</span
                ><strong>{{ healthcareResponse }}</strong>
            </div>
        </div>

        <div
            class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
            <strong>✓ Aman tersimpan di perangkat.</strong>
            <p v-if="emergency.sync_state !== 'SYNCED'" class="mt-1">
                Belum diterima server. Sistem akan mencoba kembali saat koneksi
                tersedia.
            </p>
            <p v-if="emergency.sync_state === 'SYNC_FAILED'" class="mt-1">
                Sinkronisasi belum berhasil. Insiden tetap tersimpan dengan ID
                yang sama.
            </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <p>
                <strong>Waktu:</strong>
                {{ new Date(emergency.created_at).toLocaleString("id-ID") }}
            </p>
            <p>
                <strong>Lokasi:</strong>
                {{
                    emergency.latitude != null && emergency.longitude != null
                        ? `${emergency.latitude},
        ${emergency.longitude}`
                        : "GPS tidak tersedia"
                }}
            </p>
            <p v-if="emergency.notes">
                <strong>Catatan:</strong> {{ emergency.notes }}
            </p>
        </div>

        <p
            v-if="retryError"
            role="alert"
            class="text-sm font-semibold text-red-800"
        >
            {{ retryError }}
        </p>
        <button
            v-if="emergency.sync_state !== 'SYNCED'"
            type="button"
            class="w-full rounded-xl bg-teal-700 p-3 font-bold text-white"
            @click="retry"
        >
            Coba sinkronkan kembali
        </button>
        <a
            v-else
            :href="`/relawan/emergencies/${emergency.id}`"
            class="block rounded-xl bg-teal-700 p-3 text-center font-bold text-white"
            >Lihat respons Healthcare</a
        >
        <a
            :href="smsHref"
            class="block rounded-xl bg-slate-800 p-3 text-center font-bold text-white"
            >Buka aplikasi SMS cadangan</a
        >
        <p class="text-center text-xs text-slate-600">
            Periksa dan kirim pesan sendiri di aplikasi SMS.
        </p>
        <button
            v-if="emergency.sync_state === 'SYNCED'"
            type="button"
            class="w-full p-2 text-sm font-semibold text-slate-700"
            @click="$emit('close')"
        >
            Kembali ke halaman sebelumnya
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Siren } from "lucide-vue-next";
import { liveQuery, type Subscription } from "dexie";
import { db, type LocalEmergency } from "@/offline/db";
import { retryEmergency } from "@/offline/emergencyWorkflow";
import { useRelawanRuntime } from "@/relawan/runtime";

type ServerEmergencyStatus =
    | "PENDING"
    | "ACKNOWLEDGED"
    | "REVIEWING"
    | "CONFIRMED"
    | "DOWNGRADED"
    | "RESOLVED";
type ServerResponse = {
    id: string;
    status: ServerEmergencyStatus;
    clinical_result: "T0_CONFIRMED" | "T1" | "T2" | "T3" | null;
    updated_at: string | null;
};

const props = defineProps<{ owner: number; id: string }>();
defineEmits<{ (e: "close"): void }>();
const emergency = ref<LocalEmergency | null>(null);
const serverResponse = ref<ServerResponse | null>(null);
const online = ref(typeof navigator !== "undefined" && navigator.onLine);
const runtime = useRelawanRuntime();
const retryError = ref("");

onMounted(() => {
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
});
onUnmounted(() => {
    window.removeEventListener("online", updateOnline);
    window.removeEventListener("offline", updateOnline);
});

function updateOnline() {
    online.value = navigator.onLine;
}

watch(
    [() => props.owner, () => props.id],
    ([owner, id], _, onCleanup) => {
        emergency.value = null;
        serverResponse.value = null;
        const subscription: Subscription = liveQuery(async () => {
            const record = await db.emergencies.get(id);
            return record?.owner_user_id === owner ? record : null;
        }).subscribe((record) => {
            emergency.value = record;
        });
        onCleanup(() => subscription.unsubscribe());
    },
    { immediate: true },
);

watch(
    [
        () => props.owner,
        () => props.id,
        () => emergency.value?.sync_state,
        () => runtime.mode,
        online,
    ],
    ([owner, id, syncState, mode, isOnline], _, onCleanup) => {
        if (
            emergency.value?.id !== id ||
            emergency.value.owner_user_id !== owner ||
            syncState !== "SYNCED" ||
            mode !== "ONLINE_SERVER" ||
            !isOnline
        )
            return;

        let active = true;
        let inFlight = false;
        let request: AbortController | null = null;
        async function refresh() {
            if (!active || inFlight) return;
            inFlight = true;
            request = new AbortController();
            try {
                const response = await fetch(
                    `/relawan/emergencies/${encodeURIComponent(id)}/status`,
                    {
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        signal: request.signal,
                    },
                );
                if (!response.ok) return;
                const status = (await response.json()) as ServerResponse;
                if (
                    active &&
                    props.owner === owner &&
                    props.id === id &&
                    status.id === id
                )
                    serverResponse.value = status;
            } catch {
                // Keep the last known Healthcare response and retry next interval.
            } finally {
                inFlight = false;
                request = null;
            }
        }

        void refresh();
        const timer = window.setInterval(() => void refresh(), 4000);
        onCleanup(() => {
            active = false;
            window.clearInterval(timer);
            request?.abort();
        });
    },
    { immediate: true },
);

const currentResponse = computed(() =>
    emergency.value?.sync_state === "SYNCED" ? serverResponse.value : null,
);
const clinicalStatus = computed(() => {
    const response = currentResponse.value;
    if (
        response?.clinical_result === "T0_CONFIRMED" ||
        response?.status === "CONFIRMED"
    )
        return "T0 dikonfirmasi Healthcare";
    const clinicalResult = response?.clinical_result;
    if (clinicalResult && ["T1", "T2", "T3"].includes(clinicalResult))
        return `${clinicalResult} — ditetapkan Healthcare`;
    if (response?.status === "DOWNGRADED")
        return "Klasifikasi diperbarui Healthcare";
    return "T0-Suspect";
});
const healthcareResponse = computed(() => {
    if (emergency.value?.sync_state !== "SYNCED")
        return "Belum dapat dipastikan";
    const response = currentResponse.value;
    if (!response) return "Lihat status di server";
    return {
        PENDING: "Belum diakui Healthcare",
        ACKNOWLEDGED: "Diakui Healthcare",
        REVIEWING: "Sedang ditinjau Healthcare",
        CONFIRMED: "Dikonfirmasi Healthcare",
        DOWNGRADED: "Klasifikasi diperbarui Healthcare",
        RESOLVED: "Insiden selesai",
    }[response.status];
});

const transmission = computed(
    () =>
        ({
            LOCAL_SAVED: "Tersimpan di perangkat",
            PENDING_SYNC: "Menunggu sinkronisasi",
            SYNCING: "Menyinkronkan",
            SYNCED: "Diterima server",
            SYNC_FAILED: "Sinkronisasi belum berhasil",
        })[emergency.value?.sync_state ?? "LOCAL_SAVED"],
);

const reason = computed(
    () =>
        ({
            SUICIDAL_IDEATION: "Ideasi / perilaku bunuh diri",
            PSYCHOSIS: "Gejala psikosis akut / disosiasi berat",
            SEVERE_AGITATION: "Agitasi berbahaya",
            MEDICAL_CRISIS: "Kegawatdaruratan medis",
        })[emergency.value?.red_flag_type ?? ""] ?? "Indikator Red Flag",
);

const smsHref = computed(() => {
    const item = emergency.value;
    const message = `[SOS RAPID-MIND T0] ${item?.red_flag_type ?? ""}. Penyintas: ${item?.patient_name || "Tanpa Nama"}. Lokasi: ${item?.latitude != null && item.longitude != null ? `${item.latitude}, ${item.longitude}` : "GPS tidak tersedia"}. Mohon bantuan PSC 119.`;
    return `sms:119?body=${encodeURIComponent(message)}`;
});

async function retry() {
    retryError.value = "";
    try {
        await retryEmergency(props.owner, props.id);
    } catch {
        retryError.value =
            "Percobaan sinkronisasi belum berhasil. Insiden tetap tersimpan di perangkat.";
    }
}
</script>
