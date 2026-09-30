<template>
  <RelawanLayout>
    <div class="space-y-6 pb-64">
      <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
          Bagian C: Keberfungsian Harian
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          Evaluasi Keberfungsian di Posko
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ patient?.name }} • Adaptasi WHODAS: Pilih kondisi yang paling menggambarkan aktivitas penyintas 3 hari terakhir.
        </p>
      </div>

      <div class="space-y-5">
        <div
          v-for="d in domains"
          :key="d.code"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-semibold text-slate-900 text-base leading-snug">
              {{ d.code }}. {{ d.title }}
            </h3>
            <span
              class="shrink-0 text-xs font-bold px-2 py-1 rounded-md"
              :class="[0, 1, 3].includes(functions[d.code]) ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ [0, 1, 3].includes(functions[d.code]) ? '✓ Terpilih' : 'Belum dipilih' }}
            </span>
          </div>

          <div class="space-y-2">
            <button
              v-for="opt in d.options"
              :key="opt.level"
              type="button"
              @click="setFunctionLevel(d.code, opt.level)"
              :aria-pressed="functions[d.code] === opt.level"
              class="w-full min-h-[64px] text-left p-4 rounded-xl border-2 transition flex items-start gap-3"
              :class="functions[d.code] === opt.level
                ? 'border-teal-700 bg-teal-50 text-teal-950 ring-1 ring-teal-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'"
            >
              <span
                class="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                :class="functions[d.code] === opt.level ? 'border-teal-700' : 'border-slate-400'"
                aria-hidden="true"
              >
                <span v-if="functions[d.code] === opt.level" class="w-2.5 h-2.5 rounded-full bg-teal-700"></span>
              </span>
              <span class="flex-1">
                <span class="block text-sm font-medium leading-relaxed">{{ opt.label }}</span>
                <span class="block mt-1 text-xs font-semibold">{{ opt.level }} poin</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Functional Impairment Safety Warning if >= 6 -->
      <div
        v-if="functionScore !== null && functionScore >= 6"
        class="bg-orange-50 border-2 border-orange-400 p-4 rounded-xl text-orange-950 text-xs font-semibold space-y-1"
      >
        <span class="text-base">⚠️</span>
        <p>
          Skor disabilitas fungsi harian penyintas mencapai {{ functionScore }} poin (≥ 6). Sistem akan merekomendasikan kategori <strong>T1 (Prioritas Pemeriksaan Dokter / Tenaga Medis)</strong>.
        </p>
      </div>

      <!-- Sticky Bottom Navigation Bar -->
      <div data-assessment-action-bar class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link
            :href="`/relawan/assessment/${assessment.id}/risk`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            @click="saveAndNext"
            :disabled="isSaving || !draftReady || answeredCount !== 3"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60"
          >
            Tinjau & Ringkasan Asesmen →
          </button>
        </div>
        <p v-if="answeredCount !== 3" class="mt-2 text-xs text-slate-600">Lengkapi semua jawaban sebelum melanjutkan ({{ answeredCount }}/3).</p>
        <p v-if="draftWarning" role="alert" class="mt-2 text-xs font-semibold text-amber-900">{{ draftWarning }}</p>
        <p v-if="saveError" role="alert" class="mt-2 text-xs font-semibold text-red-800">{{ saveError }}</p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { mergeAssessmentDraft, readAssessmentDraft, saveAssessmentDraft, clearSavedAssessmentDraft } from '@/offline/assessmentDraft';

const props = defineProps<{
  assessment: any;
  patient: any;
  functions?: Record<string, number>;
}>();

const functions = ref<Record<string, number>>(mergeAssessmentDraft('function_domains', props.functions, {}));
const isSaving = ref(false);
const saveError = ref('');
const draftWarning = ref('');
const draftReady = ref(false);
const editedKeys = new Set<string>();
const answeredCount = computed(() => ['F1', 'F2', 'F3'].filter(code => [0, 1, 3].includes(functions.value[code])).length);

const domains = [
  {
    code: 'F1',
    title: 'Perawatan Diri (Self-Care)',
    options: [
      { level: 0, label: 'Mandiri merawat diri, makan, minum, dan ganti pakaian tanpa dorongan.' },
      { level: 1, label: 'Butuh diingatkan / diarahkan berulang kali oleh keluarga/relawan.' },
      { level: 3, label: 'Menolak total / tidak mampu merawat diri sama sekali.' },
    ],
  },
  {
    code: 'F2',
    title: 'Fungsi Peran & Sosial',
    options: [
      { level: 0, label: 'Mampu berinteraksi wajar dan membantu keluarga/sesama pengungsi.' },
      { level: 1, label: 'Menarik diri, mengurung diri di tenda, enggan diajak bicara.' },
      { level: 3, label: 'Memusuhi, agresif, atau mutisme total (tidak merespons orang).' },
    ],
  },
  {
    code: 'F3',
    title: 'Akses Kebutuhan & Bantuan',
    options: [
      { level: 0, label: 'Aktif dan mampu mengurus kebutuhan posko / antre logistik.' },
      { level: 1, label: 'Pasif, hanya menunggu orang lain membawakan logistik.' },
      { level: 3, label: 'Bingung total / linglung parah, tersesat di sekitar posko.' },
    ],
  },
];

const functionScore = computed(() => {
  if (answeredCount.value !== 3) return null;
  return functions.value.F1 + functions.value.F2 + functions.value.F3;
});


function setFunctionLevel(code: string, level: number) {
  functions.value[code] = level;
  editedKeys.add(code);
  void persistDraft();
}


async function persistDraft() {
  try {
    await saveAssessmentDraft(props.assessment, 'function_domains', functions.value);
    draftWarning.value = '';
  } catch {
    draftWarning.value = 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

onMounted(async () => {
  try {
    const local = await readAssessmentDraft(props.assessment.id, 'function_domains');
    const merged = mergeAssessmentDraft('function_domains', functions.value, local);
    for (const [key, value] of Object.entries(merged)) {
      if (!editedKeys.has(key)) (functions.value as Record<string, typeof value>)[key] = value;
    }
  } catch {
    draftWarning.value = 'Draf lokal tidak dapat dibaca. Jawaban yang sudah tersimpan di server tetap ditampilkan.';
  } finally {
    draftReady.value = true;
  }
});

async function saveAndNext() {
  if (isSaving.value || !draftReady.value) return;
  if (answeredCount.value !== 3) {
    saveError.value = 'Lengkapi semua jawaban sebelum melanjutkan.';
    return;
  }
  isSaving.value = true;
  saveError.value = '';
  const savedAnswers = { ...functions.value };
  try {
    const response = await fetch(`/relawan/assessment/${props.assessment.id}/function`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
      },
      body: JSON.stringify({ functions: savedAnswers }),
    });
    if (!response.ok) throw new Error('Simpan gagal');
    try {
      await clearSavedAssessmentDraft(props.assessment.id, 'function_domains', savedAnswers);
    } catch {
      draftWarning.value = 'Jawaban tersimpan di server, tetapi draf lokal belum dapat dibersihkan.';
    }
    router.visit(`/relawan/assessment/${props.assessment.id}/review`);
  } catch {
    saveError.value = 'Fungsi harian belum tersimpan di server. Periksa koneksi atau jawaban, lalu coba lagi.';
  } finally {
    isSaving.value = false;
  }
}
</script>
