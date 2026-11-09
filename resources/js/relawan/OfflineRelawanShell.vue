<template>
    <OfflineEncryptionGate v-if="view.status === 'LOCKED'" :owner="owner" />
    <div
        v-else-if="view.status === 'READY'"
        :key="view.revision"
        ref="clinicalRoot"
    >
        <component :is="view.page.component" v-bind="view.page.props" />
    </div>
    <div
        v-else
        class="min-h-screen bg-slate-100 p-6 text-slate-900"
        role="status"
    >
        <h1 class="text-lg font-bold">
            {{
                view.status === "LOADING"
                    ? "Memeriksa akses perangkat…"
                    : "Halaman belum tersedia"
            }}
        </h1>
        <p v-if="view.status !== 'LOADING'" class="mt-3">
            Akses atau penyimpanan halaman ini belum tersedia. Data lokal tetap
            dipertahankan.
        </p>
        <button
            v-if="view.status === 'UNAVAILABLE'"
            class="mt-4 underline"
            @click="runtime.navigate('/relawan/home')"
        >
            Kembali ke Beranda
        </button>
    </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from "vue";
import OfflineEncryptionGate from "@/components/Relawan/OfflineEncryptionGate.vue";
import { relawanRuntimeKey } from "./runtime";
import { createOfflineNavigation } from "./offlineNavigation";
import { startRelawanSessionRecovery } from "@/offline/sessionRecovery";

const props = defineProps<{ owner: number }>();
const clinicalRoot = ref<HTMLElement | null>(null);
const navigation = createOfflineNavigation(props.owner, () => {
    if (clinicalRoot.value) {
        clinicalRoot.value.style.display = "none";
        clinicalRoot.value.setAttribute("aria-hidden", "true");
    }
});
const { runtime, view } = navigation;
provide(relawanRuntimeKey, runtime);
let recoveryStarted = false;
watch(view, (current) => {
    if (current.status === "READY" && !recoveryStarted) {
        recoveryStarted = true;
        startRelawanSessionRecovery(props.owner);
    }
});
onMounted(() => {
    void navigation.start();
});
onUnmounted(navigation.stop);
</script>
