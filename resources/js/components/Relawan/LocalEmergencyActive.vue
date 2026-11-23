<template>
    <article v-if="emergency" class="incident mx-auto grid w-full max-w-4xl gap-4 text-slate-900 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-start">
        <header class="space-y-3 px-1 pt-1 md:px-4 md:pt-5">
            <p class="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-900">
                <Siren class="size-5" aria-hidden="true" />
                {{ isEn ? "T0-Suspect Incident" : "Insiden T0-Suspect" }}
            </p>
            <h1 class="break-words text-[clamp(1.6rem,5vw,2.4rem)] font-semibold leading-tight tracking-tight">{{ emergency.patient_name || (isEn ? "Unidentified survivor" : "Penyintas tanpa nama") }}</h1>
            <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 marker:text-red-800">
                <li v-for="flag in reason" :key="flag">{{ flag }}</li>
            </ul>
        </header>

        <div class="incident-sheet grid gap-4 rounded-3xl bg-white p-4 sm:p-6">
            <section aria-labelledby="incident-delivery">
                <h2 id="incident-delivery" class="mb-2 text-sm font-medium text-slate-600">{{ isEn ? "Report delivery" : "Pengiriman laporan" }}</h2>
                <div class="rounded-2xl px-4 py-4" :class="delivery.accepted ? 'bg-teal-50 text-teal-950' : 'bg-amber-50 text-amber-950'">
                    <p role="status" class="text-lg font-semibold tracking-tight">{{ delivery.label }}</p>
                    <p class="mt-1 text-sm leading-relaxed">{{ delivery.detail }}</p>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-slate-700">{{ delivery.realtime }}</p>
                <div class="mt-4 grid gap-2 text-sm">
                    <p v-if="retryError" role="alert" class="font-semibold text-red-800">{{ retryError }}</p>
                    <button v-if="!delivery.accepted" type="button" class="incident-primary" @click="retry">{{ isEn ? "Retry synchronization" : "Coba sinkronkan kembali" }}</button>
                    <a v-else :href="`/relawan/emergencies/${emergency.id}`" class="incident-primary">{{ isEn ? "View T0 report details" : "Lihat detail laporan T0" }}</a>
                </div>
            </section>

            <dl class="grid gap-3 border-t border-slate-200 pt-4 text-sm">
                <div>
                    <dt class="flex items-center gap-2 text-slate-600"><Clock class="size-4" aria-hidden="true" />{{ isEn ? "Time" : "Waktu" }}</dt>
                    <dd class="mt-1 font-medium tabular-nums">{{ new Date(emergency.created_at).toLocaleString(isEn ? "en-US" : "id-ID") }}</dd>
                </div>
                <div>
                    <dt class="flex items-center gap-2 text-slate-600"><MapPin class="size-4" aria-hidden="true" />{{ isEn ? "Location" : "Lokasi" }}</dt>
                    <dd class="mt-1 break-words font-medium tabular-nums">{{ emergency.latitude != null && emergency.longitude != null ? `${emergency.latitude}, ${emergency.longitude}` : (isEn ? "GPS unavailable" : "GPS tidak tersedia") }}</dd>
                </div>
                <div v-if="emergency.notes">
                    <dt class="text-slate-600">{{ isEn ? "Notes" : "Catatan" }}</dt>
                    <dd class="mt-1 whitespace-pre-line break-words">{{ emergency.notes }}</dd>
                </div>
            </dl>

            <div class="grid gap-2 border-t border-slate-200 pt-3 text-sm">
                <a :href="smsHref" class="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-center font-semibold hover:bg-slate-50">
                    <MessageSquare class="size-4 shrink-0" aria-hidden="true" />{{ isEn ? "Open backup SMS app" : "Buka aplikasi SMS cadangan" }}
                </a>
                <p class="text-xs leading-relaxed text-slate-600">{{ smsGuidance }}</p>
                <button v-if="delivery.accepted" type="button" class="min-h-11 justify-self-start rounded text-sm font-medium text-teal-800 hover:underline" @click="$emit('close')">
                    {{ isEn ? "Back to previous page" : "Kembali ke halaman sebelumnya" }}
                </button>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Clock, MapPin, MessageSquare, Siren } from "lucide-vue-next";
import { liveQuery, type Subscription } from "dexie";
import { db, type LocalEmergency } from "@/offline/db";
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
const emit = defineEmits<{ (e: "close"): void }>();
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
        let active = true;
        emergency.value = null;
        const subscription: Subscription = liveQuery(async () => {
            await db.encryptedStaging.get(`emergencies:${owner}:${id}`);
            await db.localSyncReceipts.get(`${owner}:EMERGENCY:${id}`);
            return (await emergencyRepository.get(owner, id)) ?? null;
        }).subscribe(async (record) => {
            if (!active || props.owner !== owner || props.id !== id) return;
            if (record) { emergency.value = record; return; }
            if (!record) {
                const receipt = await db.localSyncReceipts.get(`${owner}:EMERGENCY:${id}`).catch(() => undefined);
                if (!active || props.owner !== owner || props.id !== id) return;
                const previous = emergency.value;
                emergency.value = receipt?.owner_user_id === owner && receipt.canonical_id === id &&
                    previous?.owner_user_id === owner && previous.id === id
                    ? { ...previous, sync_state: "SYNCED", last_error: undefined }
                    : null;
            }
        });
        onCleanup(() => { active = false; subscription.unsubscribe(); });
    },
    { immediate: true },
);

const delivery = computed(() =>
    emergencyDeliveryStatus(emergency.value ?? { sync_state: "LOCAL_SAVED" }, locale.value),
);
const smsHref = computed(() => getEmergencySmsHref(locale.value));
const smsGuidance = computed(() => getEmergencySmsGuidance(locale.value));

const reason = computed(() => {
    const codes = emergency.value?.red_flag_types ?? [emergency.value?.red_flag_type ?? ""];
    return codes.map(labelForFlag);
});

function labelForFlag(code: string) {
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
}

async function retry() {
    retryErrorFailed.value = false;
    try {
        await retryEmergency(props.owner, props.id);
    } catch {
        retryErrorFailed.value = true;
    }
}
</script>

<style scoped>
.incident-primary {
    display: grid;
    min-height: 2.75rem;
    place-items: center;
    padding: .625rem 1rem;
    border-radius: 2rem;
    background: #0f766e;
    color: white;
    text-align: center;
    font-weight: 600;
}
.incident-sheet {
    box-shadow: 0 0 0 4px rgb(203 213 225 / .3), 0 10px 36px rgb(51 65 85 / .06);
}
.incident :is(a, button):focus-visible {
    outline: 2px solid #0f766e;
    outline-offset: 3px;
}
@media (prefers-reduced-motion: no-preference) {
    .incident-primary { transition: transform 160ms cubic-bezier(.2,.8,.2,1); }
    .incident-primary:active { transform: scale(.985); }
}
.incident-primary:hover { background: #115e59; }
</style>
