<template>
  <RelawanLayout>
    <div class="space-y-6 pb-24">
      <!-- Top Patient & Progress Sticky Bar -->
      <div class="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 sticky top-16 z-20 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900">
              {{ patient?.name || 'Penyintas' }}
            </h2>
            <p class="text-xs text-slate-500">
              NIK: {{ patient?.nik || 'Tanpa NIK' }}
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              {{ answeredCount }} dari 20 Terjawab
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="bg-teal-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(answeredCount / 20) * 100}%` }"
          ></div>
        </div>

        <!-- Verbal / Non-Verbal Mode & Speech Recognition -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div class="flex items-center space-x-2">
            <span class="font-semibold text-slate-600">Mode:</span>
            <button
              type="button"
              @click="toggleMode"
              class="px-2 py-0.5 rounded-lg border font-bold"
              :class="isVerbal ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-100 text-slate-700 border-slate-300'"
            >
              {{ isVerbal ? '🗣️ Verbal' : '🤝 Adaptif' }}
            </button>
          </div>

          <!-- Web Speech API Assistive Recognition Button -->
          <div v-if="isVerbal">
            <button
              type="button"
              @click="toggleSpeechRecognition"
              class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
              :class="isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'"
            >
              <span>{{ isListening ? '🔴 Mendengarkan…' : '🎤 Bantuan Suara (STT)' }}</span>
            </button>
          </div>
        </div>

        <!-- Voice Live Transcript snippet if listening -->
        <div v-if="isListening && transcriptSnippet" class="p-2 rounded-lg bg-teal-50 text-teal-900 text-xs italic">
          "{{ transcriptSnippet }}"
        </div>
      </div>

      <!-- SRQ-20 Scrollable Question List -->
      <div class="space-y-4">
        <div
          v-for="q in srqQuestions"
          :key="q.number"
          class="bg-white p-5 rounded-2xl border transition"
          :class="answers[q.number] === true ? 'border-teal-400 shadow-xs' : 'border-slate-200 shadow-xs'"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                #{{ String(q.number).padStart(2, '0') }}
              </span>
              <span v-if="q.number === 17" class="text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800">
                ⚠️ Red Flag Gate
              </span>
            </div>
          </div>

          <h3 class="text-base font-bold text-slate-900 mt-2.5 leading-snug">
            {{ q.question }}
          </h3>

          <p class="text-xs text-slate-500 mt-1 italic">
            "{{ q.script }}"
          </p>

          <!-- Large YA / TIDAK Buttons -->
          <div class="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              @click="setAnswer(q.number, true)"
              class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
              :class="answers[q.number] === true
                ? (q.number === 17 ? 'border-red-600 bg-red-600 text-white shadow-md' : 'border-teal-700 bg-teal-700 text-white shadow-md')
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'"
            >
              <span v-if="answers[q.number] === true">✓</span>
              <span>YA</span>
            </button>

            <button
              type="button"
              @click="setAnswer(q.number, false)"
              class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
              :class="answers[q.number] === false
                ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'"
            >
              <span v-if="answers[q.number] === false">✓</span>
              <span>TIDAK</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Navigation: Next to Risk Factors -->
      <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-xl z-20 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link
            href="/relawan/assessment"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            @click="saveAndNext"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition"
          >
            Lanjut: Faktor Risiko ({{ answeredCount }}/20) →
          </button>
        </div>
      </div>
    </div>

    <!-- Potential Red Flag Safety Interruption Modal -->
    <PotentialRedFlag
      :show="showRedFlagModal"
      @escalate="handleEscalate"
      @dismiss="showRedFlagModal = false"
    />

    <!-- T0 Verification Modal -->
    <T0Verification
      :show="showEmergencyVerification"
      :patient-id="patient?.id"
      :patient-name="patient?.name"
      :assessment-id="assessment?.id"
      @close="showEmergencyVerification = false"
    />
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import PotentialRedFlag from '@/components/Relawan/PotentialRedFlag.vue';
import T0Verification from '@/components/Relawan/T0Verification.vue';

const props = defineProps<{
  assessment: any;
  patient: any;
  responses?: Record<number, boolean>;
}>();

const answers = ref<Record<number, boolean>>({ ...(props.responses || {}) });
const isVerbal = ref(props.assessment?.mode === 'VERBAL');
const isListening = ref(false);
const transcriptSnippet = ref('');
const showRedFlagModal = ref(false);
const showEmergencyVerification = ref(false);

const answeredCount = computed(() => {
  return Object.keys(answers.value).length;
});

