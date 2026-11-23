<template>
  <button type="button"
    class="rm-status inline-flex items-center text-left text-xs font-medium transition gap-1.5 rounded-lg px-1 py-2 hover:bg-slate-50"
    :class="statusTextColor" :title="label" :aria-label="$t('relawan.statusSheet.openStatusAria', 'Buka Status Data') + ': ' + label" @click="$emit('open')">
    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="dotStyle"></span>
    <span class="truncate">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t as $t } from '@/i18n';
import type { OperationalKind } from '@/composables/useRelawanOperationalStatus';

const props = defineProps<{ kind: OperationalKind; label: string }>();
defineEmits<{ (e: 'open'): void }>();

const statusTextColor = computed(() => {
  if (props.kind === 'local-failure') return 'text-rose-700 font-semibold';
  if (props.kind === 'failed' || props.kind === 'unqueued' || props.kind === 'reauthentication-required') return 'text-amber-800 font-medium';
  if (props.kind === 'offline' || props.kind === 'unavailable' || props.kind === 'local-only') return 'text-slate-500 font-medium';
  return 'text-slate-600 font-medium';
});

const dotStyle = computed(() => {
  if (props.kind === 'local-failure') return 'bg-rose-600';
  if (props.kind === 'failed' || props.kind === 'unqueued' || props.kind === 'reauthentication-required') return 'bg-amber-500';
  if (props.kind === 'offline' || props.kind === 'unavailable' || props.kind === 'local-only') return 'bg-slate-400';
  return 'bg-emerald-500';
});
</script>
