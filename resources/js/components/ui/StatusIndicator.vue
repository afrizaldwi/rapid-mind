<template>
  <div class="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition" :class="statusStyle">
    <span class="w-2 h-2 rounded-full mr-1.5" :class="dotStyle"></span>
    <span>{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    isOnline?: boolean;
    isSyncing?: boolean;
    pendingCount?: number;
  }>(),
  {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  }
);

const statusText = computed(() => {
  if (props.isSyncing) {
    return 'Menyinkronkan…';
  }
  if (!props.isOnline) {
    return props.pendingCount > 0
      ? `Offline • ${props.pendingCount} data tersimpan`
      : 'Mode Offline';
  }
  if (props.pendingCount > 0) {
    return `${props.pendingCount} data menunggu sinkronisasi`;
  }
  return 'Tersinkron';
});

const statusStyle = computed(() => {
  if (props.isSyncing) {
    return 'bg-teal-50 text-teal-700 border-teal-200';
  }
  if (!props.isOnline) {
    return 'bg-slate-100 text-slate-700 border-slate-300';
  }
  if (props.pendingCount > 0) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-teal-50 text-teal-800 border-teal-200';
});

const dotStyle = computed(() => {
  if (props.isSyncing) {
    return 'bg-teal-600 animate-pulse';
  }
  if (!props.isOnline) {
    return 'bg-slate-400';
  }
  if (props.pendingCount > 0) {
    return 'bg-amber-500';
  }
  return 'bg-teal-600';
});
</script>
