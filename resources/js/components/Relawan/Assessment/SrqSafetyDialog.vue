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
                {{
                    state === "CONFIRM"
                        ? "Konfirmasi Jawaban Pertanyaan 17"
                        : "Jawaban Keselamatan Perlu Ditinjau"
                }}
            </h2>
            <p id="srq-safety-description">
                Tetap dampingi penyintas. Periksa langsung apakah respons
                menunjukkan pikiran untuk mengakhiri hidup. Konfirmasi jawaban
                tidak mengirim T0.
            </p>
            <blockquote
                v-if="evidence"
                class="whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3"
            >
                Hasil suara: {{ evidence }}
            </blockquote>
            <p v-if="state === 'REVIEW'">
                Jawaban manual atau tersimpan tetap dipertahankan. Periksa
                kembali Q17 secara manual.
            </p>
            <p v-if="state === 'CONFIRMED'">
                Jawaban Ya telah dipilih. Periksa status penyimpanan draf. Bila
                perlu bantuan darurat, buka verifikasi T0.
            </p>
            <button
                v-if="state === 'CONFIRM'"
                type="button"
                @click="$emit('confirm')"
                class="min-h-14 w-full rounded-lg bg-teal-700 p-3 font-bold text-white"
            >
                Konfirmasi Jawaban Ya
            </button>
            <button
                type="button"
                @click="$emit('escalate')"
                class="min-h-14 w-full rounded-lg bg-red-800 p-3 font-bold text-white"
            >
                Buka Verifikasi T0 Darurat
            </button>
            <button
                type="button"
                @click="$emit('dismiss')"
                class="min-h-14 w-full rounded-lg border border-slate-300 p-3 font-semibold"
            >
                {{
                    state === "CONFIRM"
                        ? "Batal — Pertahankan Jawaban Sebelumnya"
                        : "Kembali ke Asesmen"
                }}
            </button>
        </section>
    </div>
</template>
<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useDialogFocus } from "@/composables/useDialogFocus";
const props = defineProps<{
    state: "CONFIRM" | "REVIEW" | "CONFIRMED" | null;
    evidence?: string;
}>();
const emit = defineEmits<{ confirm: []; dismiss: []; escalate: [] }>();
const panel = ref<HTMLElement | null>(null);
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
