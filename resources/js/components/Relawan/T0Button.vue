<template>
  <div class="fixed bottom-20 right-4 z-40">
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
defineEmits<{
  (e: 'trigger'): void;
}>();
</script>
