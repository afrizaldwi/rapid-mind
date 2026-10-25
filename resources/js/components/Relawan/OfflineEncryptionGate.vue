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
        <form
            v-else-if="!recoveryCode"
            class="mt-4 space-y-3"
            @submit.prevent="submit"
        >
            <label v-if="hasKey" class="block text-sm font-medium">
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
            <button
                :disabled="busy"
                type="submit"
                class="rounded bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
                {{
                    busy
                        ? "Memproses…"
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
                @click="finishEnrollment"
            >
                Saya sudah menyimpan kode
            </button>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
    enrollIsolatedOwner,
    enrollmentState,
    unlockIsolatedOwner,
} from "@/offline/offlineKeyWorkflow";

const props = defineProps<{ owner: number }>();
const emit = defineEmits<{ unlocked: [] }>();
const loading = ref(true);
const busy = ref(false);
const hasKey = ref(false);
const purpose = ref<"passphrase" | "recovery">("passphrase");
const secret = ref("");
const confirmation = ref("");
const recoveryCode = ref("");
const error = ref("");

async function load() {
    loading.value = true;
    error.value = "";
    try {
        hasKey.value = (await enrollmentState(props.owner)) === "EXISTING";
    } catch {
        error.value = "Kunci perangkat belum dapat diperiksa.";
    } finally {
        loading.value = false;
    }
}
async function submit() {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    try {
        if (hasKey.value) {
            await unlockIsolatedOwner(props.owner, secret.value, purpose.value);
            secret.value = "";
            emit("unlocked");
        } else {
            recoveryCode.value = await enrollIsolatedOwner(
                props.owner,
                secret.value,
                confirmation.value,
            );
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
function finishEnrollment() {
    recoveryCode.value = "";
    emit("unlocked");
}
onMounted(load);
watch(() => props.owner, load);
</script>
