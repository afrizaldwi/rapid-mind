<template>
    <fieldset :disabled="disabled" class="mt-4">
        <legend class="sr-only">Jawaban pertanyaan {{ number }}</legend>
        <div class="grid grid-cols-2 gap-3">
            <button
                v-for="option in options"
                :key="String(option.value)"
                type="button"
                :aria-pressed="answer === option.value"
                @click="$emit('select', option.value)"
                class="min-h-14 rounded-xl border-2 p-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                :class="
                    answer === option.value
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800'
                "
            >
                {{ option.label }}
            </button>
        </div>
        <p class="mt-2 text-sm text-slate-700" aria-live="polite">
            {{ srqAnswerLabel(answer) }}
        </p>
    </fieldset>
</template>
<script setup lang="ts">
import { srqAnswerLabel, type SrqAnswer } from "@/domain/srq/srqAnswer";
defineProps<{ number: number; answer?: SrqAnswer; disabled?: boolean }>();
defineEmits<{ select: [answer: SrqAnswer] }>();
const options: { value: SrqAnswer; label: string }[] = [
    { value: true, label: "Ya" },
    { value: false, label: "Tidak" },
    { value: "UNCLEAR", label: "Respons Tidak Jelas" },
    { value: "UNANSWERED", label: "Kosongkan Jawaban" },
];
</script>
