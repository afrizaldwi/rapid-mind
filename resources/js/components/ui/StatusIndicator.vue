<template>
  <button type="button"
    class="inline-flex max-w-[13rem] items-center text-left text-xs font-medium transition gap-1.5 hover:opacity-80 py-1"
    :class="statusTextColor" aria-label="Buka Status Data" @click="$emit('open')">
    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="dotStyle"></span>
    <span class="truncate">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
