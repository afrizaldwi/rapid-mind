<template>
  <div
    class="fixed right-3.5 lg:right-6 z-40"
    :style="{ bottom: resolvedBottom }"
  >
    <button
      type="button"
      @click="$emit('trigger')"
      class="flex items-center space-x-1.5 sm:space-x-2 bg-red-800 hover:bg-red-900 text-white px-4 py-3 lg:px-5 rounded-full shadow-lg border border-red-700/60 font-bold transition-colors duration-150 min-h-[48px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 cursor-pointer"
      :aria-label="$t('relawan.emergencyButtonLabel')"
    >
      <Siren class="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true" />
      <span class="text-xs lg:text-sm font-extrabold tracking-wider whitespace-nowrap">{{ isEn ? 'T0 EMERGENCY' : 'T0 DARURAT' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
let contentObserver: MutationObserver | null = null;
let observedBar: HTMLElement | null = null;
let mounted = false;

function updatePosition() {
  if (!props.focused) return;
  const actionBar = document.querySelector<HTMLElement>('[data-assessment-action-bar]');
  if (actionBar !== observedBar) {
    actionBarObserver?.disconnect();
    observedBar = actionBar;
    if (actionBar && typeof ResizeObserver !== 'undefined') {
      actionBarObserver = new ResizeObserver(updatePosition);
      actionBarObserver.observe(actionBar);
    }
  }
  // Use the footer's actual top edge, including safe area and wrapped errors.
  focusedBottom.value = actionBar
    ? `${Math.max(0, Math.ceil(window.innerHeight - actionBar.getBoundingClientRect().top)) + 12}px`
    : 'calc(env(safe-area-inset-bottom) + 4.15rem)';
}

function stopObserving() {
  actionBarObserver?.disconnect();
  contentObserver?.disconnect();
  actionBarObserver = null;
  contentObserver = null;
  observedBar = null;
  window.removeEventListener('resize', updatePosition);
}

async function observeFooter() {
  stopObserving();
  if (!mounted || !props.focused) return;
  await nextTick();
  if (!mounted || !props.focused) return;
  updatePosition();
  // The clinical view can mount or replace its footer after key restoration.
  contentObserver = new MutationObserver(updatePosition);
  contentObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', updatePosition);
}

watch(() => props.focused, observeFooter, { flush: 'post' });
onMounted(() => { mounted = true; void observeFooter(); });
onBeforeUnmount(() => { mounted = false; stopObserving(); });
</script>
