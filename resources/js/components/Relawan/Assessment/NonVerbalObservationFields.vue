<template>
    <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <fieldset :disabled="disabled" aria-describedby="observation-guidance" class="min-w-0">
        <legend class="w-full text-lg font-semibold leading-tight tracking-tight text-slate-900">
            {{ isEn ? "Non-verbal communication observations" : "Observasi komunikasi non-verbal" }}
        </legend>
        <p id="observation-guidance" class="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">
            {{
                isEn
                    ? "Record only what you observe. Avoid drawing a diagnosis. Use gestures or screen taps without asking the person to speak. SRQ answers are entered separately."
                    : "Catat yang terlihat tanpa menyimpulkan diagnosis. Gunakan isyarat atau ketukan layar tanpa memaksa penyintas berbicara. Jawaban SRQ diisi terpisah."
            }}
        </p>
        <div class="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            <label
                v-for="code in nonVerbalReasonCodes"
                :key="code"
                class="flex min-h-11 items-center gap-3 px-3 py-2 text-[15px] leading-snug text-slate-800 hover:bg-slate-50 has-checked:bg-teal-50 has-checked:text-teal-950 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-teal-700 has-disabled:cursor-default"
            >
                <input
                    type="checkbox"
                    :checked="modelValue.non_verbal_reasons?.includes(code) ?? false"
                    @change="$emit('toggle', code)"
                    class="size-5 shrink-0 accent-teal-700"
                />
                <span>{{ getObservationLabel(code, locale) }}</span>
            </label>
        </div>
        <label
            v-if="modelValue.non_verbal_reasons?.includes('OTHER')"
            class="mt-4 block text-sm font-semibold text-slate-800"
        >
            {{
                isEn
                    ? "Other notes (optional, max 500 characters)"
                    : "Catatan lainnya (opsional, maksimal 500 karakter)"
            }}
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
            class="mt-1 min-h-11 rounded-lg px-2 text-sm font-medium text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"
        >
            {{ isEn ? "Clear Observations" : "Kosongkan Observasi" }}
        </button>
      </fieldset>
    </div>
</template>
<script setup lang="ts">
import {
    nonVerbalReasonCodes,
    type NonVerbalObservations,
    type NonVerbalReason,
} from "@/domain/assessment/nonVerbalObservations";
import { getObservationLabel } from "@/domain/assessment/observationPresentation";
import { useI18n } from "@/i18n";

const { locale, isEn } = useI18n();
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
