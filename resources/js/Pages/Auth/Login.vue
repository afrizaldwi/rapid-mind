<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4">
          <img src="/logo.png?v=3" alt="RAPID-MIND Logo" class="w-20 h-20 object-contain drop-shadow-md" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          RAPID-MIND
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Sistem Pendukung Keputusan Respons Kesehatan Jiwa Bencana
        </p>
      </div>

      <!-- Alert if there are errors -->
      <div
        v-if="errorMessage"
        class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3"
      >
        <span class="text-lg leading-none">⚠️</span>
        <div class="flex-1 font-medium">
          {{ errorMessage }}
        </div>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="submit">
        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-semibold text-slate-700">
              Email atau Username
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="form.email"
                type="text"
                autocomplete="username"
                required
                placeholder="nama@rapidmind.id"
                class="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-base"
                :disabled="loading"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-semibold text-slate-700">
              Kata Sandi
            </label>
            <div class="mt-1 relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-base"
                :disabled="loading"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-60 transition"
          >
            <span v-if="loading">Memeriksa akses…</span>
            <span v-else>MASUK</span>
          </button>
        </div>
      </form>

      <!-- Demo Accounts Helper Drawer -->
      <div class="mt-6 pt-6 border-t border-slate-200">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
          Akun Demo Cepat
        </p>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            class="px-2 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-700 transition"
            @click="quickFill('relawan@rapidmind.id')"
          >
            Relawan
          </button>
          <button
            type="button"
            class="px-2 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-700 transition"
            @click="quickFill('nakes@rapidmind.id')"
          >
            Healthcare
          </button>
          <button
            type="button"
            class="px-2 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-700 transition"
            @click="quickFill('admin@rapidmind.id')"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import { lockRelawanContinuity, recordVerifiedRelawan, type VerifiedRelawan } from '@/offline/relawanContinuity';

const form = ref({
  email: '',
  password: '',
});

const loading = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');

function quickFill(email: string) {
  form.value.email = email;
  form.value.password = 'password';
  errorMessage.value = '';
}

function submit() {
  loading.value = true;
  errorMessage.value = '';

  router.post('/login', form.value, {
    onSuccess: (page) => {
      const user = (page.props.auth as { user?: VerifiedRelawan | null } | undefined)?.user;
      if (user?.role === 'RELAWAN') void recordVerifiedRelawan(user, true)
        .then(() => window.dispatchEvent(new Event('rapid-mind:verified-login')))
        .catch(() => {});
      else if (user) void lockRelawanContinuity().catch(() => {});
    },
    onError: (errors) => {
      errorMessage.value = errors.email || errors.auth || errors.access || 'Gagal masuk. Periksa kembali koneksi atau kredensial Anda.';
      loading.value = false;
    },
    onFinish: () => {
      loading.value = false;
    },
  });
}
</script>
