<template>
    <fieldset :disabled="disabled" class="mt-4">
        <legend class="sr-only">{{ legendText }}</legend>
        <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
                v-for="option in options"
                :key="String(option.value)"
                type="button"
                data-srq-option
                :aria-pressed="answer === option.value"
                @click="$emit('select', option.value)"
                class="min-h-[48px] sm:min-h-[52px] rounded-xl border-2 px-3 py-2.5 text-sm sm:text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 cursor-pointer transition"
                :class="[
                    answer === option.value
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
                ]"
            >
                {{ option.label }}
            </button>
        </div>
        <div class="mt-2.5 flex items-center justify-between gap-2">
            <p class="text-xs sm:text-sm font-medium text-slate-700" aria-live="polite">
                {{ statusText }}
            </p>
            <button
                v-if="hasSelectedAnswer"
                type="button"
                data-srq-clear
                :aria-label="clearAriaLabel"
                @click="$emit('select', 'UNANSWERED')"
                class="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 underline underline-offset-4 hover:bg-slate-100 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 cursor-pointer"
            >
                {{ clearLabel }}
            </button>
        </div>
    </fieldset>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { srqAnswerLabel, type SrqAnswer } from "@/domain/srq/srqAnswer";
import { useI18n } from "@/i18n";

const { locale } = useI18n();

const props = defineProps<{ number: number; answer?: SrqAnswer; disabled?: boolean }>();
defineEmits<{ select: [answer: SrqAnswer] }>();

const isEn = computed(() => locale.value === "en");

const options = computed<{ value: boolean; label: string }[]>(() => [
    { value: true, label: isEn.value ? "Yes" : "Ya" },
    { value: false, label: isEn.value ? "No" : "Tidak" },
]);

const statusText = computed(() => {
    if (isEn.value) {
        return props.answer === true
            ? "Yes"
            : props.answer === false
              ? "No"
              : props.answer === "UNCLEAR"
                ? "Unclear Response"
                : props.answer === "UNANSWERED"
                  ? "Unanswered"
                  : "Not recorded";
    }
    return srqAnswerLabel(props.answer);
});

const clearLabel = computed(() => (isEn.value ? "Clear answer" : "Kosongkan jawaban"));
const clearAriaLabel = computed(() =>
    isEn.value
        ? `Clear answer for question ${props.number}`
        : `Kosongkan jawaban pertanyaan ${props.number}`,
);
const legendText = computed(() =>
    isEn.value
        ? `Answer for question ${props.number}`
        : `Jawaban pertanyaan ${props.number}`,
);

const hasSelectedAnswer = computed(
    () =>
        props.answer === true ||
        props.answer === false ||
        props.answer === "UNCLEAR",
);
</script>
