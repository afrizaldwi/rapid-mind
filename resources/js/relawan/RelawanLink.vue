<template>
  <a v-if="runtime.mode === 'OFFLINE_FIELD_MODE'" :href="href" v-bind="$attrs">
    <slot />
  </a>
  <Link v-else :href="href" v-bind="$attrs">
    <slot />
  </Link>
</template>
<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { useRelawanRuntime } from './runtime';
defineOptions({ inheritAttrs: false });
defineProps<{ href: string }>();
const runtime = useRelawanRuntime();
</script>
