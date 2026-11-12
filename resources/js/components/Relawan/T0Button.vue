<template>
  <div
    class="fixed right-3.5 lg:!right-6 lg:!bottom-6 z-40"
    :style="{ bottom: resolvedBottom }"
  >
    <button
      type="button"
      @click="$emit('trigger')"
      class="flex items-center space-x-1.5 sm:space-x-2 bg-red-800 hover:bg-red-900 active:scale-95 text-white px-3.5 py-2 lg:px-5 lg:py-3 rounded-full shadow-lg lg:shadow-xl border border-red-700/60 font-bold tracking-wide transition duration-150 min-h-[42px] lg:min-h-[50px] focus:outline-none focus:ring-4 focus:ring-red-500/30 cursor-pointer"
      :aria-label="$t('relawan.emergencyButtonLabel')"
    >
      <Siren class="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true" />
      <span class="text-xs lg:text-sm font-extrabold tracking-wider whitespace-nowrap">{{ isEn ? 'T0 EMERGENCY' : 'T0 DARURAT' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Siren } from 'lucide-vue-next';
import { useI18n } from '@/i18n';

const { isEn, t: $t } = useI18n();

const props = withDefaults(defineProps<{ focused?: boolean; hasBottomNav?: boolean }>(), {
  focused: false,
  hasBottomNav: true,
});
defineEmits<{
  (e: 'trigger'): void;
}>();

const focusedBottom = ref('calc(env(safe-area-inset-bottom) + 4.15rem)');
const resolvedBottom = computed(() => {
  if (props.focused) return focusedBottom.value;
  return props.hasBottomNav
    ? 'calc(env(safe-area-inset-bottom) + 4.35rem)'
    : 'calc(env(safe-area-inset-bottom) + 0.5rem)';
});
let actionBarObserver: ResizeObserver | null = null;

watch(() => props.focused, async focused => {
  actionBarObserver?.disconnect();
  actionBarObserver = null;
  if (!focused) return;

  await nextTick();
  if (!props.focused) return;

  const actionBar = document.querySelector<HTMLElement>('[data-assessment-action-bar]');
  if (!actionBar) {
    focusedBottom.value = 'calc(env(safe-area-inset-bottom) + 0.5rem)';
    return;
  }

  const updatePosition = () => {
    focusedBottom.value = String(Math.ceil(actionBar.getBoundingClientRect().height) + 6) + 'px';
  };
  updatePosition();

  if (typeof ResizeObserver !== 'undefined') {
    actionBarObserver = new ResizeObserver(updatePosition);
    actionBarObserver.observe(actionBar);
  }
}, { immediate: true, flush: 'post' });

onBeforeUnmount(() => actionBarObserver?.disconnect());
</script>
