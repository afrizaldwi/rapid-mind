<template>
    <div
        v-if="state"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-4"
    >
        <section
            ref="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="srq-safety-title"
            aria-describedby="srq-safety-description"
            tabindex="-1"
            @keydown="keydown"
            class="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-base text-slate-900 shadow-xl"
        >
            <h2 id="srq-safety-title" class="text-xl font-bold">
                {{ dialogTitle }}
            </h2>
            <p id="srq-safety-description">
                {{ isEn ? "Continue accompanying the survivor. Directly verify whether responses indicate thoughts of ending life. Confirming an answer does not send a T0 report." : "Tetap dampingi penyintas. Periksa langsung apakah respons menunjukkan pikiran untuk mengakhiri hidup. Konfirmasi jawaban tidak mengirim T0." }}
            </p>
            <blockquote
                v-if="evidence"
                class="whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3"
            >
                {{ isEn ? "Voice transcript: " : "Hasil suara: " }}{{ evidence }}
            </blockquote>
            <p v-if="state === 'REVIEW'">
                {{ isEn ? "Manual or stored answers remain preserved. Please review Q17 manually." : "Jawaban manual atau tersimpan tetap dipertahankan. Periksa kembali Q17 secara manual." }}
            </p>
            <p v-if="state === 'CONFIRMED'">
                {{ isEn ? "Answer 'Yes' has been selected. Check draft storage status. If emergency assistance is required, open T0 verification." : "Jawaban Ya telah dipilih. Periksa status penyimpanan draf. Bila perlu bantuan darurat, buka verifikasi T0." }}
            </p>
            <button
                v-if="state === 'CONFIRM'"
                type="button"
                @click="$emit('confirm')"
                class="min-h-14 w-full rounded-lg bg-teal-700 p-3 font-bold text-white cursor-pointer"
            >
                {{ isEn ? "Confirm Answer: Yes" : "Konfirmasi Jawaban Ya" }}
            </button>
            <button
                type="button"
                @click="$emit('escalate')"
                class="min-h-14 w-full rounded-lg bg-red-800 p-3 font-bold text-white cursor-pointer"
            >
                {{ isEn ? "Open T0 Emergency Verification" : "Buka Verifikasi T0 Darurat" }}
            </button>
            <button
                type="button"
                @click="$emit('dismiss')"
                class="min-h-14 w-full rounded-lg border border-slate-300 p-3 font-semibold cursor-pointer"
            >
                {{ dismissButtonLabel }}
            </button>
        </section>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { useDialogFocus } from "@/composables/useDialogFocus";
import { useI18n } from "@/i18n";

const { locale } = useI18n();
const isEn = computed(() => locale.value === "en");

const props = defineProps<{
    state: "CONFIRM" | "REVIEW" | "CONFIRMED" | null;
    evidence?: string;
}>();
const emit = defineEmits<{ confirm: []; dismiss: []; escalate: [] }>();
const panel = ref<HTMLElement | null>(null);

const dialogTitle = computed(() => {
    if (props.state === "CONFIRM") {
        return isEn.value ? "Confirm Question 17 Answer" : "Konfirmasi Jawaban Pertanyaan 17";
    }
    return isEn.value ? "Safety Answer Requires Review" : "Jawaban Keselamatan Perlu Ditinjau";
});

const dismissButtonLabel = computed(() => {
    if (props.state === "CONFIRM") {
        return isEn.value ? "Cancel — Keep Previous Answer" : "Batal — Pertahankan Jawaban Sebelumnya";
    }
    return isEn.value ? "Return to Assessment" : "Kembali ke Asesmen";
});

watch(
    () => props.state,
    async (state) => {
        await nextTick();
        if (state && state === props.state) panel.value?.focus();
    },
);
const { keydown } = useDialogFocus(
    panel,
    () => !!props.state,
    () => emit("dismiss"),
);
</script>
