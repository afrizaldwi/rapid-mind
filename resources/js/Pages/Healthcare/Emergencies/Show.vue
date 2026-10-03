<template>
  <HealthcareLayout>
    <div class="space-y-6 max-w-5xl">
      <!-- Back Link & Incident Header -->
      <div class="flex items-center justify-between">
        <Link
          href="/healthcare/emergencies"
          class="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1"
        >
          <span>← Kembali ke Antrean Kasus</span>
        </Link>
        <Badge :variant="emergency.status === 'PENDING' ? 't0' : 'warning'">
          Status: {{ emergency.status }}
        </Badge>
      </div>

      <div
        v-if="actionErrors.length"
        role="alert"
        class="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950"
      >
        <p class="font-extrabold">Tindakan belum dapat diproses</p>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          <li v-for="error in actionErrors" :key="error.key">
            {{ error.message }}
          </li>
        </ul>
      </div>

      <!-- Main Emergency Summary Card -->
      <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-md bg-red-100 text-red-900 border border-red-200">
              🚨 {{ formatRedFlag(emergency.red_flag_type) }}
            </span>
            <h2 class="text-2xl font-black text-slate-900 mt-2">
              {{ emergency.patient?.name || 'Penyintas Tanpa Nama' }}
            </h2>
            <p class="text-xs text-slate-500">
              NIK: {{ emergency.patient?.nik || 'Tidak tercatat' }} • Usia: {{ emergency.patient?.age || '-' }} th • {{ emergency.patient?.gender || '-' }}
            </p>
          </div>

          <div class="text-right text-xs">
            <span class="text-slate-500 block">Waktu Sinyal SOS:</span>
            <span class="font-extrabold text-slate-800 text-sm">
              {{ new Date(emergency.created_at).toLocaleTimeString('id-ID') }} WIB
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Posko Lapangan</span>
            <span class="font-bold text-slate-800">{{ emergency.shelter?.name || 'Posko tidak diketahui' }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Relawan Pelapor</span>
            <span class="font-bold text-slate-800">{{ emergency.user?.name || 'Relawan' }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Koordinat GPS</span>
            <span class="font-bold text-slate-800">
              {{ formatCoordinates(emergency.latitude, emergency.longitude) }}
            </span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Status Triase Awal</span>
            <span class="font-bold text-red-700">T0-Suspect (Darurat)</span>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p class="font-bold text-slate-900">Kontak Relawan Pelapor</p>
          <p class="text-slate-600">{{ emergency.user?.name || 'Relawan tidak tercatat' }}</p>
          <template v-if="emergency.user?.phone_number">
            <p class="mt-1 text-slate-700">{{ emergency.user.phone_number }}</p>
            <a :href="`tel:${emergency.user.phone_number}`" class="mt-2 inline-block rounded-xl bg-teal-800 px-4 py-2 font-bold text-white">Hubungi Relawan</a>
            <p class="mt-2 text-xs text-slate-500">Panggilan dibuka melalui perangkat Anda. Simpan metode verifikasi secara terpisah setelah menghubungi Relawan.</p>
          </template>
          <p v-else class="mt-1 text-slate-500">Nomor telepon Relawan belum tersedia. Gunakan jalur koordinasi operasional lain.</p>
        </div>

        <div v-if="emergency.notes" class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
          <span class="font-bold text-slate-900 block">Catatan Observasi Lapangan:</span>
          <p class="italic">"{{ emergency.notes }}"</p>
        </div>
      </div>

      <!-- Action Step 1: Acknowledge Incident -->
      <div v-if="emergency.status === 'PENDING'" class="bg-red-50 border-2 border-red-400 p-6 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <h3 class="font-extrabold text-red-950 text-base">
            Langkah 1: Akui Kasus Darurat (Acknowledge)
          </h3>
          <p class="text-xs text-red-800 mt-1 max-w-xl">
            Membuka atau melihat kasus tidak sama dengan mengakui. Tekan tombol di bawah untuk memberitahu relawan di posko bahwa tim medis sedang meninjau kasus ini.
          </p>
        </div>

        <button
          type="button"
          :disabled="isSubmitting"
          @click="acknowledgeCase"
          class="px-6 py-3.5 bg-red-800 hover:bg-red-900 text-white font-black text-sm rounded-xl shadow-md transition"
        >
          AKUI KASUS SEKARANG
        </button>
      </div>

      <!-- Action Step 2: Secondary Tele-Verification -->
      <div v-if="emergency.status === 'ACKNOWLEDGED'" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="font-extrabold text-slate-900 text-base">
              Langkah 2: Verifikasi Sekunder Tenaga Medis
            </h3>
            <p class="text-xs text-slate-500">
              Lakukan tele-konsultasi dengan relawan di tempat atau dokter jaga posko.
            </p>
          </div>
          <span class="text-2xl">📞</span>
        </div>

        <form @submit.prevent="submitVerification" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Metode Verifikasi:
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                type="button"
                @click="verificationForm.method = 'PHONE'"
                class="p-3 rounded-xl border text-xs font-bold transition"
                :class="verificationForm.method === 'PHONE' ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
              >
                📞 Panggilan Telepon
              </button>
              <button
                type="button"
                @click="verificationForm.method = 'VIDEO'"
                class="p-3 rounded-xl border text-xs font-bold transition"
                :class="verificationForm.method === 'VIDEO' ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
              >
                📹 Video Call
              </button>
              <button
                type="button"
                @click="verificationForm.method = 'FIELD_TEAM'"
                class="p-3 rounded-xl border text-xs font-bold transition"
                :class="verificationForm.method === 'FIELD_TEAM' ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
              >
                🚑 Tim Lapangan Langsung
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Catatan Hasil Verifikasi Klinis:
            </label>
            <textarea
              v-model="verificationForm.notes"
              rows="2"
              placeholder="Contoh: Terkonfirmasi agitasi psikomotor aktif, tidak kooperatif, keluarga mendampingi..."
              class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-700 focus:outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Simpan Verifikasi Sekunder
          </button>
        </form>
      </div>

      <!-- Action Step 3: Clinical Decision Gate -->
      <div v-if="emergency.status === 'REVIEWING'" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="font-extrabold text-slate-900 text-base">
              Langkah 3: Keputusan Klasifikasi Klinis Dokter
            </h3>
            <p class="text-xs text-slate-500">
              Konfirmasi T0 atau dukung penurunan (downgrade) ke T1 / T2.
            </p>
          </div>
          <span class="text-2xl">⚖️</span>
        </div>

        <form @submit.prevent="submitClassification" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              @click="decisionForm.clinical_result = 'T0_CONFIRMED'"
              class="p-4 rounded-2xl border-2 text-left transition"
              :class="decisionForm.clinical_result === 'T0_CONFIRMED' ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-2 ring-red-500/20' : 'border-slate-200 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase text-red-800">T0 Terkonfirmasi</span>
                <span v-if="decisionForm.clinical_result === 'T0_CONFIRMED'">✓</span>
              </div>
              <p class="text-xs font-medium text-slate-600 mt-1">
                Krisis akut. Butuh evakuasi segera ke RS Rujukan / PSC 119.
              </p>
            </button>

            <button
              type="button"
              @click="decisionForm.clinical_result = 'T1'"
              class="p-4 rounded-2xl border-2 text-left transition"
              :class="decisionForm.clinical_result === 'T1' ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold ring-2 ring-orange-500/20' : 'border-slate-200 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase text-orange-800">Diturunkan ke T1</span>
                <span v-if="decisionForm.clinical_result === 'T1'">✓</span>
              </div>
              <p class="text-xs font-medium text-slate-600 mt-1">
                Bukan ancaman nyawa langsung, butuh rawat jalan pos medis.
              </p>
            </button>

            <button
              type="button"
              @click="decisionForm.clinical_result = 'T2'"
              class="p-4 rounded-2xl border-2 text-left transition"
              :class="decisionForm.clinical_result === 'T2' ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20' : 'border-slate-200 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase text-amber-800">Diturunkan ke T2</span>
                <span v-if="decisionForm.clinical_result === 'T2'">✓</span>
              </div>
              <p class="text-xs font-medium text-slate-600 mt-1">
                Distres sedang terkendali, cukup pendampingan psikososial.
              </p>
            </button>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Catatan Justifikasi Klinis:
            </label>
            <textarea
              v-model="decisionForm.notes"
              rows="2"
              placeholder="Alasan klinis penegakan diagnosis atau dasar penurunan kategori..."
              class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-700 focus:outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full py-3.5 px-4 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-sm rounded-xl shadow-md transition"
          >
            SIMPAN KEPUTUSAN KLINIS
          </button>
        </form>
      </div>

      <div v-if="emergency.status === 'CONFIRMED'" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 class="font-extrabold text-slate-900 text-base">Tindak Lanjut Darurat</h3>
          <p class="mt-1 text-xs text-slate-600">T0 telah dikonfirmasi.</p>
        </div>

        <template v-if="emergency.referrals?.length">
          <div class="rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs">
            <p class="font-bold text-teal-950">Rujukan telah tercatat</p>
            <p class="mt-1 text-teal-900">Tujuan: {{ emergency.referrals[0].facility?.name || 'Faskes tidak tersedia' }}</p>
            <p class="mt-1 text-teal-900">Status: {{ formatReferralStatus(emergency.referrals[0].status) }}</p>
          </div>
        </template>

        <form v-else @submit.prevent="submitReferral" class="space-y-3">
          <p class="text-xs text-slate-600">Belum ada rujukan yang tercatat.</p>
          <div>
            <label class="mb-1 block text-xs font-bold text-slate-700">Faskes tujuan rujukan</label>
            <select v-model="referralForm.facility_id" required class="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800">
              <option :value="null" disabled>Pilih Faskes aktif</option>
              <option v-for="f in facilities" :key="f.id" :value="f.id">{{ f.name }} ({{ f.type }})</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-bold text-slate-700">Catatan rujukan (opsional)</label>
            <textarea v-model="referralForm.notes" rows="2" class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-700 focus:outline-none"></textarea>
          </div>
          <button type="submit" :disabled="isSubmitting || !referralForm.facility_id" class="rounded-xl bg-teal-800 px-5 py-3 text-xs font-extrabold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50">
            BUAT RUJUKAN
          </button>
        </form>
      </div>

      <!-- Verification History & Referrals -->
      <div v-if="emergency.verifications && emergency.verifications.length > 0" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 class="font-bold text-slate-800 text-sm">
          Riwayat Verifikasi & Audit Tim Medis
        </h3>
        <div class="space-y-2">
          <div
            v-for="v in emergency.verifications"
            :key="v.id"
            class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
          >
            <div>
              <span class="font-bold text-slate-800">Oleh: {{ v.verifier?.name || 'Dokter Jaga' }}</span>
              <span class="text-slate-500 ml-2">({{ v.method || 'Verifikasi' }})</span>
              <p v-if="v.notes" class="text-slate-600 mt-0.5">"{{ v.notes }}"</p>
            </div>
            <span class="text-slate-400 text-[11px]">
              {{ new Date(v.created_at).toLocaleTimeString('id-ID') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { formatReferralStatus } from '@/lib/referralStatus';

const props = defineProps<{
  emergency: any;
  facilities?: any[];
}>();

const isSubmitting = ref(false);
const page = usePage();
const actionErrors = computed(() => Object.entries(page.props.errors ?? {}).map(([key, message]) => ({
  key,
  message: String(message),
})));

const verificationForm = ref({
  method: 'PHONE',
  notes: '',
});

const decisionForm = ref({
  clinical_result: 'T0_CONFIRMED',
  notes: '',
});

const referralForm = ref({
  facility_id: props.facilities?.[0]?.id ?? null,
  notes: '',
});

function acknowledgeCase() {
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${props.emergency.id}/acknowledge`, {}, {
    onFinish: () => (isSubmitting.value = false),
  });
}

function submitVerification() {
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${props.emergency.id}/verify`, verificationForm.value, {
    onFinish: () => (isSubmitting.value = false),
  });
}

function submitClassification() {
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${props.emergency.id}/classify`, decisionForm.value, {
    onFinish: () => (isSubmitting.value = false),
  });
}

function submitReferral() {
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${props.emergency.id}/referrals`, referralForm.value, {
    onFinish: () => (isSubmitting.value = false),
  });
}

function formatRedFlag(rf?: string) {
  switch (rf) {
    case 'SUICIDAL_IDEATION':
      return 'Ideasi / Perilaku Bunuh Diri (SRQ Q17)';
    case 'PSYCHOSIS':
      return 'Psikosis Akut / Disosiasi Berat';
    case 'SEVERE_AGITATION':
      return 'Amuk / Agitasi Fisik Parah';
    default:
      return 'Kegawatdaruratan Medis & Somatik';
  }
}

function formatCoordinates(latitude: unknown, longitude: unknown): string {
  const latitudeNumber = parseCoordinate(latitude);
  const longitudeNumber = parseCoordinate(longitude);

  if (latitudeNumber === null || longitudeNumber === null) {
    return 'Sesuai Posko';
  }

  return `${latitudeNumber.toFixed(4)}, ${longitudeNumber.toFixed(4)}`;
}

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}
</script>
