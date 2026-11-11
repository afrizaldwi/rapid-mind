<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      <div class="flex justify-end">
        <div class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold shadow-2xs select-none">
          <button
            type="button"
            class="flex items-center gap-1 rounded-md px-2 py-1 transition cursor-pointer"
            :class="!isEn ? 'bg-teal-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'"
            @click="changeLang('id')"
            title="Bahasa Indonesia"
          >
            <span>🇮🇩</span><span>ID</span>
          </button>
          <span class="text-slate-300 mx-0.5">|</span>
          <button
            type="button"
            class="flex items-center gap-1 rounded-md px-2 py-1 transition cursor-pointer"
            :class="isEn ? 'bg-teal-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'"
            @click="changeLang('en')"
            title="English"
          >
            <span>🇬🇧</span><span>EN</span>
          </button>
        </div>
      </div>
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4">
          <img src="/logo.png?v=3" alt="RAPID-MIND Logo" class="w-20 h-20 object-contain drop-shadow-md" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          RAPID-MIND
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          {{ $t('common.appSubtitle', 'Sistem Pendukung Keputusan Respons Kesehatan Jiwa Bencana') }}
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
              {{ $t('auth.emailOrUsername', 'Email atau Username') }}
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="form.email"
                type="text"
                autocomplete="username"
                required
                :placeholder="$t('auth.emailPlaceholder', 'nama@rapidmind.id')"
                class="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-base"
                :disabled="loading"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-semibold text-slate-700">
              {{ $t('auth.password', 'Kata Sandi') }}
            </label>
            <div class="mt-1 relative">
              <input
                id="password"
                ref="passwordInput"
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
                {{ showPassword ? $t('auth.hidePassword', 'Sembunyikan') : $t('auth.showPassword', 'Tampilkan') }}
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
            <span v-if="loading">{{ $t('auth.checkingAccess', 'Memeriksa akses…') }}</span>
            <span v-else>{{ $t('auth.submitLogin', 'MASUK') }}</span>
          </button>
        </div>
      </form>

      <DemoLoginAccounts :accounts="demoAccounts" :disabled="loading" @select="quickFill" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import DemoLoginAccounts, { type DemoLoginAccount } from '@/components/DemoLoginAccounts.vue';
import { router } from '@inertiajs/vue3';
import { lockRelawanContinuity, recordVerifiedRelawan, type VerifiedRelawan } from '@/offline/relawanContinuity';

withDefaults(defineProps<{ demoAccounts?: DemoLoginAccount[] }>(), { demoAccounts: () => [] });
const passwordInput = ref<HTMLInputElement | null>(null);
const localIsEn = ref(typeof window !== 'undefined' ? window.localStorage?.getItem('rapid_mind_locale') === 'en' : false);
const isEn = computed(() => {
  const globalLocale = (globalThis as any)?.__rapidMindLocale;
  if (globalLocale && typeof globalLocale === 'object' && 'value' in globalLocale) {
    return globalLocale.value === 'en';
  }
  return localIsEn.value;
});

onMounted(() => {
  try {
    const saved = window.localStorage?.getItem('rapid_mind_locale');
    if (saved === 'en' || saved === 'id') {
      localIsEn.value = saved === 'en';
      const setFn = (globalThis as any)?.__rapidMindSetLocale;
      if (typeof setFn === 'function') setFn(saved);
    }
  } catch {}
});

function changeLang(lang: 'id' | 'en') {
  localIsEn.value = lang === 'en';
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('rapid_mind_locale', lang);
      const setFn = (globalThis as any)?.__rapidMindSetLocale;
      if (typeof setFn === 'function') setFn(lang);
    }
  } catch {}
}

function $t(key: string, fallback?: string): string {
  try {
    const fn = (globalThis as any)?.__rapidMindT;
    return typeof fn === 'function' ? fn(key, fallback) : (fallback ?? key);
  } catch {
    return fallback ?? key;
  }
}

function $loc(message: string): string {
  try {
    const fn = (globalThis as any)?.__rapidMindLocalize;
    return typeof fn === 'function' ? fn(message) : message;
  } catch {
    return message;
  }
}

const form = ref({
  email: '',
  password: '',
});

const loading = ref(false);
const showPassword = ref(false);
const rawErrorMessage = ref('');
const errorMessage = computed(() => {
  if (!rawErrorMessage.value) return '';
  if (rawErrorMessage.value === '__LOGIN_FAILED__') {
    return $t('auth.loginFailed', 'Gagal masuk. Periksa kembali koneksi atau kredensial Anda.');
  }
  return $loc(rawErrorMessage.value);
});

function quickFill(email: string) {
  form.value.email = email;
  form.value.password = '';
  showPassword.value = false;
  void nextTick(() => passwordInput.value?.focus());
  rawErrorMessage.value = '';
}

function submit() {
  loading.value = true;
  rawErrorMessage.value = '';

  router.post('/login', form.value, {
    onSuccess: (page) => {
      const user = (page.props.auth as { user?: VerifiedRelawan | null } | undefined)?.user;
      if (user?.role === 'RELAWAN') void recordVerifiedRelawan(user, true)
        .then(() => window.dispatchEvent(new Event('rapid-mind:verified-login')))
        .catch(() => {});
      else if (user) void lockRelawanContinuity().catch(() => {});
    },
    onError: (errors) => {
      rawErrorMessage.value = errors.email || errors.auth || errors.access || '__LOGIN_FAILED__';
      loading.value = false;
    },
    onFinish: () => {
      loading.value = false;
    },
  });
}
</script>