const srqQuestions = [
  { number: 1, question: 'Apakah sering merasa sakit kepala?', script: 'Selama di posko, kepala terasa berat atau sering cekot-cekot?', keywords: ['pusing', 'sakit kepala', 'cekot', 'berat'] },
  { number: 2, question: 'Apakah nafsu makan menurun?', script: 'Gimana makanannya? Apakah sama sekali malas atau tidak berselera makan?', keywords: ['gak nafsu', 'males makan', 'gak selera'] },
  { number: 3, question: 'Apakah sulit tidur nyenyak?', script: 'Malam hari susah tidur atau sering kebangun karena cemas?', keywords: ['gak bisa tidur', 'insomnia', 'kebangun'] },
  { number: 4, question: 'Apakah mudah merasa takut?', script: 'Belakangan ini gampang kaget atau was-was tiba-tiba?', keywords: ['takut', 'was-was', 'kaget', 'khawatir'] },
  { number: 5, question: 'Apakah tangan terasa gemetar?', script: 'Apakah jari-jari sering gemetar saat pegang barang atau ngobrol?', keywords: ['gemetar', 'gemeter', 'tremor'] },
  { number: 6, question: 'Apakah merasa cemas, tegang, atau khawatir?', script: 'Dada rasanya sering berdebar-debar, tegang, atau ganjel?', keywords: ['cemas', 'tegang', 'deg-degan', 'gelisah'] },
  { number: 7, question: 'Apakah pencernaan terasa buruk?', script: 'Perut mual, melilit, atau diare terutama saat teringat bencana?', keywords: ['mual', 'diare', 'melilit'] },
  { number: 8, question: 'Apakah sulit berpikir jernih?', script: 'Kepala rasanya penuh atau linglung sampai susah fokus?', keywords: ['linglung', 'bingung', 'gak fokus', 'kosong'] },
  { number: 9, question: 'Apakah merasa tidak bahagia?', script: 'Perasaan rasanya sedih dan hampa belakangan ini?', keywords: ['sedih', 'hampa', 'merana'] },
  { number: 10, question: 'Apakah lebih sering menangis?', script: 'Rasanya ingin menangis terus atau mendadak menangis tanpa sebab?', keywords: ['nangis', 'menangis'] },
  { number: 11, question: 'Apakah sulit menikmati kegiatan sehari-hari?', script: 'Hal-hal yang biasa bikin senang sekarang terasa tidak menarik lagi?', keywords: ['gak seru', 'males ngapa-ngapain'] },
  { number: 12, question: 'Apakah kesulitan mengambil keputusan?', script: 'Untuk memutuskan hal sederhana saja rasanya bingung dan berat?', keywords: ['bingung milih', 'gak bisa mutusin'] },
  { number: 13, question: 'Apakah hasil kerja atau tugas posko terganggu?', script: 'Tugas merawat diri atau keluarga terasa terbengkalai?', keywords: ['terbengkalai', 'gak keurus'] },
  { number: 14, question: 'Apakah merasa tidak mampu berbuat hal bermanfaat?', script: 'Merasa diri tidak berguna atau hanya bikin repot orang lain?', keywords: ['gak berguna', 'nyusahin'] },
  { number: 15, question: 'Apakah kehilangan minat total pada berbagai hal?', script: 'Kehilangan semangat total buat melakukan kegiatan apa pun hari ini?', keywords: ['hilang minat', 'gak ada semangat'] },
  { number: 16, question: 'Apakah merasa diri tidak berharga atau gagal?', script: 'Pernah merasa keberadaan diri sudah tidak ada artinya lagi?', keywords: ['tidak berharga', 'gagal', 'gak ada artinya'] },
  { number: 17, question: 'Apakah memiliki pemikiran untuk mengakhiri hidup?', script: 'Pernah terlintas di pikiran rasa ingin menyerah atau mengakhiri hidup?', keywords: ['mati', 'bunuh diri', 'nyerah', 'nyusul', 'gak mau hidup'] },
  { number: 18, question: 'Apakah merasa lelah sepanjang waktu?', script: 'Badan dan pikiran lemas dan capek terus meski tidak kerja berat?', keywords: ['lelah terus', 'capek banget', 'lemes'] },
  { number: 19, question: 'Apakah merasakan tidak nyaman di perut/ulu hati?', script: 'Perut sering terasa melilit atau perih di ulu hati?', keywords: ['ulu hati', 'perut perih'] },
  { number: 20, question: 'Apakah mudah merasa lelah?', script: 'Baru gerak sebentar saja rasanya langsung kehabisan tenaga?', keywords: ['gampang capek', 'cepet lelah'] },
];

function setAnswer(qNum: number, value: boolean) {
  answers.value[qNum] = value;

  // Q17 Safety Gate Interruption
  if (qNum === 17 && value === true) {
    showRedFlagModal.value = true;
  }
}

function handleEscalate() {
  showRedFlagModal.value = false;
  showEmergencyVerification.value = true;
}

function toggleMode() {
  isVerbal.value = !isVerbal.value;
}

// Browser Web Speech API for assistive voice detection
let recognition: any = null;

function toggleSpeechRecognition() {
  if (isListening.value) {
    recognition?.stop();
    isListening.value = false;
    return;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Browser tidak mendukung Web Speech API. Silakan input jawaban secara manual.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening.value = true;
  };

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      if (event.results[i].isFinal) {
        // Simple NLP keyword mapping to suggest answers
        for (const q of srqQuestions) {
          for (const kw of q.keywords) {
            if (transcript.includes(kw)) {
              setAnswer(q.number, true);
              break;
            }
          }
        }
      } else {
        interim += transcript;
      }
    }
    transcriptSnippet.value = interim;
  };

  recognition.onerror = () => {
    isListening.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  recognition.start();
}

function saveAndNext() {
  const payload = Object.entries(answers.value).map(([qNum, ans]) => ({
    question_number: Number(qNum),
    answer: ans,
  }));

  fetch(`/relawan/assessment/${props.assessment.id}/srq`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
    },
    body: JSON.stringify({
      responses: payload,
      mode: isVerbal.value ? 'VERBAL' : 'NON_VERBAL',
    }),
  }).finally(() => {
    router.visit(`/relawan/assessment/${props.assessment.id}/risk`);
  });
}
</script>
