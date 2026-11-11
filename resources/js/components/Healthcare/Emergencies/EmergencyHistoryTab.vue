<template>
    <div
        class="space-y-4"
    >
        <div
            class="pb-2.5 border-b border-slate-100 flex items-center justify-between"
        >
            <h3
                class="text-xs font-bold text-slate-900 uppercase tracking-wider"
            >
                {{ $t('healthcare.historyTab.operationalTrail', 'Rekam Jejak Operasional Kasus') }}
            </h3>
            <span
                class="text-[11px] font-mono text-slate-400"
            >
                ID: {{ item.rmCode }}
            </span>
        </div>

        <div class="pt-2">
            <div
                class="relative pl-6 space-y-4 text-xs before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200"
            >
                <!-- Step 1: Shelter report -->
                <div class="relative space-y-0.5">
                    <span
                        class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"
                    ></span>
                    <span
                        class="text-[10px] font-bold text-teal-800 block"
                        >{{ $t('healthcare.historyTab.emergencyReport', 'Laporan Kedaruratan Lapangan') }}</span
                    >
                    <p class="font-bold text-slate-800">
                        {{ item.shelterName }}
                    </p>
                    <p
                        class="text-[11px] text-slate-500"
                    >
                        {{ $t('healthcare.historyTab.reportedBy', { name: item.volunteerName }, `Dilaporkan oleh ${item.volunteerName}`) }}
                        •
                        {{
                            formatDateTime(
                                item.createdAt,
                                locale,
                            )
                        }}
                    </p>
                </div>

                <!-- Step 2: Assessment if present -->
                <div
                    v-if="item.hasAssessment"
                    class="relative space-y-0.5"
                >
                    <span
                        class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-900 ring-4 ring-white"
                    ></span>
                    <span
                        class="text-[10px] font-bold text-slate-500 block"
                        >{{ $t('healthcare.historyTab.initialScreening', 'Skrining Awal') }}</span
                    >
                    <p class="font-bold text-slate-800">
                        {{ $t('healthcare.historyTab.psychologicalInstrument', 'Instrumen Psikologis') }}
                        {{ item.rmCode }}
                    </p>
                    <p
                        class="text-[11px] text-slate-500"
                    >
                        {{
                            item.srqScore !==
                            null
                                ? `${$t('healthcare.assessmentTab.srqScore', 'Skor SRQ-20:')} ${item.srqScore}/20`
                                : $t('healthcare.assessmentTab.notAvailable', 'Skor tidak tersedia')
                        }}
                    </p>
                </div>

                <!-- Step 3: Verifications -->
                <div
                    v-for="(
                        v, idx
                    ) in item.verifications"
                    :key="`ver-${idx}`"
                    class="relative space-y-0.5"
                >
                    <span
                        class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white"
                    ></span>
                    <span
                        class="text-[10px] font-bold text-amber-800 block"
                        >{{ $t('healthcare.historyTab.secondaryVerification', 'Verifikasi Sekunder Nakes') }}</span
                    >
                    <p class="font-bold text-slate-800">
                        {{ $t('healthcare.historyTab.method', 'Metode') }}: {{ verificationMethodLabel(v.method) }} • {{ $t('healthcare.historyTab.result', 'Hasil') }}:
                        {{
                            v.clinical_result ||
                            $t('healthcare.historyTab.inReview', 'Dalam Peninjauan')
                        }}
                    </p>
                    <p
                        v-if="v.notes"
                        class="text-[11px] text-slate-500 italic"
                    >
                        "{{ v.notes }}"
                    </p>
                </div>

                <!-- Step 4: Referrals -->
                <div
                    v-for="(
                        r, idx
                    ) in item.referrals"
                    :key="`ref-${idx}`"
                    class="relative space-y-0.5"
                >
                    <span
                        class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"
                    ></span>
                    <span
                        class="text-[10px] font-bold text-teal-800 block"
                        >{{ $t('healthcare.actions.referralTitle', 'Rujukan Medis') }}</span
                    >
                    <p class="font-bold text-slate-800">
                        {{ $t('common.destination', 'Tujuan') }}:
                        {{
                            r.facility?.name ||
                            $t('healthcare.referrals.targetFacility', 'Fasilitas Rujukan')
                        }}
                    </p>
                    <p
                        class="text-[11px] text-slate-500"
                    >
                        {{ $t('common.status', 'Status') }}:
                        {{
                            formatReferralStatus(
                                r.status,
                                locale,
                            )
                        }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { t as $t, useI18n } from "@/i18n";
import { formatDateTime, type HealthcareEmergencyQueueItem } from "@/lib/healthcareEmergency";
import { formatReferralStatus } from "@/lib/referralStatus";

defineProps<{ item: HealthcareEmergencyQueueItem }>();
const { locale } = useI18n();

function verificationMethodLabel(method?: string): string {
    if (method === "PHONE") return $t("healthcare.verificationMethods.PHONE", "Telepon");
    if (method === "VIDEO") return $t("healthcare.verificationMethods.VIDEO", "Video Call");
    if (method === "FIELD_TEAM") return $t("healthcare.verificationMethods.FIELD_TEAM", "Tim Lapangan");
    return method || "-";
}
</script>
