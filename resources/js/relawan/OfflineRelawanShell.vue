<template>
    <section v-if="view.status === 'LOCKED'" class="rm-app min-h-screen bg-slate-100 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-1">
                <span class="flex min-w-0 items-center gap-2 font-semibold">
                    <img src="/logo.png?v=3" alt="" class="h-6 w-6 shrink-0 object-contain" />
                    RAPID-MIND · {{ isEn ? 'Volunteer' : 'Relawan' }}
                </span>
                <button type="button" class="shrink-0 rounded-lg px-2 text-sm font-medium text-teal-700" @click="runtime.navigate('/relawan/home')">{{ isEn ? 'Home' : 'Beranda' }}</button>
            </div>
        </header>
        <main class="mx-auto grid max-w-md gap-3 px-4 py-4">
            <section v-if="!unlockRequested" class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="locked-mode-title">
                <h1 id="locked-mode-title" class="text-lg font-bold">{{ isEn ? 'Limited mode' : 'Mode terbatas' }}</h1>
                <p class="mt-1 text-sm text-slate-600">{{ isEn ? 'Clinical data on this device is locked.' : 'Data klinis di perangkat ini terkunci.' }}</p>
                <button type="button" class="mt-4 min-h-11 w-full rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white" @click="unlockRequested = true">{{ isEn ? 'Open offline data / resume work' : 'Buka data offline / lanjutkan pekerjaan' }}</button>
            </section>
            <OfflineEncryptionGate v-else :owner="owner" class="my-0!" />
            <button ref="emergencyTrigger" type="button" class="min-h-11 w-full rounded-lg border border-red-800 bg-white px-3 py-2 font-semibold text-red-800" @click="showEmergencyGuide = true">{{ isEn ? 'T0 EMERGENCY' : 'T0 DARURAT' }}</button>
            <button type="button" class="min-h-11 justify-self-center rounded-lg px-3 text-sm text-slate-600 underline underline-offset-4" @click="signOut">{{ isEn ? 'Sign out on this device' : 'Keluar akun di perangkat ini' }}</button>
        </main>
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
    <div v-if="view.status === 'LOCKED' && showEmergencyGuide" class="rm-app rm-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-900/80 p-3 sm:items-center" @click.self="showEmergencyGuide = false">
        <section ref="guidanceDialog" role="dialog" aria-modal="true" aria-labelledby="offline-emergency-guide-title" tabindex="-1" class="rm-dialog w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 text-slate-900" @keydown="guidanceKeydown">
            <div class="mb-4 flex items-center justify-between gap-3">
                <h2 id="offline-emergency-guide-title" class="text-lg font-bold">{{ isEn ? 'T0 Emergency' : 'T0 Darurat' }}</h2>
                <button ref="guidanceClose" type="button" class="min-h-11 rounded-lg px-3 py-2 font-semibold text-slate-700" @click="showEmergencyGuide = false">{{ isEn ? 'Close' : 'Tutup' }}</button>
            </div>
            <p class="mb-4 text-sm">{{ isEn ? 'Help is available while patient data is locked. Opening this guide does not create or send a T0 report.' : 'Bantuan tetap tersedia saat data pasien terkunci. Membuka panduan ini tidak membuat atau mengirim laporan T0.' }}</p>
            <LockedEmergencyGuidance />
        </section>
    </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useI18n } from "@/i18n";
import LockedEmergencyGuidance from "@/components/Relawan/LockedEmergencyGuidance.vue";
import OfflineEncryptionGate from "@/components/Relawan/OfflineEncryptionGate.vue";
import { relawanRuntimeKey } from "./runtime";
import { createOfflineNavigation } from "./offlineNavigation";
import { lockRelawanContinuity } from "@/offline/relawanContinuity";
import { lockAllClinicalKeys } from "@/offline/encryptedClinicalStorage";
import { startRelawanSessionRecovery } from "@/offline/sessionRecovery";
import { useDialogFocus } from "@/composables/useDialogFocus";

const { isEn } = useI18n();

const props = defineProps<{ owner: number }>();
const unlockRequested = ref(false);
const showEmergencyGuide = ref(false);
const guidanceDialog = ref<HTMLElement | null>(null);
const emergencyTrigger = ref<HTMLButtonElement | null>(null);
const guidanceClose = ref<HTMLButtonElement | null>(null);
const { keydown: guidanceKeydown } = useDialogFocus(guidanceDialog, () => showEmergencyGuide.value, () => { showEmergencyGuide.value = false; });
watch(showEmergencyGuide, async show => {
    await nextTick();
    if (show) guidanceClose.value?.focus();
    else emergencyTrigger.value?.focus();
});
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
    if (current.status !== "LOCKED") showEmergencyGuide.value = false;
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
