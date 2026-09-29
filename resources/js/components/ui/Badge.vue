<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
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
      return 'bg-red-100 text-red-900 border border-red-300 font-bold';
    case 't1':
      return 'bg-orange-100 text-orange-900 border border-orange-300 font-bold';
    case 't2':
      return 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold';
    case 't3':
      return 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold';
    case 'success':
      return 'bg-teal-50 text-teal-800 border border-teal-200';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200';
  }
});
</script>
