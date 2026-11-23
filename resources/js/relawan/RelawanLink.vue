<template>
  <a :href="href" v-bind="$attrs" @click="followOfflineLink($event, runtime)">
    <slot />
  </a>
</template>
<script setup lang="ts">
import { useRelawanRuntime } from './runtime';
import { followOfflineLink } from './offlineLink';
defineOptions({ inheritAttrs: false });
defineProps<{ href: string }>();
const runtime = useRelawanRuntime();
</script>
