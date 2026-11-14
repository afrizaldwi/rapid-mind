<template>
    <RelawanLayout :identity-shelter="shelter?.name || userShelterName">
        <template #greeting="{ statusKind, statusLabel, openStatus }">
            <section class="home-identity">
                <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <h2 class="text-2xl font-bold text-slate-900">{{ isEn ? 'Hello,' : 'Halo,' }} {{ userName }}</h2>
                    <StatusIndicator :kind="statusKind" :label="statusLabel" @open="openStatus" />
                </div>
                <p class="mt-1 text-sm font-medium text-slate-600">{{ $t('relawan.roleBadge') }}</p>
            </section>
        </template>
        <div class="space-y-6">
            <p
                v-if="runtime.mode === 'OFFLINE_FIELD_MODE'"
                class="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900"
            >
                {{ $t('relawan.offlineFieldMode') }}
            </p>
            <p
                v-if="local.error.value"
                role="alert"
                class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
                {{ local.error.value }}
            </p>
            <!-- Active Emergency Banner if any -->
            <div
                v-if="displayEmergency"
                class="bg-red-50 border-2 border-red-500 rounded-xl p-5 text-red-950 shadow-md space-y-3"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <Siren class="h-5 w-5" aria-hidden="true" />
                        <span
                            class="text-xs font-bold uppercase tracking-wider text-red-800"
                        >
                            {{ $t('relawan.activeEmergencyReport') }}
                        </span>
                    </div>
                    <span
                        class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700"
                        ><span
                            class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"
                        ></span
                        >T0-Suspect</span
                    >
                </div>
                <div>
                    <h3 class="font-bold text-base">
                        {{
                            displayEmergency?.patient?.name ||
                            $t('common.unidentified')
                        }}
                    </h3>
                    <p class="text-xs text-red-800 mt-1">
                        {{ displayEmergency?.notes || emergencyTransmission }}
                    </p>
                </div>
                <p class="text-xs font-semibold text-red-900">
                    {{ emergencyTransmission }}
                </p>
            </div>

            <!-- Resume Incomplete Draft Banner -->
            <div
                v-if="displayDraft"
                class="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-5 space-y-3"
            >
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-bold text-amber-800 uppercase tracking-wider"
                    >
                        {{ $t('relawan.activeDraftTitle') }}
                    </span>
                    <span class="text-xs text-amber-700 font-medium"
                        >{{ $t('relawan.continueLastStage') }}</span
                    >
                </div>
                <div>
                    <h3 class="font-bold text-slate-900 text-base">
                        {{ displayDraft?.name || $t('common.survivor') }}
                    </h3>
                    <p class="text-xs text-slate-600 mt-0.5">
                        {{
                            displayDraft?.local
                                ? (isEn ? "Next stage follows answers saved on this device." : "Tahap berikutnya mengikuti jawaban yang tersimpan di perangkat.")
                                : local.ready.value
                                  ? (isEn ? "Assessment is available on server; open while online to copy to this device." : "Asesmen ini tersedia di server; buka saat online untuk menyalinnya ke perangkat.")
                                  : (isEn ? "Assessment is available on server. Device status cannot be confirmed yet." : "Asesmen tersedia di server. Status di perangkat belum dapat dipastikan.")
                        }}
                    </p>
                </div>
                <RelawanLink
                    :href="displayDraft?.resumeUrl || '/relawan/assessment'"
                    class="inline-flex min-h-11 items-center justify-center w-full py-3 px-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                    {{ displayDraft?.resumeLabel }} →
                </RelawanLink>
            </div>

            <!-- Main Interaction Paths: PFA vs Structured Screening -->
            <div class="space-y-3">
                <h3
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                    {{ $t('relawan.menuTitle') }}
                </h3>

                <!-- PFA Guidebook Card (Hari 1-3) -->
                <RelawanLink
                    href="/relawan/pfa"
                    class="block bg-white hover:bg-teal-50/40 p-4 sm:p-5 rounded-lg border border-slate-200 transition-colors group"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <span
                                class="text-[11px] font-bold text-teal-800 uppercase tracking-wider block"
                            >
                                {{ isEn ? 'Acute Phase · Day 1–3' : 'Fase Akut · Hari 1–3' }}
                            </span>
                            <h4
                                class="text-lg font-bold text-slate-900 group-hover:text-teal-800 transition"
                            >
                                {{ $t('relawan.pfaGuideTitle') }}
                            </h4>
                            <p
                                class="text-xs text-slate-600 max-w-xs leading-relaxed"
                            >
                                {{ $t('relawan.pfaGuideDesc') }}
                            </p>
                        </div>
                        <BookOpen
                            class="h-6 w-6 shrink-0 text-teal-700"
                            aria-hidden="true"
                        />
                    </div>
                </RelawanLink>

                <!-- Structured SRQ-20 Screening Card (Hari 4-30) -->
                <RelawanLink
                    href="/relawan/assessment"
                    class="block bg-white hover:bg-teal-50/40 p-4 sm:p-5 rounded-lg border border-slate-200 transition-colors group"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <span
                                class="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block"
                            >
                                {{ isEn ? 'Follow-up Phase · Day 4–30' : 'Fase Lanjutan · Hari 4–30' }}
                            </span>
                            <h4
                                class="text-lg font-bold text-slate-900 group-hover:text-teal-800 transition"
                            >
                                {{ $t('relawan.newAssessmentTitle') }}
                            </h4>
                            <p
                                class="text-xs text-slate-600 max-w-xs leading-relaxed"
                            >
                                {{ $t('relawan.newAssessmentDesc') }}
                            </p>
                        </div>
                        <ClipboardList
                            class="h-6 w-6 shrink-0 text-teal-700"
                            aria-hidden="true"
                        />
                    </div>
                </RelawanLink>
            </div>

            <!-- Quick Guidance -->
            <div
                class="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5"
            >
                <p
                    class="font-bold text-slate-800 inline-flex items-center gap-1.5"
                >
                    <Info class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ $t('relawan.ethicsNoteTitle') }}</span>
                </p>
                <p>
                    {{ $t('relawan.ethicsNoteContent') }}
                </p>
            </div>
        </div>
    </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BookOpen, ClipboardList, Info, Siren } from "lucide-vue-next";
