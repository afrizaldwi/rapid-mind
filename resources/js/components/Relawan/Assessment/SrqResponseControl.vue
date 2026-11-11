<template>
    <fieldset :disabled="disabled" class="mt-4">
        <legend class="sr-only">Jawaban pertanyaan {{ number }}</legend>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
                v-for="option in options"
                :key="String(option.value)"
                type="button"
                data-srq-option
                :aria-pressed="answer === option.value"
                @click="$emit('select', option.value)"
                class="min-h-14 rounded-xl border-2 p-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                :class="[
                    option.value === 'UNCLEAR' ? 'col-span-2 sm:col-span-1' : '',
                    answer === option.value
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800',
                ]"
            >
                {{ option.label }}
            </button>
        </div>
        <div class="mt-2 flex items-center justify-between gap-2">
            <p class="text-sm text-slate-700" aria-live="polite">
                {{ srqAnswerLabel(answer) }}
            </p>
            <button
                v-if="hasSelectedAnswer"
                type="button"
                data-srq-clear
                :aria-label="`Kosongkan jawaban pertanyaan ${number}`"
                @click="$emit('select', 'UNANSWERED')"
                class="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-600 underline hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
            >
                Kosongkan jawaban
            </button>
        </div>
    </fieldset>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { srqAnswerLabel, type SrqAnswer } from "@/domain/srq/srqAnswer";
const props = defineProps<{ number: number; answer?: SrqAnswer; disabled?: boolean }>();
defineEmits<{ select: [answer: SrqAnswer] }>();
const options: { value: Exclude<SrqAnswer, "UNANSWERED">; label: string }[] = [
    { value: true, label: "Ya" },
    { value: false, label: "Tidak" },
    { value: "UNCLEAR", label: "Respons Tidak Jelas" },
];
const hasSelectedAnswer = computed(
    () =>
        props.answer === true ||
        props.answer === false ||
        props.answer === "UNCLEAR",
);
</script>
