<template>
    <section
        class="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 text-slate-900 shadow"
        aria-labelledby="offline-key-title"
    >
        <h1 id="offline-key-title" class="text-lg font-bold">
            Kunci data klinis offline
        </h1>
        <p class="mt-2 text-sm text-slate-700">
            {{
                hasKey
                    ? "Masukkan frasa sandi atau kode pemulihan untuk membuka data akun ini."
                    : "Daftarkan kunci hanya setelah sesi Relawan terverifikasi melalui server."
            }}
        </p>
        <p v-if="loading" role="status" class="mt-4">
            Memeriksa kunci perangkat…
        </p>
        <p v-else-if="blocked" role="alert" class="mt-4 text-sm">{{ blocked }}</p>
        <form
            v-else-if="!recoveryCode"
            class="mt-4 space-y-3"
            @submit.prevent="submit"
        >
            <label v-if="hasKey && !pendingEnrollment" class="block text-sm font-medium">
                Metode pembukaan
                <select
                    v-model="purpose"
                    class="mt-1 w-full rounded border p-2"
                >
                    <option value="passphrase">Frasa sandi</option>
                    <option value="recovery">Kode pemulihan</option>
                </select>
            </label>
            <label class="block text-sm font-medium">
                {{
                    hasKey && purpose === "recovery"
                        ? "Kode pemulihan"
                        : "Frasa sandi offline"
                }}
                <input
                    v-model="secret"
                    :type="purpose === 'recovery' ? 'text' : 'password'"
                    autocomplete="off"
                    class="mt-1 w-full rounded border p-2"
                    required
                />
            </label>
            <label v-if="!hasKey" class="block text-sm font-medium">
                Ulangi frasa sandi
                <input
                    v-model="confirmation"
                    type="password"
                    autocomplete="off"
                    class="mt-1 w-full rounded border p-2"
                    required
                />
            </label>
            <p v-if="error" role="alert" class="text-sm text-red-800">
                {{ error }}
            </p>
            <p v-if="pendingEnrollment" class="text-sm">Pendaftaran belum selesai. Dengan frasa sandi dan verifikasi server, buat kode pemulihan pengganti untuk kunci yang sama. Kode sebelumnya akan tidak berlaku.</p>
            <button
                :disabled="busy"
                type="submit"
                class="rounded bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
                {{
                    busy
                        ? "Memproses…"
                        : pendingEnrollment
                          ? "Buat kode pemulihan pengganti"
                          : hasKey
                          ? "Buka data"
                          : "Daftarkan kunci"
                }}
            </button>
        </form>
        <div v-else class="mt-4 space-y-3">
            <p class="text-sm font-semibold">
                Simpan kode pemulihan ini sekarang. Kode ditampilkan satu kali.
            </p>
            <output
                class="block break-all rounded bg-slate-100 p-3 font-mono text-sm"
                >{{ recoveryCode }}</output
            >
            <p class="text-sm">
                Simpan di tempat aman di luar perangkat ini. Jangan kirim
                melalui pesan atau foto layar. Jika frasa sandi dan kode ini
                hilang, data offline tidak dapat dipulihkan.
            </p>
            <button
                type="button"
                class="rounded bg-teal-700 px-4 py-2 font-semibold text-white"
                :disabled="busy"
                @click="finishEnrollment"
            >
                Saya sudah menyimpan kode
            </button>
        </div>
        <p v-if="recoveryCode && error" role="alert" class="mt-3 text-sm text-red-800">{{ error }}</p>
        <p class="mt-4 text-sm">Jika frasa sandi dan kode pemulihan hilang, masuk ke server tidak dapat memulihkan kunci data lokal.</p>
        <LockedEmergencyGuidance />
    </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import LockedEmergencyGuidance from "./LockedEmergencyGuidance.vue";
import {
    enrollIsolatedOwner,
    enrollmentState,
    unlockIsolatedOwner,
} from "@/offline/offlineKeyWorkflow";

import { inspectClinicalInitialization } from "@/offline/clinicalStorageInitialization";
import { confirmClinicalRecovery, continueClinicalEnrollment, abandonPendingEnrollment } from "@/offline/clinicalKeyEnrollment";
import { clinicalKeyReady, clinicalKeyVersion } from "@/offline/encryptedClinicalStorage";
import { isolatedEncryptionFixture } from "@/offline/offlineKeyWorkflow";

