<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight',
      variantClasses
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 't0' | 't1' | 't2' | 't3' | 'neutral' | 'success' | 'warning';
  }>(),
  {
    variant: 'neutral',
  }
);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 't0':
      return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    case 't1':
      return 'bg-orange-50 text-orange-700 border border-orange-200/80';
    case 't2':
      return 'bg-amber-50 text-amber-800 border border-amber-200/80';
    case 't3':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    case 'success':
      return 'bg-teal-50 text-teal-800 border border-teal-200/70';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border border-amber-200/70';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200/70';
  }
});
</script>
