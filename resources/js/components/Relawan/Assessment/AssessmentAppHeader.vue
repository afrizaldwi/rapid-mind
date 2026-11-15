<template>
    <header class="assessment-header relative z-30 flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-1 sm:gap-4 sm:px-4">
        <img src="/logo.png?v=3" alt="RAPID-MIND" class="h-6 w-6 shrink-0 object-contain" />
        <div class="flex min-w-0 flex-1 flex-col items-start sm:flex-row sm:items-center sm:gap-4">
            <p class="min-w-0 break-words text-xs font-semibold leading-snug text-slate-700 sm:text-sm">{{ shelter }}</p>
            <StatusIndicator
                v-if="(!hideRoutineStatus || needsAttention) && !(onlineServer && online && kind === 'unavailable')"
                :kind="kind"
                :label="onlineServer && !online && kind === 'unavailable' ? 'Offline' : label"
                @open="$emit('status')"
            />
        </div>
        <div class="flex shrink-0 items-center gap-1">
            <LanguageSwitcher compact />
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700" :aria-label="isEn ? 'Sign out' : 'Keluar akun'" :title="isEn ? 'Sign out' : 'Keluar akun'" @click="$emit('logout')"><LogOut class="h-[18px] w-[18px]" :stroke-width="1.5" aria-hidden="true" /></button>
        </div>
    </header>
    <p v-if="onlineServer && !online" role="alert" class="shrink-0 border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{{ isEn ? 'Connection lost. Check unsaved answers and keep this page open.' : 'Koneksi terputus. Periksa jawaban yang belum tersimpan dan jangan tutup halaman ini.' }}</p>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { LogOut } from 'lucide-vue-next';
import StatusIndicator from '@/components/ui/StatusIndicator.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import { useI18n } from '@/i18n';
import type { OperationalKind } from '@/composables/useRelawanOperationalStatus';
const props = defineProps<{ shelter: string; kind: OperationalKind; label: string; onlineServer?: boolean; hideRoutineStatus?: boolean }>();
defineEmits<{ status: []; logout: [] }>();
const { isEn } = useI18n();
const needsAttention = computed(() => ['local-failure', 'failed', 'unqueued', 'reauthentication-required'].includes(props.kind));
const online = ref(typeof navigator !== 'undefined' && navigator.onLine);
const updateConnection = () => { online.value = navigator.onLine; };
onMounted(() => { window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection); });
onUnmounted(() => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); });
</script>

<style scoped>
.assessment-header :deep(.rm-language button) {
    min-inline-size: 2rem;
    min-block-size: 2rem;
    padding: 0 .25rem;
    font-size: .75rem;
}
.assessment-header :deep(.rm-status) {
    min-block-size: 1.5rem;
    max-inline-size: 100%;
    padding: 0;
}
.assessment-header :deep(.rm-status .truncate) {
    white-space: normal;
    overflow-wrap: anywhere;
}
</style>
