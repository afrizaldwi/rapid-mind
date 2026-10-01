<template>
  <button type="button" class="inline-flex max-w-[13rem] items-center rounded-full border px-2.5 py-1 text-left text-xs font-medium transition"
    :class="statusStyle" aria-label="Buka Status Data" @click="$emit('open')">
    <span class="mr-1.5 h-2 w-2 shrink-0 rounded-full" :class="dotStyle"></span>
    <span class="truncate">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OperationalKind } from '@/composables/useRelawanOperationalStatus';

const props = defineProps<{ kind: OperationalKind; label: string }>();
defineEmits<{ (e: 'open'): void }>();

const statusStyle = computed(() => {
  if (props.kind === 'local-failure') return 'bg-slate-100 text-slate-900 border-slate-700 font-bold';
  if (props.kind === 'failed' || props.kind === 'unqueued' || props.kind === 'reauthentication-required') return 'bg-amber-50 text-amber-900 border-amber-300';
  if (props.kind === 'offline' || props.kind === 'unavailable' || props.kind === 'local-only') return 'bg-slate-100 text-slate-700 border-slate-300';
  return 'bg-teal-50 text-teal-800 border-teal-200';
});
const dotStyle = computed(() => {
  if (props.kind === 'local-failure') return 'bg-slate-900';
  if (props.kind === 'failed' || props.kind === 'unqueued' || props.kind === 'reauthentication-required') return 'bg-amber-600';
  if (props.kind === 'offline' || props.kind === 'unavailable' || props.kind === 'local-only') return 'bg-slate-500';
  return 'bg-teal-600';
});
</script>
