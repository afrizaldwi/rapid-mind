<template>
    <aside
        v-if="visible"
        role="status"
        aria-live="polite"
        class="shrink-0 border-b px-3 sm:px-4 py-1 text-[11px] leading-snug transition-colors"
        :class="
            requiresAttention
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : offlineReadiness.state === 'READY'
                  ? 'border-teal-200 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
        "
    >
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 max-w-lg mx-auto">
            <p class="font-medium">{{ conciseMessage }}</p>
            <button
                v-if="['ERROR', 'INCOMPLETE'].includes(offlineReadiness.state)"
                type="button"
                class="font-semibold underline shrink-0 cursor-pointer"
                @click="registerRelawanServiceWorker"
            >
                {{ isEn ? "Check offline readiness" : "Periksa kesiapan offline" }}
            </button>
        </div>
        <p v-if="offlineReadiness.updateWaiting" class="mt-0.5 max-w-lg mx-auto">
            {{
                isEn
                    ? "Update available. Ensure drafts are saved, then close all RAPID-MIND tabs before reopening."
                    : "Pembaruan tersedia. Pastikan draf tersimpan, lalu tutup semua tab RAPID-MIND sebelum membuka kembali."
            }}
        </p>
    </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { offlineReadiness, registerRelawanServiceWorker } from "@/pwa/register";
import { useI18n } from "@/i18n";

const { isEn } = useI18n();

const transientVisible = ref(
    offlineReadiness.state === "INSTALLING" || offlineReadiness.state === "CHECKING",
);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer(): void {
    if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

watch(
    () => offlineReadiness.state,
    (next, prev) => {
        clearHideTimer();
        if (next === "INSTALLING" || next === "CHECKING") {
            transientVisible.value = true;
            return;
        }
        if (next === "READY" && (prev === "INSTALLING" || prev === "CHECKING")) {
            transientVisible.value = true;
            hideTimer = setTimeout(() => {
                transientVisible.value = false;
            }, 2200);
            return;
        }
        transientVisible.value = false;
    },
    { immediate: true },
);

onBeforeUnmount(clearHideTimer);

const requiresAttention = computed(
    () =>
        ["UNSUPPORTED", "INCOMPLETE", "ERROR"].includes(offlineReadiness.state) ||
        offlineReadiness.updateWaiting,
);

const visible = computed(() => requiresAttention.value || transientVisible.value);

const conciseMessage = computed(() => {
    if (isEn.value) {
        switch (offlineReadiness.state) {
            case "UNSUPPORTED":
                return "This browser does not yet support offline application storage.";
            case "INSTALLING":
                return "Preparing application for offline use…";
            case "CHECKING":
                return "Checking offline readiness…";
            case "READY":
                return "Application ready for offline use.";
            case "INCOMPLETE":
                return "Offline readiness not verified yet. Connect and recheck.";
            case "ERROR":
                return "Offline preparation failed. Local data remains preserved.";
            default:
                return "";
        }
    }
    switch (offlineReadiness.state) {
        case "UNSUPPORTED":
            return "Browser ini belum mendukung penyimpanan aplikasi offline.";
        case "INSTALLING":
            return "Menyiapkan aplikasi untuk dibuka offline…";
        case "CHECKING":
            return "Memeriksa kesiapan offline…";
        case "READY":
            return "Aplikasi siap dibuka offline.";
        case "INCOMPLETE":
            return "Kesiapan offline belum terverifikasi. Sambungkan lalu periksa kembali.";
        case "ERROR":
            return "Persiapan offline gagal. Data lokal tetap dipertahankan.";
        default:
            return "";
    }
});
</script>
