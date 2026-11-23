<template>
    <section
        class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
    >
        <h3 class="font-bold">
            {{ $t("healthcare.assessmentContext.title", "Konteks Asesmen Lapangan") }}
        </h3>
        <p class="font-semibold">
            {{ displayStatusLabel }} · {{ displayModeLabel }}
        </p>
        <p v-if="!context.hasAssessment">
            {{
                $t(
                    "healthcare.assessmentContext.followUpNotice",
                    "Konteks asesmen dapat menyusul setelah pengiriman darurat. Pengakuan dan penanganan darurat tetap tersedia.",
                )
            }}
        </p>
        <p v-else-if="!context.srqComplete">
            {{
                $t(
                    "healthcare.assessmentContext.incompleteCountNotice",
                    {
                        definitive: context.definitiveCount,
                        unresolved: context.unresolvedCount,
                    },
                    "{definitive}/20 jawaban definitif; {unresolved} jawaban perlu diklarifikasi atau belum tercatat. Skor SRQ definitif belum tersedia.",
                )
            }}
        </p>
        <p v-if="context.invalid" role="alert">
            {{
                $t(
                    "healthcare.assessmentContext.invalidSrqNotice",
                    "Data jawaban SRQ tidak valid. Muat ulang konteks asesmen sebelum menggunakan skor.",
                )
            }}
        </p>
        <p
            v-if="
                context.hasAssessment &&
                context.answersComplete &&
                !context.scoringEvidenceValid
            "
            role="alert"
        >
            {{
                $t(
                    "healthcare.assessmentContext.invalidEvidenceNotice",
                    "Bukti skor atau rekomendasi tersimpan belum tersedia, tidak valid, atau tidak konsisten. Tinjau bukti jawaban di bawah dan muat ulang konteks asesmen setelah data diperbaiki. Validasi berbasis skor belum tersedia; tindakan darurat tetap independen.",
                )
            }}
        </p>
        <h4 class="font-semibold">
            {{
                $t(
                    "healthcare.assessmentContext.nonVerbalTitle",
                    "Observasi Komunikasi Non-Verbal",
                )
            }}
        </h4>
        <p v-if="displayObservationError" role="alert">
            {{ displayObservationError }}
        </p>
        <template v-else>
            <ul
                v-if="context.observations.non_verbal_reasons?.length"
                class="list-disc space-y-1 pl-5"
            >
                <li
                    v-for="code in context.observations.non_verbal_reasons"
                    :key="code"
                >
                    {{ getObservationLabel(code, locale) }}
                </li>
            </ul>
            <p v-else>
                {{
                    $t(
                        "healthcare.assessmentContext.noObservations",
                        "Belum ada observasi komunikasi yang tercatat.",
                    )
                }}
            </p>
            <p
                v-if="context.observations.non_verbal_other_note != null"
                class="whitespace-pre-wrap break-words"
            >
                {{
                    $t(
                        "healthcare.assessmentContext.otherNotesPrefix",
                        "Catatan lainnya:",
                    )
                }}
                {{ context.observations.non_verbal_other_note }}
            </p>
        </template>
        <p class="text-slate-600">
            {{
                $t(
                    "healthcare.assessmentContext.disclaimer",
                    "Observasi lapangan bukan diagnosis klinis dan tidak menentukan skor atau pengiriman T0.",
                )
            }}
        </p>
    </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { t as $t, useI18n } from "@/i18n";
import { getObservationLabel } from "@/domain/assessment/observationPresentation";
import type { HealthcareAssessmentPresentation } from "@/lib/healthcareAssessmentPresentation";

const props = defineProps<{ context: HealthcareAssessmentPresentation }>();
const { locale, isEn } = useI18n();

const displayStatusLabel = computed(() => {
    if (!isEn.value) return props.context.statusLabel;
    if (!props.context.hasAssessment) {
        return $t(
            "healthcare.assessmentContext.statusNotAvailable",
            "Assessment not yet available",
        );
    }
    if (props.context.answersComplete && !props.context.scoringEvidenceValid) {
        return $t(
            "healthcare.assessmentContext.statusEvidenceUnusable",
            "Answers complete; stored score evidence cannot be used yet",
        );
    }
    if (props.context.finalized) {
        return $t(
            "healthcare.assessmentContext.statusCompleted",
            "Assessment completed",
        );
    }
    return $t(
        "healthcare.assessmentContext.statusIncomplete",
        "Assessment incomplete / needs clarification",
    );
});

const displayModeLabel = computed(() => {
    if (!isEn.value) return props.context.modeLabel;
    if (props.context.modeLabel === "Mode tidak tercatat") {
        return $t(
            "healthcare.assessmentContext.modeUnrecorded",
            "Mode not recorded",
        );
    }
    return props.context.modeLabel;
});

const displayObservationError = computed(() => {
    if (!props.context.observationError) return "";
    if (!isEn.value) return props.context.observationError;
    return $t(
        "healthcare.assessmentContext.observationError",
        "Invalid observation data. Reload assessment context; emergency actions remain available.",
    );
});
</script>