import StatusIndicator from "@/components/ui/StatusIndicator.vue";
import RelawanLink from "@/relawan/RelawanLink.vue";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import { useOwnedLocalRecords } from "@/composables/useRelawanDataWorkspace";
import { resumeStage } from "@/offline/assessmentWorkflow";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const { isEn, t } = useI18n();

const props = defineProps<{
    activeDraft?: {
        id: string;
        user_id?: number;
        patient?: { name?: string };
        resume_url?: string;
        resume_label?: string;
    } | null;
    recentAssessments?: unknown[];
    shelter?: { name?: string } | null;
}>();
const runtime = useRelawanRuntime();
const userName = computed(() => runtime.name);
const userShelterName = computed(() => runtime.shelterName);
const owner = computed(() => runtime.owner);
const local = useOwnedLocalRecords(owner);
const displayEmergency = computed(() => {
    const item = local.records.value.emergencies
        .filter((e) => e.sync_state !== "SYNCED")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return item ? { ...item, patient: { name: item.patient_name } } : null;
});
const emergencyTransmission = computed(() =>
    isEn.value
        ? ({
              LOCAL_SAVED: "Saved on device",
              PENDING_SYNC: "Awaiting synchronization",
              SYNCING: "Synchronizing",
              SYNC_FAILED: "Synchronization unsuccessful",
              SYNCED: "Accepted by server",
          })[displayEmergency.value?.sync_state ?? "LOCAL_SAVED"]
        : ({
              LOCAL_SAVED: "Tersimpan di perangkat",
              PENDING_SYNC: "Menunggu sinkronisasi",
              SYNCING: "Menyinkronkan",
              SYNC_FAILED: "Sinkronisasi belum berhasil",
              SYNCED: "Diterima server",
          })[displayEmergency.value?.sync_state ?? "LOCAL_SAVED"],
);
const stageLabels = computed<Record<string, string>>(() => ({
    srq: t("assessment.continueSrq"),
    risk: t("assessment.continueRisk"),
    function: t("assessment.continueFunction"),
    review: t("assessment.reviewStep"),
}));
const displayDraft = computed(() => {
    const drafts = local.records.value.assessments
        .filter((item) => item.status === "IN_PROGRESS")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const latest = drafts[0];
    if (latest) {
        const patient = local.records.value.patients.find(
            (item) => item.id === latest.patient_id,
        );
        const stage = resumeStage(latest);
        return {
            name: patient?.name || t('common.survivor'),
            local: true,
            resumeUrl: `/relawan/assessment/${latest.id}/${stage}`,
            resumeLabel: stageLabels.value[stage],
        };
    }
    const server =
        props.activeDraft?.user_id === owner.value ? props.activeDraft : null;
    return server
        ? {
              name: server.patient?.name || t('common.survivor'),
              local: false,
              resumeUrl:
                  server.resume_url || `/relawan/assessment/${server.id}/srq`,
              resumeLabel: server.resume_label
                  ? localizeMessage(server.resume_label, isEn.value ? 'en' : 'id')
                  : (isEn.value ? 'Continue' : 'Lanjutkan'),
          }
        : null;
});
</script>

<style scoped>
.home-identity { margin-inline: -.875rem; margin-bottom: 1rem; padding: 1.25rem .875rem; background: white; border-bottom: 1px solid #e2e8f0; }
.home-identity h2 { overflow-wrap: anywhere; min-width: 0; }
.home-identity :deep(.rm-status) { max-inline-size: 100%; }
.home-identity :deep(.truncate) { white-space: normal; overflow: visible; overflow-wrap: anywhere; }
@media (min-width: 640px) {
    .home-identity { margin-inline: -1.5rem; padding-inline: 1.5rem; }
}
</style>