const props = defineProps<{ owner: number }>();
const emit = defineEmits<{ unlocked: [] }>();
const loading = ref(true);
const busy = ref(false);
const hasKey = ref(false);
const blocked = ref("");
const pendingEnrollment = ref(false);
let generation = 0;
function clearSecrets() { secret.value = ""; confirmation.value = ""; recoveryCode.value = ""; }

const purpose = ref<"passphrase" | "recovery">("passphrase");
const secret = ref("");
const confirmation = ref("");
const recoveryCode = ref("");
const error = ref("");

async function load() {
    const operation = generation;
    const owner = props.owner;
    loading.value = true;
    error.value = "";
    try {
        if (isolatedEncryptionFixture()) {
            const state = await enrollmentState(owner);
            if (operation !== generation) return;
            hasKey.value = state === "EXISTING";
            return;
        }
        const state = await inspectClinicalInitialization(owner);
        if (operation !== generation) return;
        hasKey.value = state !== "FRESH";
        pendingEnrollment.value = state === "ENROLLMENT_PENDING";
        blocked.value = ["FRESH", "ENROLLMENT_PENDING", "ENCRYPTED_LOCKED"].includes(state) ? "" :
            state === "ACTIVATION_DISABLED" ? "Pendaftaran enkripsi perangkat belum diizinkan pada lingkungan ini. Hubungi pengelola aplikasi." :
            "Penyimpanan lama, rusak, atau metadata tidak sesuai. Data tetap tersimpan. Minta pemulihan atau reset pengembangan yang disetujui; aplikasi tidak akan menghapusnya otomatis.";
    } catch {
        error.value = "Kunci perangkat belum dapat diperiksa.";
    } finally {
        if (operation === generation) loading.value = false;
    }
}
async function submit() {
    if (busy.value) return;
    busy.value = true;
    const operation = generation;
    const owner = props.owner;
    error.value = "";
    try {
        if (pendingEnrollment.value) {
            const code = await continueClinicalEnrollment(owner, secret.value);
            if (operation !== generation) return;
            recoveryCode.value = code;
            secret.value = "";
        } else if (hasKey.value) {
            await unlockIsolatedOwner(props.owner, secret.value, purpose.value);
            secret.value = "";
            if (operation === generation) emit("unlocked");
        } else {
            const code = await enrollIsolatedOwner(
                props.owner,
                secret.value,
                confirmation.value,
            );
            if (operation !== generation) return;
            recoveryCode.value = code;
            secret.value = "";
            confirmation.value = "";
            hasKey.value = true;
        }
    } catch (reason) {
        const message = reason instanceof Error ? reason.message : "";
        error.value = hasKey.value
            ? "Frasa sandi atau kode pemulihan salah, atau kunci perangkat berubah. Data tetap tersimpan."
            : /^(Pendaftaran|Konfirmasi|Sesi|Frasa sandi)/.test(message)
              ? message
              : "Pendaftaran kunci belum berhasil. Data perangkat tetap tersimpan.";
    } finally {
        busy.value = false;
    }
}
async function finishEnrollment() {
    if (busy.value) return;
    const owner = props.owner;
    const operation = generation;
    const isCurrent = () => owner === props.owner && operation === generation;
    busy.value = true;
    error.value = "";
    try {
        if (!isolatedEncryptionFixture()) await confirmClinicalRecovery(owner);
        if (!isCurrent()) { clearSecrets(); return; }
        clearSecrets();
        emit("unlocked");
    } catch {
        clearSecrets();
        if (!isCurrent()) return;
        await load();
        if (!isCurrent()) { clearSecrets(); return; }
        error.value = "Konfirmasi belum selesai. Periksa status kunci lalu lanjutkan dengan frasa sandi.";
    } finally { busy.value = false; }
}
onMounted(load);
watch(() => props.owner, (_owner, previous) => {
    abandonPendingEnrollment(previous);
    generation++;
    clearSecrets();
    purpose.value = "passphrase";
    void load();
}, { flush: "sync" });
watch(clinicalKeyVersion, () => { if (!clinicalKeyReady(props.owner)) { generation++; clearSecrets(); } }, { flush: "sync" });
onUnmounted(() => { generation++; clearSecrets(); abandonPendingEnrollment(props.owner); });
</script>
