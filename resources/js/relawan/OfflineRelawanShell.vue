<template>
    <section v-if="view.status === 'LOCKED'" class="min-h-screen bg-slate-100 p-4 text-slate-900">
        <header class="mx-auto max-w-lg space-y-4">
            <h1 class="text-xl font-bold">RAPID-MIND · Relawan</h1>
            <p>Mode terbatas. Data klinis perangkat terkunci dan belum dibaca.</p>
            <nav aria-label="Navigasi mode terbatas" class="flex flex-wrap gap-3">
                <button type="button" class="min-h-11 rounded border border-slate-400 px-4" @click="unlockRequested = false">Beranda</button>
                <button type="button" class="min-h-11 rounded bg-teal-700 px-4 text-white" @click="unlockRequested = true">Buka data offline / lanjutkan pekerjaan</button>
            </nav>
            <button type="button" class="min-h-11 underline" @click="signOut">Keluar akun di perangkat ini</button>
            <LockedEmergencyGuidance v-if="!unlockRequested" />
        </header>
        <OfflineEncryptionGate v-if="unlockRequested" :owner="owner" />
    </section>
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
                    ? isEn
                        ? "Checking device access…"
                        : "Memeriksa akses perangkat…"
                    : isEn
                      ? "Page unavailable"
                      : "Halaman belum tersedia"
            }}
        </h1>
        <p v-if="view.status !== 'LOADING'" class="mt-3">
            {{
                isEn
                    ? "Access or storage for this page is unavailable. Local data remains preserved."
                    : "Akses atau penyimpanan halaman ini belum tersedia. Data lokal tetap dipertahankan."
            }}
        </p>
        <button
            v-if="view.status === 'UNAVAILABLE'"
            class="mt-4 underline"
            @click="runtime.navigate('/relawan/home')"
        >
            {{ isEn ? "Back to Home" : "Kembali ke Beranda" }}
        </button>
    </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useI18n } from "@/i18n";
import LockedEmergencyGuidance from "@/components/Relawan/LockedEmergencyGuidance.vue";
import OfflineEncryptionGate from "@/components/Relawan/OfflineEncryptionGate.vue";
import { relawanRuntimeKey } from "./runtime";
import { createOfflineNavigation } from "./offlineNavigation";
import { lockRelawanContinuity } from "@/offline/relawanContinuity";
import { lockAllClinicalKeys } from "@/offline/encryptedClinicalStorage";
import { startRelawanSessionRecovery } from "@/offline/sessionRecovery";

const { isEn } = useI18n();

const props = defineProps<{ owner: number }>();
const unlockRequested = ref(false);
async function signOut() {
    lockAllClinicalKeys();
    await lockRelawanContinuity();
}
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
    if (current.status === "LOCKED") unlockRequested.value = false;
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
