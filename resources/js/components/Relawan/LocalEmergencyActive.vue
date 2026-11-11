<template>
    <div v-if="emergency" class="space-y-5 pb-20">
        <div class="rounded-xl bg-red-800 p-6 text-white shadow-xl">
            <div class="flex items-center gap-2 text-xs font-bold uppercase">
                <Siren class="h-4 w-4" aria-hidden="true" />
                <p>{{ isEn ? "T0-Suspect Incident" : "Insiden T0-Suspect" }}</p>
            </div>
            <h2 class="mt-2 text-2xl font-black">
                {{ emergency.patient_name || (isEn ? "Unidentified Survivor" : "Penyintas Tanpa Nama") }}
            </h2>
            <p class="mt-1 text-sm">{{ reason }}</p>
        </div>

        <div
            class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm"
        >
            <div class="flex justify-between gap-3">
                <span>{{ isEn ? "Report status" : "Status laporan" }}</span><strong>T0-Suspect</strong>
            </div>
            <div class="flex justify-between gap-3">
                <span>{{ isEn ? "Transmission" : "Transmisi" }}</span><strong>{{ delivery.label }}</strong>
            </div>
        </div>

        <div
            class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
            <strong>{{ isEn ? "✓ Saved on device." : "✓ Tersimpan di perangkat." }}</strong>
            <p class="mt-1">{{ delivery.detail }}</p>
            <p class="mt-1">{{ delivery.realtime }}</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <p>
                <strong>{{ isEn ? "Time:" : "Waktu:" }}</strong>
                {{ new Date(emergency.created_at).toLocaleString(isEn ? "en-US" : "id-ID") }}
            </p>
            <p>
                <strong>{{ isEn ? "Location:" : "Lokasi:" }}</strong>
                {{
                    emergency.latitude != null && emergency.longitude != null
                        ? `${emergency.latitude}, ${emergency.longitude}`
                        : (isEn ? "GPS unavailable" : "GPS tidak tersedia")
                }}
            </p>
            <p v-if="emergency.notes">
                <strong>{{ isEn ? "Notes:" : "Catatan:" }}</strong> {{ emergency.notes }}
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
            {{ isEn ? "Retry synchronization" : "Coba sinkronkan kembali" }}
        </button>
        <a
            v-else
            :href="`/relawan/emergencies/${emergency.id}`"
            class="block rounded-xl bg-teal-700 p-3 text-center font-bold text-white"
            >{{ isEn ? "View T0 report details" : "Lihat detail laporan T0" }}</a
        >
        <a
            :href="smsHref"
            class="block rounded-xl bg-slate-800 p-3 text-center font-bold text-white"
            >{{ isEn ? "Open backup SMS app" : "Buka aplikasi SMS cadangan" }}</a
        >
        <p class="text-center text-xs text-slate-600">
            {{ smsGuidance }}
        </p>
        <button
            v-if="emergency.sync_state === 'SYNCED'"
            type="button"
            class="w-full p-2 text-sm font-semibold text-slate-700"
            @click="$emit('close')"
        >
            {{ isEn ? "Back to previous page" : "Kembali ke halaman sebelumnya" }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Siren } from "lucide-vue-next";
import { liveQuery, type Subscription } from "dexie";
import { type LocalEmergency } from "@/offline/db";
import { emergencyRepository } from "@/offline/emergencyRepository";
import { retryEmergency } from "@/offline/emergencyWorkflow";
import {
    emergencyDeliveryStatus,
    getEmergencySmsHref,
    getEmergencySmsGuidance,
} from "@/lib/emergencyDelivery";
import { useI18n } from "@/i18n";

const { locale, isEn } = useI18n();
const props = defineProps<{ owner: number; id: string }>();
defineEmits<{ (e: "close"): void }>();
const emergency = ref<LocalEmergency | null>(null);
const retryErrorFailed = ref(false);
const retryError = computed(() =>
    retryErrorFailed.value
        ? isEn.value
            ? "Synchronization attempt did not succeed. Incident remains saved on device."
            : "Percobaan sinkronisasi belum berhasil. Insiden tetap tersimpan di perangkat."
        : "",
);

watch(
    [() => props.owner, () => props.id],
    ([owner, id], _, onCleanup) => {
        emergency.value = null;
        const subscription: Subscription = liveQuery(async () => {
            return (await emergencyRepository.get(owner, id)) ?? null;
        }).subscribe((record) => {
            emergency.value = record;
        });
        onCleanup(() => subscription.unsubscribe());
    },
    { immediate: true },
);

const delivery = computed(() =>
    emergencyDeliveryStatus(emergency.value ?? { sync_state: "LOCAL_SAVED" }, locale.value),
);
const smsHref = computed(() => getEmergencySmsHref(locale.value));
const smsGuidance = computed(() => getEmergencySmsGuidance(locale.value));

const reason = computed(() => {
    const code = emergency.value?.red_flag_type ?? "";
    if (isEn.value) {
        return (
            {
                SUICIDAL_IDEATION: "Suicidal ideation / behavior",
                PSYCHOSIS: "Acute psychosis / severe dissociation",
                SEVERE_AGITATION: "Dangerous agitation",
                MEDICAL_CRISIS: "Medical emergency",
            }[code] ?? "Red Flag Indicator"
        );
    }
    return (
        {
            SUICIDAL_IDEATION: "Ideasi / perilaku bunuh diri",
            PSYCHOSIS: "Gejala psikosis akut / disosiasi berat",
            SEVERE_AGITATION: "Agitasi berbahaya",
            MEDICAL_CRISIS: "Kegawatdaruratan medis",
        }[code] ?? "Indikator Red Flag"
    );
});

async function retry() {
    retryErrorFailed.value = false;
    try {
        await retryEmergency(props.owner, props.id);
    } catch {
        retryErrorFailed.value = true;
    }
}
</script>
