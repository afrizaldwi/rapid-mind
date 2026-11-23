<template>
    <section class="mx-auto my-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite">
        <p v-if="loading" role="status">Menyiapkan penyimpanan terenkripsi…</p>
        <template v-else-if="error">
            <p role="alert" class="text-sm text-amber-900">{{ error }}</p>
            <button type="button" class="mt-3 min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white" @click="prepare">Coba lagi</button>
        </template>
        <slot name="actions" />
    </section>
</template>
<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { ensureDeviceClinicalAccess } from "@/offline/deviceKeyWorkflow";
const props = defineProps<{ owner: number }>();
const emit = defineEmits<{ unlocked: [] }>();
const loading = ref(true);
const error = ref("");
let generation = 0;
async function prepare() {
    const check = ++generation;
    const owner = props.owner;
    loading.value = true;
    error.value = "";
    try {
        await ensureDeviceClinicalAccess(owner);
        if (check === generation && owner === props.owner) emit("unlocked");
    } catch (reason) {
        if (check === generation) error.value = reason instanceof Error ? reason.message : "Penyimpanan perangkat belum tersedia. Data tetap tersimpan.";
    } finally {
        if (check === generation) loading.value = false;
    }
}
watch(() => props.owner, prepare, { immediate: true });
onUnmounted(() => { generation++; });
</script>
