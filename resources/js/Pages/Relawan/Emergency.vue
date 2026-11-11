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
                            {{ $t('relawan.emergencyPage.title') }}
                        </span>
                    </div>
                    <Badge variant="t0">T0-Suspect</Badge>
                </div>

                <div>
                    <h2 class="text-2xl font-bold tracking-tight">
                        {{ emergency.patient?.name || $t('relawan.emergencyPage.unidentified') }}
                    </h2>
                    <p class="text-xs text-red-200 mt-1">
                        {{ $t('relawan.emergencyPage.indicator') }}
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
                    {{ $t('relawan.emergencyPage.reportStatusHeader') }}
                </h3>

                <div
                    class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                    <span class="text-slate-600 font-semibold"
                        >{{ $t('relawan.emergencyPage.reportStatusLabel') }}</span
                    >
                    <span class="font-semibold text-rose-700 text-xs">
                        T0-Suspect
                    </span>
                </div>

                <div
                    class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                    <span class="text-slate-600 font-semibold">{{ $t('relawan.emergencyPage.transmissionLabel') }}</span>
                    <span class="font-semibold text-teal-800 text-xs">
                        {{ delivery.label }}
                    </span>
                </div>
                <p class="text-sm text-slate-700">{{ delivery.detail }}</p>
                <p class="text-sm text-slate-700">{{ delivery.realtime }}</p>
            </div>

            <!-- Safety Protocol Guidelines -->
            <div
                class="bg-amber-50 border border-amber-300 rounded-xl p-5 text-xs text-amber-950 space-y-2"
            >
                <div
                    class="flex items-center space-x-2 font-bold text-amber-900 text-sm"
                >
                    <ShieldAlert class="h-4 w-4" aria-hidden="true" />
                    <h4>{{ $t('relawan.emergencyPage.safetyTitle') }}</h4>
                </div>
                <ul class="space-y-1.5 list-disc list-inside text-amber-900">
                    <li>{{ $t('relawan.emergencyPage.safety1') }}</li>
                    <li>{{ $t('relawan.emergencyPage.safety2') }}</li>
                    <li>{{ $t('relawan.emergencyPage.safety3') }}</li>
                </ul>
            </div>

            <!-- Incident Location & Details -->
            <div
                class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2.5"
            >
                <h3
                    class="font-bold text-slate-500 uppercase tracking-wider text-[11px]"
                >
                    {{ $t('relawan.emergencyPage.locationTitle') }}
                </h3>
                <p class="text-slate-800">
                    <strong>{{ $t('relawan.emergencyPage.shelterLabel') }}</strong>
                    {{ emergency.shelter?.name || $t('relawan.emergencyPage.notRecorded') }}
                </p>
                <p class="text-slate-800">
                    <strong>{{ $t('relawan.emergencyPage.incidentTimeLabel') }}</strong>
                    {{ formatTimestamp(emergency.created_at) }}
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
                    <span>{{ $t('relawan.emergencyPage.openSms') }}</span>
                </a>
                <p class="text-[11px] text-slate-500 text-center">
                    {{ smsGuidance }}
                </p>
            </div>
        </div>
    </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ShieldAlert, Siren, Smartphone } from "lucide-vue-next";
import Badge from "@/components/ui/Badge.vue";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import type { LocalEmergency } from "@/offline/db";
import {
    emergencyDeliveryStatus,
    getEmergencySmsHref,
    getEmergencySmsGuidance,
} from "@/lib/emergencyDelivery";
import { t as $t, useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const { locale } = useI18n();

const props = defineProps<{
    emergency?: any;
    localEmergency?: LocalEmergency;
}>();
const runtime = useRelawanRuntime();
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
const broadcastWarning = computed(() =>
    localizeMessage(
        (runtime.pageProps.flash as { error?: string } | undefined)?.error,
        locale.value,
    ),
);
const delivery = computed(() =>
    emergencyDeliveryStatus(
        props.localEmergency ??
            { sync_state: "SYNCED", routing_status: props.emergency?.routing_status,
                realtime_status: broadcastWarning.value ? "UNAVAILABLE" : "UNCONFIRMED" },
        locale.value,
    ),
);
const smsHref = computed(() => getEmergencySmsHref(locale.value));
const smsGuidance = computed(() => getEmergencySmsGuidance(locale.value));

function formatTimestamp(value?: string) {
    if (!value) return $t('relawan.emergencyPage.notRecorded');
    const date = new Date(value);
    const dateLocale = locale.value === 'en' ? 'en-US' : 'id-ID';
    return Number.isNaN(date.getTime())
        ? $t('relawan.emergencyPage.notRecorded')
        : date.toLocaleString(dateLocale);
}

function formatRedFlag(rf?: string) {
    switch (rf) {
        case "SUICIDAL_IDEATION":
            return $t('relawan.emergencyPage.suicide');
        case "PSYCHOSIS":
            return $t('relawan.emergencyPage.psychosis');
        case "SEVERE_AGITATION":
            return $t('relawan.emergencyPage.agitation');
        default:
            return $t('relawan.emergencyPage.medical');
    }
}
</script>
