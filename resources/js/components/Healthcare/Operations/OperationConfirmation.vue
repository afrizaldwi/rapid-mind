<template>
    <dialog
        ref="dialog"
        :aria-labelledby="titleId"
        class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-xs shadow-xl backdrop:bg-slate-900/40"
        @cancel.prevent="emit('cancel')"
    >
        <h3 :id="titleId" class="mb-3 font-bold text-slate-900">{{ title }}</h3>
        <div class="space-y-3"><slot /></div>
        <button
            type="button"
            autofocus
            :disabled="busy"
            class="mt-3 rounded-lg border border-slate-300 px-3 py-2"
            @click="emit('cancel')"
        >
            Batal
        </button>
    </dialog>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
defineProps<{ titleId: string; title: string; busy: boolean }>();
const emit = defineEmits<{ cancel: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
let previousFocus: HTMLElement | null = null;
onMounted(() => {
    previousFocus =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    dialog.value?.showModal();
});
onBeforeUnmount(() => {
    dialog.value?.close();
    previousFocus?.focus();
});
</script>
