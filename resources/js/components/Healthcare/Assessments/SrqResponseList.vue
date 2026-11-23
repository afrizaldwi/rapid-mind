<template>
    <ul
        class="grid grid-cols-1 gap-2 text-sm"
        :class="columns ? 'sm:grid-cols-2' : ''"
        :aria-label="$t('healthcare.assessmentTab.srqDetailsAria', 'Rincian jawaban SRQ-20')"
    >
        <li
            v-for="row in responses"
            :key="row.number"
            class="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-3"
            :class="
                row.answer === true
                    ? 'bg-teal-50 text-slate-900'
                    : 'bg-white text-slate-700'
            "
        >
            <span class="min-w-0 flex-1"
                >{{ row.number }}.
                {{
                    $t(
                        `assessment.srq.questions.${row.number}.question`,
                        srqQuestions[row.number - 1].text,
                    )
                }}</span
            >
            <span class="font-semibold">{{ responseLabel(row) }}</span>
        </li>
    </ul>
</template>
<script setup lang="ts">
import { t as $t, useI18n } from "@/i18n";
import { srqAnswerLabel } from "@/domain/srq/srqAnswer";
import { srqQuestions } from "@/lib/healthcareEmergency";
import type { HealthcareAssessmentPresentation } from "@/lib/healthcareAssessmentPresentation";

defineProps<{
    responses: HealthcareAssessmentPresentation["responses"];
    columns?: boolean;
}>();

const { locale } = useI18n();

function responseLabel(
    row: HealthcareAssessmentPresentation["responses"][number],
): string {
    if (row.invalid) {
        return $t(
            "healthcare.assessmentContext.invalidResponse",
            "Data jawaban tidak valid",
        );
    }
    return srqAnswerLabel(row.answer, locale.value);
}
</script>
