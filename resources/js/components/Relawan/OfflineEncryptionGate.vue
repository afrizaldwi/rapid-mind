<template>
    <section
        class="rm-app mx-auto my-6 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 sm:p-6 text-slate-900"
        aria-labelledby="offline-key-title"
    >
        <h1 id="offline-key-title" class="text-lg font-bold">
            {{ isEn ? "Open clinical data" : "Buka data klinis" }}
        </h1>
        <p class="mt-2 text-sm text-slate-700">
            {{
                hasKey
                    ? (isEn ? "Patient data is encrypted. Enter your offline passphrase to continue." : "Data pasien terlindungi enkripsi. Masukkan frasa sandi offline untuk melanjutkan.")
                    : (isEn ? "Enroll key only after Volunteer session is verified through the server." : "Daftarkan kunci hanya setelah sesi Relawan terverifikasi melalui server.")
            }}
        </p>
        <p v-if="loading" role="status" class="mt-4">
            {{ isEn ? "Checking device key…" : "Memeriksa kunci perangkat…" }}
        </p>
        <p v-else-if="blocked" role="alert" class="mt-4 text-sm">{{ blocked }}</p>
        <form
            v-else-if="!recoveryCode"
            class="mt-4 space-y-3"
            @submit.prevent="submit"
        >
            <label class="block text-sm font-medium">
                {{
                    hasKey && purpose === "recovery"
                        ? (isEn ? "Recovery code" : "Kode pemulihan")
                        : (isEn ? "Offline passphrase" : "Frasa sandi offline")
                }}
                <input
                    v-model="secret"
                    :type="purpose === 'recovery' ? 'text' : 'password'"
                    autocomplete="off"
                    :aria-describedby="purpose === 'passphrase' ? 'offline-phrase-help' : undefined"
                    :minlength="!hasKey ? 20 : undefined"
                    class="mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    required
                />
            </label>
            <p v-if="purpose === 'passphrase'" id="offline-phrase-help" class="text-sm leading-relaxed text-slate-700">
                {{ !hasKey
                    ? (isEn ? 'Create your own phrase using several unrelated words, at least 20 characters in total. Spaces are allowed; special symbols are not required. Do not use your account password or a shared example.' : 'Buat frasa pribadi dari beberapa kata yang tidak saling berkaitan, total minimal 20 karakter. Boleh memakai spasi; tidak wajib simbol khusus. Jangan gunakan sandi akun atau contoh yang dipakai bersama.')
                    : (isEn ? 'Enter the phrase you created on this device. Creating a different phrase here cannot open an existing key. This is separate from your login password.' : 'Masukkan frasa yang Anda buat di perangkat ini. Membuat frasa berbeda di sini tidak akan membuka kunci yang sudah ada. Frasa ini terpisah dari sandi login.') }}
            </p>
            <label v-if="!hasKey" class="block text-sm font-medium">
                {{ isEn ? "Repeat passphrase" : "Ulangi frasa sandi" }}
                <input
                    v-model="confirmation"
                    type="password"
                    autocomplete="off"
                    class="mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    required
                />
            </label>
            <p v-if="error" role="alert" class="text-sm text-red-800">
                {{ error }}
            </p>
            <p v-if="pendingEnrollment" class="text-sm">
                {{
                    isEn
                        ? "Enrollment is not complete. With your passphrase and server verification, generate a replacement recovery code for the same key. The previous code will become invalid."
                        : "Pendaftaran belum selesai. Dengan frasa sandi dan verifikasi server, buat kode pemulihan pengganti untuk kunci yang sama. Kode sebelumnya akan tidak berlaku."
                }}
            </p>
            <button
                :disabled="busy"
                type="submit"
                class="min-h-11 w-full rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50"
            >
                {{
                    busy
                        ? (isEn ? "Processing…" : "Memproses…")
                        : pendingEnrollment
                          ? (isEn ? "Create replacement recovery code" : "Buat kode pemulihan pengganti")
                          : hasKey
                          ? (isEn ? "Unlock data" : "Buka data")
                          : (isEn ? "Register key" : "Daftarkan kunci")
                }}
            </button>
            <button v-if="hasKey && !pendingEnrollment" type="button"
                class="min-h-11 text-left text-sm font-semibold text-teal-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                :disabled="busy" :aria-pressed="purpose === 'recovery'" @click="switchPurpose">
                {{ purpose === 'passphrase'
                    ? (isEn ? 'Forgot passphrase / Use recovery code' : 'Lupa frasa sandi / Gunakan kode pemulihan')
                    : (isEn ? 'Use passphrase' : 'Gunakan frasa sandi') }}
            </button>
        </form>
        <div v-else class="mt-4 space-y-3">
            <p class="text-sm font-semibold">
                {{ isEn ? "Save this recovery code now. The code is shown once." : "Simpan kode pemulihan ini sekarang. Kode ditampilkan satu kali." }}
            </p>
            <output
                class="block break-all rounded bg-slate-100 p-3 font-mono text-sm"
                >{{ recoveryCode }}</output
            >
            <p class="text-sm">
                {{
                    isEn
                        ? "Store it securely outside this device. Do not send via messaging or screenshots. If both passphrase and recovery code are lost, offline data cannot be recovered."
                        : "Simpan di tempat aman di luar perangkat ini. Jangan kirim melalui pesan atau foto layar. Jika frasa sandi dan kode ini hilang, data offline tidak dapat dipulihkan."
                }}
            </p>
            <button
                type="button"
                class="rounded bg-teal-700 px-4 py-2 font-semibold text-white"
                :disabled="busy"
                @click="finishEnrollment"
            >
                {{ isEn ? "I have saved the code" : "Saya sudah menyimpan kode" }}
            </button>
        </div>
        <p v-if="recoveryCode && error" role="alert" class="mt-3 text-sm text-red-800">{{ error }}</p>
        <p class="mt-4 text-sm">
            {{
                isEn
                    ? "If both passphrase and recovery code are lost, logging into the server cannot recover the local data key."
                    : "Jika frasa sandi dan kode pemulihan hilang, masuk ke server tidak dapat memulihkan kunci data lokal."
            }}
        </p>
        <LockedEmergencyGuidance />
        <slot name="actions" />
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import LockedEmergencyGuidance from "./LockedEmergencyGuidance.vue";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const { isEn, locale } = useI18n();
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
type LocalizedMsg = { id: string; en: string } | string;
const rawBlocked = ref<LocalizedMsg>("");
const rawError = ref<LocalizedMsg>("");
const blocked = computed(() =>
    typeof rawBlocked.value === "string"
        ? localizeMessage(rawBlocked.value, locale.value)
        : isEn.value
          ? rawBlocked.value.en
          : rawBlocked.value.id,
);
const error = computed(() =>
    typeof rawError.value === "string"
        ? localizeMessage(rawError.value, locale.value)
        : isEn.value
          ? rawError.value.en
          : rawError.value.id,
);
const pendingEnrollment = ref(false);
let generation = 0;
function clearSecrets() { secret.value = ""; confirmation.value = ""; recoveryCode.value = ""; }

