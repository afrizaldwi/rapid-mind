<template>
    <RelawanLayout>
        <div class="space-y-6 pb-20">
            <div
                v-if="broadcastWarning"
                role="alert"
                class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950"
            >
                {{ broadcastWarning }}
            </div>

            <!-- Incident Header Banner -->
            <div
                class="bg-red-800 text-white rounded-xl p-6 shadow-xl border border-red-700 space-y-4"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <Siren class="h-6 w-6" aria-hidden="true" />
                        <span
                            class="text-xs font-bold uppercase tracking-wider bg-red-900/80 px-2.5 py-1 rounded-md"
                        >
                            Laporan Darurat Lapangan
                        </span>
                    </div>
                    <Badge variant="t0">T0-Suspect</Badge>
                </div>

                <div>
                    <h2 class="text-2xl font-bold tracking-tight">
                        {{ emergency.patient?.name || "Penyintas Tanpa Nama" }}
                    </h2>
                    <p class="text-xs text-red-200 mt-1">
                        Indikator:
                        <strong class="text-white">{{
                            formatRedFlag(emergency.red_flag_type)
                        }}</strong>
                    </p>
                </div>
            </div>

            <!-- Relawan report and submission state only. -->
            <div
                class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4"
            >
                <h3
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                    Status Laporan
                </h3>

                <div
                    class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                    <span class="text-slate-600 font-semibold"
                        >Status laporan:</span
                    >
                    <span class="font-semibold text-rose-700 text-xs">
                        T0-Suspect
                    </span>
                </div>

                <div
                    class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                    <span class="text-slate-600 font-semibold">Transmisi:</span>
                    <span class="font-semibold text-teal-800 text-xs">
                        {{
                            localEmergency
                                ? transmissionLabel
                                : "Data berhasil dikirim ke tim kesehatan."
                        }}
                    </span>
                </div>
            </div>

            <!-- Safety Protocol Guidelines -->
            <div
                class="bg-amber-50 border border-amber-300 rounded-xl p-5 text-xs text-amber-950 space-y-2"
            >
                <div
                    class="flex items-center space-x-2 font-bold text-amber-900 text-sm"
                >
                    <ShieldAlert class="h-4 w-4" aria-hidden="true" />
                    <h4>Protokol Keselamatan Relawan</h4>
                </div>
                <ul class="space-y-1.5 list-disc list-inside text-amber-900">
                    <li>
                        <strong>Jangan tinggalkan penyintas sendirian.</strong>
                        Minta relawan lain membantu menjaga.
                    </li>
                    <li>
                        Jauhkan benda berbahaya atau tajam dari jangkauan
                        penyintas.
                    </li>
                    <li>
                        Gunakan nada suara tenang, jangan membantah atau
                        mendebat keyakinan delusi penyintas.
                    </li>
                </ul>
            </div>

            <!-- Incident Location & Details -->
            <div
                class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2.5"
            >
                <h3
                    class="font-bold text-slate-500 uppercase tracking-wider text-[11px]"
                >
                    Detail Lokasi & Kejadian
                </h3>
                <p class="text-slate-800">
                    <strong>Posko:</strong>
                    {{ emergency.shelter?.name || "Tidak tercatat" }}
                </p>
                <p class="text-slate-800">
                    <strong>Waktu Kejadian:</strong>
                    {{ new Date(emergency.created_at).toLocaleString("id-ID") }}
                </p>
                <p
                    v-if="emergency.notes"
                    class="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2"
                >
                    "{{ emergency.notes }}"
                </p>
            </div>

            <!-- Native SMS Fallback Handoff Button -->
            <div class="space-y-2">
                <a
                    :href="smsHref"
                    class="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                    <Smartphone class="h-4 w-4" aria-hidden="true" />
                    <span>Buka SMS Cadangan (Jika Sinyal Data Terputus)</span>
                </a>
                <p class="text-[11px] text-slate-500 text-center">
                    Periksa dan kirim pesan sendiri di aplikasi SMS.
                </p>
            </div>
        </div>
    </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ShieldAlert, Siren, Smartphone } from "lucide-vue-next";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import type { LocalEmergency } from "@/offline/db";

const props = defineProps<{
    emergency?: any;
    localEmergency?: LocalEmergency;
}>();
const runtime = useRelawanRuntime();
const localEmergency = computed(() => props.localEmergency);
const emergency = computed(() =>
    props.localEmergency
        ? {
              ...props.localEmergency,
              patient: { name: props.localEmergency.patient_name },
              shelter: {
                  name:
                      props.localEmergency.shelter_id === runtime.shelterId
                          ? runtime.shelterName
                          : null,
              },
          }
        : props.emergency,
);
const broadcastWarning = computed(
    () => (runtime.pageProps.flash as { error?: string } | undefined)?.error,
);
const transmissionLabel = computed(
    () =>
        ({
            LOCAL_SAVED: "Tersimpan di perangkat",
            PENDING_SYNC: "Menunggu sinkronisasi",
            SYNCING: "Menunggu sinkronisasi",
            SYNC_FAILED: "Sinkronisasi belum berhasil",
            SYNCED: "Data berhasil dikirim ke tim kesehatan.",
        })[props.localEmergency?.sync_state ?? "LOCAL_SAVED"],
);

function formatRedFlag(rf?: string) {
    switch (rf) {
        case "SUICIDAL_IDEATION":
            return "Ideasi / Perilaku Bunuh Diri (SRQ Q17)";
        case "PSYCHOSIS":
            return "Gejala Psikosis Akut / Disosiasi Berat";
        case "SEVERE_AGITATION":
            return "Agitasi Parah / Perilaku Amuk";
        default:
            return "Kegawatdaruratan Medis & Somatik";
    }
}

const smsHref = computed(() => {
    const patient = emergency.value.patient?.name || "Tanpa Nama";
    const posko = emergency.value.shelter?.name || "Tidak tercatat";
    const text = encodeURIComponent(
        `[SOS RAPID-MIND T0] ${emergency.value.red_flag_type}. Pasien: ${patient}. Posko: ${posko}. Butuh evakuasi segera PSC 119.`,
    );
    return `sms:119?body=${text}`;
});
</script>
