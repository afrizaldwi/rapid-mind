<template>
    <HealthcareLayout>
        <div class="space-y-4">
            <!-- 1. Page Title & Operational Context (Section 7) -->
            <div>
                <h1
                    class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight"
                >
                    Pusat Triase & Kedaruratan Medis
                </h1>
                <p class="text-xs text-slate-500 mt-1 font-normal">
                    Antrean insiden T0 untuk verifikasi dan respons medis.
                </p>
            </div>

            <!-- 2. Small Operational Summary (Compact Horizontal Strip, Sections 8 & 9) -->
            <EmergencySummaryStrip
                :total-survivors-count="totalSurvivorsCount"
                :critical-t0-count="criticalT0Count"
                :pending-validation-count="pendingValidationCount"
                :referrals-issued-count="referralsIssuedCount"
            />

            <!-- Action Feedback Banners -->
            <div
                v-if="flashMessage"
                class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between"
            >
                <div class="flex items-center space-x-2">
                    <span>✓</span>
                    <span>{{ flashMessage }}</span>
                </div>
            </div>

            <div
                v-if="actionErrors.length > 0"
                role="alert"
                class="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-medium text-rose-900 space-y-1"
            >
                <p class="font-bold">Perhatian pada tindakan medis:</p>
                <ul class="list-disc pl-4 space-y-0.5">
                    <li v-for="err in actionErrors" :key="err.key">
                        {{ err.message }}
                    </li>
                </ul>
            </div>

            <!-- 3. Main Workspace: Two-Panel Clinical Hierarchy (Queue Left, Selected Case Right) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <!-- LEFT PANEL: CASE QUEUE (~33% width / lg:col-span-4) -->
                <EmergencyQueuePanel
                    :items="filteredQueue"
                    :has-emergencies="totalSurvivorsCount > 0"
                    :selected-key="selectedItem?.key ?? null"
                    v-model:search-query="searchQuery"
                    v-model:selected-filter="selectedFilter"
                    @select="selectItem"
                />

                <!-- RIGHT PANEL: SELECTED CASE DETAIL WORKSPACE (~67% width / lg:col-span-8) -->
                <main
                    class="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden min-h-[620px]"
                >
                    <template v-if="selectedItem">
                        <!-- 1. PATIENT HEADER (Section 13, 14, 24: Name, Identifier, ONE Primary CTA) -->
                        <EmergencyCaseHeader
                            :item="selectedItem"
                            :is-submitting="isSubmitting"
                            @acknowledge="acknowledgeCase"
                            @open-actions="activeTab = 'actions'"
                        />

                        <!-- 3. NAVIGATION TABS (Section 17: Text + thin bottom indicator, NO pills) -->
                        <nav
                            class="flex items-center gap-6 overflow-x-auto border-b border-slate-100 px-5 text-xs"
                        >
                            <button
                                type="button"
                                @click="activeTab = 'overview'"
                                :class="
                                    activeTab === 'overview'
                                        ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                                        : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'
                                "
                                class="shrink-0 whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
                            >
                                Ringkasan
                            </button>
                            <button
                                type="button"
                                @click="activeTab = 'assessment'"
                                :class="
                                    activeTab === 'assessment'
                                        ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                                        : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'
                                "
                                class="shrink-0 whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
                            >
                                Asesmen
                            </button>
                            <button
                                type="button"
                                @click="activeTab = 'actions'"
                                :class="
                                    activeTab === 'actions'
                                        ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                                        : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'
                                "
                                class="shrink-0 whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
                            >
                                Tindakan
                            </button>
                            <button
                                type="button"
                                @click="activeTab = 'history'"
                                :class="
                                    activeTab === 'history'
                                        ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                                        : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'
                                "
                                class="shrink-0 whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
                            >
                                Riwayat
                            </button>
                        </nav>

                        <!-- Action Feedback Notification Banner -->
                        <div
                            v-if="actionFeedback"
                            role="status"
                            class="mx-5 mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between"
                            :class="
                                actionFeedback.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                            "
                        >
                            <div class="flex items-center space-x-2">
                                <span>{{
                                    actionFeedback.type === "success"
                                        ? "✓"
                                        : "⚠"
                                }}</span>
                                <span>{{ actionFeedback.message }}</span>
                            </div>
                            <button
                                type="button"
                                @click="actionFeedback = null"
                                class="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <!-- Dynamic Tab Content (Continuous Workspace, Section 3) -->
                        <div class="p-5 flex-1 overflow-y-auto space-y-5">
                            <!-- TAB 1: RINGKASAN (Overview: Status -> Red Flag -> Clinical Summary -> Workflow) -->
                            <EmergencyOverviewTab
                                v-if="activeTab === 'overview'"
                                :item="selectedItem"
                                :detected-red-flags="detectedRedFlags"
                            />

                            <!-- TAB 2: ASESMEN LENGKAP -->
                            <EmergencyAssessmentTab
                                v-if="activeTab === 'assessment'"
                                :item="selectedItem"
                            />

                            <!-- TAB 3: TINDAKAN & RUJUKAN -->
                            <EmergencyActionsTab
                                v-if="activeTab === 'actions'"
                                :item="selectedItem"
                                :facilities="facilities"
                                :is-submitting="isSubmitting"
                                :verification-form="verificationForm"
                                :decision-form="decisionForm"
                                :referral-form="referralForm"
                                @update:verification-form="verificationForm = { ...verificationForm, ...$event }"
                                @update:decision-form="decisionForm = { ...decisionForm, ...$event }"
                                @update:referral-form="referralForm = { ...referralForm, ...$event }"
                                @submit:verify="submitVerification(selectedItem)"
                                @submit:classify="submitClassification(selectedItem)"
                                @submit:referral="submitReferral(selectedItem)"
                            />

                            <template v-if="activeTab === 'actions' && selectedItem.status === 'CONFIRMED'">
                                <p v-if="!selectedItem.raw.operations?.available && selectedItem.hasReferral" class="text-xs text-slate-600">Rujukan tercatat ke {{ selectedItem.referrals[0]?.facility?.name || 'Faskes' }}. Lihat daftar Rujukan untuk alur kompatibilitas.</p>
                                <ClinicalReferralCard v-for="referral in selectedItem.raw.operations?.referrals || []" :key="referral.id" :referral="referral" :available="!!selectedItem.raw.operations?.available" />
                                <DispatchPanel :key="selectedItem.emergencyId!" :emergency-id="selectedItem.emergencyId!" :operations="selectedItem.raw.operations" :units="responseUnits || []" />
                            </template>

                            <!-- TAB 4: RIWAYAT -->
                            <EmergencyHistoryTab
                                v-if="activeTab === 'history'"
                                :item="selectedItem"
                            />
                            <OperationsTimeline v-if="activeTab === 'history'" :operations="selectedItem.raw.operations" />
                        </div>
                    </template>

                    <!-- Empty Case Selection State -->
                    <div
                        v-else
                        class="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3"
                    >
                        <svg
                            class="w-10 h-10 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 class="text-sm font-bold text-slate-700">
                            Pilih Insiden dari Antrean
                        </h3>
                        <p class="text-xs text-slate-400 max-w-xs">
                            Pilih salah satu kasus di panel antrean untuk
                            memeriksa identitas, bukti asesmen, dan tindakan
                            klinis.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import ClinicalReferralCard from "@/components/Healthcare/Operations/ClinicalReferralCard.vue";