const purpose = ref<"passphrase" | "recovery">("passphrase");
const secret = ref("");
const confirmation = ref("");
const recoveryCode = ref("");
function switchPurpose() {
    secret.value = "";
    rawError.value = "";
    purpose.value = purpose.value === "passphrase" ? "recovery" : "passphrase";
}
async function load() {
    const operation = generation;
    const owner = props.owner;
    loading.value = true;
    rawError.value = "";
    try {
        if (isolatedEncryptionFixture()) {
            const state = await enrollmentState(owner);
            if (operation !== generation) return;
            hasKey.value = state === "EXISTING";
            return;
        }
        const state = await inspectClinicalInitialization(owner);
        if (operation !== generation || owner !== props.owner) return;

        hasKey.value = state !== "FRESH";
        pendingEnrollment.value = state === "ENROLLMENT_PENDING";
        rawBlocked.value = ["FRESH", "ENROLLMENT_PENDING", "ENCRYPTED_LOCKED"].includes(state) ? "" :
            state === "ACTIVATION_DISABLED"
                ? {
                      id: "Pendaftaran enkripsi perangkat belum diizinkan pada lingkungan ini. Hubungi pengelola aplikasi.",
                      en: "Device encryption enrollment is not permitted in this environment yet. Contact the application administrator.",
                  }
                : {
                      id: "Penyimpanan lama, rusak, atau metadata tidak sesuai. Data tetap tersimpan. Minta pemulihan atau reset pengembangan yang disetujui; aplikasi tidak akan menghapusnya otomatis.",
                      en: "Legacy, corrupted, or mismatched metadata storage. Data remains stored. Request recovery or approved reset; the application will not delete it automatically.",
                  };
    } catch {
        rawError.value = {
            id: "Kunci perangkat belum dapat diperiksa.",
            en: "Device key cannot be checked yet.",
        };
    } finally {
        if (operation === generation) loading.value = false;
    }
}
async function submit() {
    if (busy.value) return;
    busy.value = true;
    const operation = generation;
    const owner = props.owner;
    rawError.value = "";
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
        rawError.value = hasKey.value
            ? {
                  id: "Frasa sandi atau kode pemulihan salah, atau kunci perangkat berubah. Data tetap tersimpan.",
                  en: "Incorrect passphrase or recovery code, or device key changed. Data remains preserved.",
              }
            : /^(Pendaftaran|Konfirmasi|Sesi|Frasa sandi)/.test(message)
              ? message
              : {
                    id: "Pendaftaran kunci belum berhasil. Data perangkat tetap tersimpan.",
                    en: "Key enrollment did not succeed. Device data remains preserved.",
                };
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
    rawError.value = "";
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
        rawError.value = {
            id: "Konfirmasi belum selesai. Periksa status kunci lalu lanjutkan dengan frasa sandi.",
            en: "Confirmation is incomplete. Check key status and continue with your passphrase.",
        };
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
