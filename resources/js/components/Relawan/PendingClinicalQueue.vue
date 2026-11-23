<template>
    <section aria-labelledby="pending-delivery-title" class="mt-5 space-y-3 border-t border-slate-200 pt-4">
        <h3 id="pending-delivery-title" class="font-bold text-slate-900">{{ isEn ? 'Awaiting Healthcare delivery' : 'Belum terkirim ke Nakes' }}</h3>
        <p class="text-sm text-slate-600">{{ isEn ? 'Failed deliveries remain encrypted for retry. Verified delivered copies are removed automatically.' : 'Pengiriman yang gagal tetap tersimpan terenkripsi untuk dikirim ulang. Salinan yang terbukti terkirim dihapus otomatis.' }}</p>
        <p v-if="workspace.error.value || actionError" role="alert" class="text-sm text-amber-900">{{ workspace.error.value || actionError }}</p>
        <p v-if="!workspace.ready.value" role="status" class="text-sm text-slate-600">{{ isEn ? 'Reading encrypted queue…' : 'Membaca antrean terenkripsi…' }}</p>
        <p v-else-if="!workspace.groups.value.pending.length" class="text-sm text-slate-600">{{ isEn ? 'No pending deliveries.' : 'Tidak ada pengiriman tertunda.' }}</p>
        <article v-for="item in workspace.groups.value.pending" :key="item.key" class="rounded-lg border border-slate-200 p-3">
            <h4 class="break-words font-semibold text-slate-900">{{ item.patientName }}</h4>
            <p class="mt-1 text-sm" :class="item.type === 'EMERGENCY' ? 'text-red-800' : 'text-amber-900'">{{ item.type === 'EMERGENCY' ? 'T0-Suspect' : (isEn ? 'Assessment' : 'Asesmen') }} · {{ item.label }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
                <RelawanLink v-if="item.resultUrl || item.emergencyUrl" :href="(item.resultUrl || item.emergencyUrl)!" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">{{ isEn ? 'Review' : 'Periksa' }}</RelawanLink>
                <button v-if="item.unqueued" type="button" :disabled="busy" class="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="prepare(item.id)">{{ isEn ? 'Prepare delivery' : 'Siapkan pengiriman' }}</button>
            </div>
        </article>
        <RelawanLink href="/relawan/assessment/drafts" class="inline-block rounded-lg px-3 py-2 text-sm font-semibold text-teal-800">{{ isEn ? 'Continue unfinished assessment' : 'Lanjutkan asesmen belum selesai' }}</RelawanLink>
    </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/i18n';
import RelawanLink from '@/relawan/RelawanLink.vue';
import { useRelawanDataWorkspace } from '@/composables/useRelawanDataWorkspace';
import { completeLocalAssessment } from '@/offline/assessmentWorkflow';

const props = defineProps<{ owner: number }>();
const { isEn } = useI18n();
const owner = computed(() => props.owner);
const workspace = useRelawanDataWorkspace(owner, ref([]), ref([]), ref([]));
const busy = ref(false);
const failed = ref(false);
const actionError = computed(() => failed.value ? (isEn.value ? 'Delivery preparation failed. Data remains on device.' : 'Pengiriman belum dapat disiapkan. Data tetap tersimpan di perangkat.') : '');
async function prepare(id: string) {
    if (busy.value) return;
    busy.value = true;
    failed.value = false;
    try { await completeLocalAssessment(props.owner, id); }
    catch { failed.value = true; }
    finally { busy.value = false; }
}
</script>
