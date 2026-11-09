<template>
  <a v-if="runtime.mode === 'OFFLINE_FIELD_MODE'" :href="href" v-bind="$attrs" @click="followOfflineLink($event, runtime)">
    <slot />
  </a>
  <Link v-else :href="href" v-bind="$attrs">
    <slot />
  </Link>
</template>
<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { useRelawanRuntime } from './runtime';
import { followOfflineLink } from './offlineLink';
defineOptions({ inheritAttrs: false });
defineProps<{ href: string }>();
const runtime = useRelawanRuntime();
</script>