import DispatchPanel from "@/components/Healthcare/Operations/DispatchPanel.vue";
import OperationsTimeline from "@/components/Healthcare/Operations/OperationsTimeline.vue";
import type { ResponseUnit } from "@/lib/healthcareOperations";
import { computed, ref, watch } from "vue";
import { usePage } from "@inertiajs/vue3";
import EmergencySummaryStrip from "@/components/Healthcare/Emergencies/EmergencySummaryStrip.vue";
import EmergencyQueuePanel from "@/components/Healthcare/Emergencies/EmergencyQueuePanel.vue";
import EmergencyCaseHeader from "@/components/Healthcare/Emergencies/EmergencyCaseHeader.vue";
import EmergencyOverviewTab from "@/components/Healthcare/Emergencies/EmergencyOverviewTab.vue";
import EmergencyAssessmentTab from "@/components/Healthcare/Emergencies/EmergencyAssessmentTab.vue";
import EmergencyHistoryTab from "@/components/Healthcare/Emergencies/EmergencyHistoryTab.vue";
import EmergencyActionsTab from "@/components/Healthcare/Emergencies/EmergencyActionsTab.vue";
import { useEmergencyQueue } from "@/composables/useEmergencyQueue";
import { useEmergencyActions } from "@/composables/useEmergencyActions";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import { getDetectedRedFlags } from "@/lib/healthcareEmergency";

const props = defineProps<{
    emergencies?: any[];
    facilities?: any[];
    responseUnits?: ResponseUnit[];
    facility?: any;
}>();

const page = usePage();
const flashMessage = computed(() =>
    String(
        (page.props.flash as { message?: string } | undefined)?.message ?? "",
    ),
);
const activeTab = ref<"overview" | "assessment" | "actions" | "history">(
    "overview",
);

const actionErrors = computed(() => {
    return Object.entries(page.props.errors ?? {}).map(([key, message]) => ({
        key,
        message: String(message),
    }));
});

const draftActions = ref({ verification: false, decision: false, referral: false });
const {
    isSubmitting,
    verificationForm,
    decisionForm,
    referralForm,
    actionFeedback,
    resetActions,
    acknowledgeCase,
    submitVerification,
    submitClassification,
    submitReferral,
} = useEmergencyActions(kind => draftActions.value[kind]);

const {
    searchQuery,
    selectedFilter,
    totalSurvivorsCount,
    criticalT0Count,
    pendingValidationCount,
    referralsIssuedCount,
    filteredQueue,
    selectedItem,
    selectItem,
} = useEmergencyQueue(
    () => props.emergencies,
    () => {
        activeTab.value = "overview";
        resetActions();
    },
);

watch(selectedItem, item => {
    draftActions.value = {
        verification: !!item && ['PENDING', 'ACKNOWLEDGED'].includes(item.status),
        decision: item?.status === 'REVIEWING',
        referral: item?.status === 'CONFIRMED' && !item.hasReferral,
    };
}, { immediate: true, flush: 'sync' });

const detectedRedFlags = computed(() => getDetectedRedFlags(selectedItem.value));
</script>
