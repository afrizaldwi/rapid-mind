<template>
    <fieldset
        :disabled="disabled"
        class="space-y-3 rounded-xl border border-slate-300 bg-white p-4"
    >
        <legend class="px-1 text-base font-bold text-slate-900">
            Observasi komunikasi non-verbal
        </legend>
        <p class="text-base text-slate-700">
            Catat yang diamati, tanpa menyimpulkan diagnosis. Gunakan isyarat
            atau ketukan layar tanpa memaksa berbicara. Observasi tidak mengisi
            jawaban SRQ secara otomatis.
        </p>
        <label
            v-for="code in nonVerbalReasonCodes"
            :key="code"
            class="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 p-3 text-base"
        >
            <input
                type="checkbox"
                :checked="
                    modelValue.non_verbal_reasons?.includes(code) ?? false
                "
                @change="$emit('toggle', code)"
                class="h-5 w-5 accent-teal-700"
            />
            {{ observationLabels[code] }}
        </label>
        <label
            v-if="modelValue.non_verbal_reasons?.includes('OTHER')"
            class="block text-base font-semibold"
        >
            Catatan lainnya (opsional, maksimal 500 karakter)
            <textarea
                :value="modelValue.non_verbal_other_note ?? ''"
                maxlength="500"
                rows="3"
                @input="updateNote"
                class="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
            />
        </label>
        <button
            type="button"
            @click="$emit('clear')"
            class="min-h-14 rounded-lg border border-slate-300 px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-teal-700"
        >
            Kosongkan Observasi
        </button>
    </fieldset>
</template>
<script setup lang="ts">
import {
    nonVerbalReasonCodes,
    type NonVerbalObservations,
    type NonVerbalReason,
} from "@/domain/assessment/nonVerbalObservations";
import { observationLabels } from "@/domain/assessment/observationPresentation";
defineProps<{ modelValue: NonVerbalObservations; disabled?: boolean }>();
// Emit intent; the parent merges against its latest state, including same-tick edits.
const emit = defineEmits<{
    toggle: [reason: NonVerbalReason];
    note: [value: string | null];
    clear: [];
}>();
function updateNote(event: Event) {
    emit("note", (event.target as HTMLTextAreaElement).value || null);
}
</script>
