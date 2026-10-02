<template>
    <div v-if="emergency" class="space-y-5 pb-20">
        <div class="rounded-3xl bg-red-800 p-6 text-white shadow-xl">
            <div class="flex items-center gap-2 text-xs font-bold uppercase">
                <Siren class="h-4 w-4" aria-hidden="true" />
                <p>T0-Suspect Aktif</p>
            </div>
            <h2 class="mt-2 text-2xl font-black">
                {{ emergency.patient_name || "Penyintas Tanpa Nama" }}
            </h2>
            <p class="mt-1 text-sm">{{ reason }}</p>
        </div>

        <div
            class="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm"
        >
            <div class="flex justify-between gap-3">
                <span>Status klinis</span><strong>T0-Suspect</strong>
            </div>
            <div class="flex justify-between gap-3">
                <span>Transmisi</span><strong>{{ transmission }}</strong>
            </div>
            <div class="flex justify-between gap-3">
                <span>Respons Healthcare</span
                ><strong>{{
                    emergency.sync_state === "SYNCED"
                        ? "Lihat status di server"
                        : "Belum dapat dipastikan"
                }}</strong>
            </div>
        </div>

        <div
            class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
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

        <div class="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Siren } from 'lucide-vue-next';
import { liveQuery, type Subscription } from "dexie";
import { db, type LocalEmergency } from "@/offline/db";
import { retryEmergency } from "@/offline/emergencyWorkflow";

const props = defineProps<{ owner: number; id: string }>();
defineEmits<{ (e: "close"): void }>();
const emergency = ref<LocalEmergency | null>(null);
const retryError = ref("");
let subscription: Subscription | undefined;

onMounted(() => {
    subscription = liveQuery(async () => {
        const record = await db.emergencies.get(props.id);
        return record?.owner_user_id === props.owner ? record : null;
    }).subscribe((record) => {
        emergency.value = record;
    });
});
onUnmounted(() => subscription?.unsubscribe());

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
