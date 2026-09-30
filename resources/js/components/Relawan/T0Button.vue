<template>
  <div
    class="fixed right-4 z-40"
    :style="{ bottom: focused ? focusedBottom : '5rem' }"
  >
    <button
      type="button"
      @click="$emit('trigger')"
      class="flex items-center space-x-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white px-5 py-3.5 rounded-full shadow-2xl border-2 border-red-700/60 font-bold tracking-wide transition duration-150 min-h-[56px] focus:outline-none focus:ring-4 focus:ring-red-500/30"
      aria-label="Picu T0 Darurat"
    >
      <span class="text-xl leading-none">🚨</span>
      <span class="text-sm font-extrabold tracking-wider">T0 DARURAT</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ focused?: boolean }>(), { focused: false });
defineEmits<{
  (e: 'trigger'): void;
}>();

const focusedBottom = ref('calc(env(safe-area-inset-bottom) + 7rem)');
let actionBarObserver: ResizeObserver | null = null;

watch(() => props.focused, async focused => {
  actionBarObserver?.disconnect();
  actionBarObserver = null;
  if (!focused) return;

  await nextTick();
  if (!props.focused) return;

  const actionBar = document.querySelector<HTMLElement>('[data-assessment-action-bar]');
  if (!actionBar) return;

  const updatePosition = () => {
    focusedBottom.value = String(Math.ceil(actionBar.getBoundingClientRect().height) + 12) + 'px';
  };
  updatePosition();

  if (typeof ResizeObserver !== 'undefined') {
    actionBarObserver = new ResizeObserver(updatePosition);
    actionBarObserver.observe(actionBar);
  }
}, { immediate: true, flush: 'post' });

onBeforeUnmount(() => actionBarObserver?.disconnect());
</script>
