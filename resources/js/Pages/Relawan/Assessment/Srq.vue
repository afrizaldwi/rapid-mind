<template>
  <RelawanLayout>
    <div class="space-y-6 pb-64">
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
          <div class="bg-teal-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(answeredCount / 20) * 100}%` }"></div>
        </div>

        <!-- Verbal / Non-Verbal Mode & Local Whisper STT -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div class="flex items-center space-x-2">
            <span class="font-semibold text-slate-600">Mode:</span>
            <button type="button" @click="toggleMode" class="px-2 py-0.5 rounded-lg border font-bold"
              :class="isVerbal ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-100 text-slate-700 border-slate-300'">
              {{ isVerbal ? '🗣️ Verbal' : '🤝 Adaptif' }}
            </button>
          </div>

          <div v-if="isVerbal" class="flex items-center gap-2">
            <button type="button" :disabled="sttButtonDisabled" @click="handleSttAction"
              class="px-3 py-1 rounded-lg text-xs font-bold transition border disabled:opacity-60"
              :class="sttStatus === 'recording'
                ? 'bg-red-700 text-white border-red-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'">
              {{ sttButtonLabel }}
            </button>
            <button v-if="sttStatus === 'recording'" type="button" @click="cancelRecording"
              class="px-3 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100">
              Batalkan
            </button>
          </div>
        </div>

        <div v-if="isVerbal" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
          aria-live="polite">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold text-slate-800">{{ sttStatusLabel }}</span>
            <span v-if="sttBackend" class="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-bold text-teal-800">
              Backend: {{ sttBackend === 'webgpu' ? 'WebGPU' : 'WASM / CPU' }}
            </span>
          </div>
          <p v-if="sttStatus === 'preparing' && sttProgress !== null" class="mt-1">
            Progres berkas model: {{ sttProgress }}%
          </p>
          <p v-if="sttMessage" :class="sttStatus === 'error' ? 'mt-1 font-semibold text-red-800' : 'mt-1 text-slate-600'">
            {{ sttMessage }}
          </p>
          <p v-if="sttInterpretationNotice" class="mt-1 font-semibold text-amber-900">
            {{ sttInterpretationNotice }}
          </p>
          <div v-if="transcriptSnippet" class="mt-2 rounded-lg bg-white p-2 text-sm text-slate-900 border border-slate-200">
            <span class="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Transkrip sementara</span>
            <p class="mt-1">“{{ transcriptSnippet }}”</p>
          </div>
          <p class="mt-2 text-[11px] text-slate-500">
            Audio diproses di perangkat. Hanya pernyataan yang cocok dengan aman yang mengisi jawaban; koreksi manual selalu dipertahankan.
          </p>
        </div>
      </div>

      <!-- SRQ-20 Scrollable Question List -->
      <div class="space-y-4">
        <div v-for="q in srqQuestions" :key="q.number" class="bg-white p-5 rounded-2xl border transition"
          :class="answers[q.number] === true ? 'border-teal-400 shadow-xs' : 'border-slate-200 shadow-xs'">
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
            <button type="button" :disabled="!draftReady" @click="setManualAnswer(q.number, true)"
              class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
              :class="answers[q.number] === true
                ? (q.number === 17 ? 'border-red-600 bg-red-600 text-white shadow-md' : 'border-teal-700 bg-teal-700 text-white shadow-md')
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
              <span v-if="answers[q.number] === true">✓</span>
              <span>YA</span>
            </button>

            <button type="button" :disabled="!draftReady" @click="setManualAnswer(q.number, false)"
              class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
              :class="answers[q.number] === false
                ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
              <span v-if="answers[q.number] === false">✓</span>
              <span>TIDAK</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Navigation: Next to Risk Factors -->
      <div data-assessment-action-bar
        class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <RelawanLink href="/relawan/assessment"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← Kembali
          </RelawanLink>
          <button type="button" @click="saveAndNext" :disabled="isSaving || !draftReady || answeredCount !== 20"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60">
            Lanjut: Faktor Risiko ({{ answeredCount }}/20) →
          </button>
        </div>
        <p v-if="answeredCount !== 20" class="mt-2 text-xs text-slate-600">Lengkapi semua jawaban sebelum melanjutkan
          ({{ answeredCount }}/20).</p>
        <p v-if="draftWarning" role="alert" class="mt-2 text-xs font-semibold text-amber-900">{{ draftWarning }}</p>
        <p v-if="saveError" role="alert" class="mt-2 text-xs font-semibold text-red-800">{{ saveError }}</p>
      </div>
    </div>

    <!-- Potential Red Flag Safety Interruption Modal -->
    <PotentialRedFlag :show="showRedFlagModal" :review-only="redFlagReviewOnly"
      @escalate="handleEscalate" @dismiss="showRedFlagModal = false" />

    <!-- T0 Verification Modal -->
    <T0Verification :show="showEmergencyVerification" :patient-id="patient?.id" :patient-name="patient?.name"
      :assessment-id="assessment?.id" suggested-red-flag="SUICIDAL_IDEATION"
      @close="showEmergencyVerification = false" />
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { mergeAssessmentDraft, readAssessmentDraft, saveAssessmentDraft } from '@/offline/assessmentDraft';
import { loadAssessmentContext, relawanOwner } from '@/offline/assessmentWorkflow';
import type { LocalAssessment, LocalPatient } from '@/offline/db';
import { assessmentRepository } from '@/offline/assessmentRepository';
import { localPersistenceHealth } from '@/offline/localPersistenceHealth';
import PotentialRedFlag from '@/components/Relawan/PotentialRedFlag.vue';
import T0Verification from '@/components/Relawan/T0Verification.vue';
import { LocalAudioCapture } from '@/stt/audioCapture';
import { WhisperClient } from '@/stt/whisperClient';
import type { WhisperBackend, WhisperStatus, WhisperWorkerEvent } from '@/stt/types';
import { interpretSrqTranscript, selectSrqSpeechAnswerUpdates } from '@/domain/srq/srqTranscriptInterpreter';

const props = defineProps<{
  assessment: any;
  patient: any;
  responses?: Record<number, boolean>;
}>();

const answers = ref<Record<number, boolean>>(mergeAssessmentDraft('srq_answers', props.responses, {}));
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const localAssessment = ref<LocalAssessment | null>(null);
const patient = ref<LocalPatient | null>(props.patient);
const isSaving = ref(false);
const saveError = ref('');
const draftWarning = ref('');
const draftReady = ref(false);
const sttOwnedAnswers = new Set<number>();
const manualOverrides = new Set<number>();
const isVerbal = ref(props.assessment?.mode !== 'NON_VERBAL');
const sttStatus = ref<WhisperStatus>('idle');
const sttBackend = ref<WhisperBackend | null>(null);
const sttProgress = ref<number | null>(null);
const sttMessage = ref('Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.');
const transcriptSnippet = ref('');
const sttInterpretationNotice = ref('');
const showRedFlagModal = ref(false);
const redFlagReviewOnly = ref(false);
const showEmergencyVerification = ref(false);
let whisperClient: WhisperClient | null = null;
let audioCapture: LocalAudioCapture | null = null;
let sttSession = 0;

const answeredCount = computed(() => {
  return Array.from({ length: 20 }, (_, index) => answers.value[index + 1]).filter(value => typeof value === 'boolean').length;
});

const sttButtonDisabled = computed(() => !draftReady.value || ['preparing', 'processing'].includes(sttStatus.value));
const sttButtonLabel = computed(() => {
  switch (sttStatus.value) {
    case 'preparing': return 'Menyiapkan STT…';
    case 'ready': return '🎤 Mulai Rekam';
    case 'recording': return 'Selesai & Transkripsikan';
    case 'processing': return 'Memproses di Perangkat…';
    case 'error': return 'Coba Siapkan Lagi';
    default: return 'Siapkan STT Offline';
  }
});
const sttStatusLabel = computed(() => {
  switch (sttStatus.value) {
    case 'preparing': return 'STT sedang disiapkan';
    case 'ready': return 'STT siap';
    case 'recording': return 'Perekaman aktif';
    case 'processing': return 'Transkripsi lokal diproses';
    case 'error': return 'STT tidak tersedia';
    default: return 'STT lokal belum siap';
  }
});

const srqQuestions = [
  { number: 1, question: 'Apakah sering merasa sakit kepala?', script: 'Selama di posko, kepala terasa berat atau sering cekot-cekot?' },
  { number: 2, question: 'Apakah nafsu makan menurun?', script: 'Gimana makanannya? Apakah sama sekali malas atau tidak berselera makan?' },
  { number: 3, question: 'Apakah sulit tidur nyenyak?', script: 'Malam hari susah tidur atau sering kebangun karena cemas?' },
  { number: 4, question: 'Apakah mudah merasa takut?', script: 'Belakangan ini gampang kaget atau was-was tiba-tiba?' },
  { number: 5, question: 'Apakah tangan terasa gemetar?', script: 'Apakah jari-jari sering gemetar saat pegang barang atau ngobrol?' },
  { number: 6, question: 'Apakah merasa cemas, tegang, atau khawatir?', script: 'Dada rasanya sering berdebar-debar, tegang, atau ganjel?' },
  { number: 7, question: 'Apakah pencernaan terasa buruk?', script: 'Perut mual, melilit, atau diare terutama saat teringat bencana?' },
  { number: 8, question: 'Apakah sulit berpikir jernih?', script: 'Kepala rasanya penuh atau linglung sampai susah fokus?' },
  { number: 9, question: 'Apakah merasa tidak bahagia?', script: 'Perasaan rasanya sedih dan hampa belakangan ini?' },
  { number: 10, question: 'Apakah lebih sering menangis?', script: 'Rasanya ingin menangis terus atau mendadak menangis tanpa sebab?' },
  { number: 11, question: 'Apakah sulit menikmati kegiatan sehari-hari?', script: 'Hal-hal yang biasa bikin senang sekarang terasa tidak menarik lagi?' },
  { number: 12, question: 'Apakah kesulitan mengambil keputusan?', script: 'Untuk memutuskan hal sederhana saja rasanya bingung dan berat?' },
  { number: 13, question: 'Apakah hasil kerja atau tugas posko terganggu?', script: 'Tugas merawat diri atau keluarga terasa terbengkalai?' },
  { number: 14, question: 'Apakah merasa tidak mampu berbuat hal bermanfaat?', script: 'Merasa diri tidak berguna atau hanya bikin repot orang lain?' },
  { number: 15, question: 'Apakah kehilangan minat total pada berbagai hal?', script: 'Kehilangan semangat total buat melakukan kegiatan apa pun hari ini?' },
  { number: 16, question: 'Apakah merasa diri tidak berharga atau gagal?', script: 'Pernah merasa keberadaan diri sudah tidak ada artinya lagi?' },
  { number: 17, question: 'Apakah memiliki pemikiran untuk mengakhiri hidup?', script: 'Pernah terlintas di pikiran rasa ingin menyerah atau mengakhiri hidup?' },
  { number: 18, question: 'Apakah merasa lelah sepanjang waktu?', script: 'Badan dan pikiran lemas dan capek terus meski tidak kerja berat?' },
  { number: 19, question: 'Apakah merasakan tidak nyaman di perut/ulu hati?', script: 'Perut sering terasa melilit atau perih di ulu hati?' },
  { number: 20, question: 'Apakah mudah merasa lelah?', script: 'Baru gerak sebentar saja rasanya langsung kehabisan tenaga?' },
];

function setAnswer(qNum: number, value: boolean) {
  answers.value[qNum] = value;

  // Q17 Safety Gate Interruption
  if (qNum === 17 && value === true) {
    showRedFlagModal.value = true;
  }
}

function setManualAnswer(qNum: number, value: boolean) {
  manualOverrides.add(qNum);
  sttOwnedAnswers.delete(qNum);
  if (qNum === 17 && value) redFlagReviewOnly.value = false;
  setAnswer(qNum, value);
  void persistDraft();
}

function handleEscalate() {
  showRedFlagModal.value = false;
  showEmergencyVerification.value = true;
}

async function applySpeechTranscript(transcript: string) {
  const interpretation = interpretSrqTranscript(transcript);
  const { accepted, protectedQuestionNumbers } = selectSrqSpeechAnswerUpdates(
    interpretation,
    answers.value,
    sttOwnedAnswers,
    manualOverrides,
  );

  for (const update of accepted) {
    answers.value[update.questionNumber] = update.answer;
    sttOwnedAnswers.add(update.questionNumber);
  }

  if (accepted.length > 0) await persistDraft();

  const acceptedNumbers = accepted.map(({ questionNumber }) => `#${questionNumber}`).join(', ');
  const unresolvedNumbers = [...new Set([
    ...interpretation.matches.filter(({ status }) => status === 'conflicting').map(({ questionNumber }) => questionNumber),
    ...interpretation.unresolved.flatMap(({ questionNumbers }) => questionNumbers),
  ])];
  const notices: string[] = [];
  if (acceptedNumbers) notices.push(`Jawaban terisi dari ucapan: ${acceptedNumbers}.`);
  if (protectedQuestionNumbers.length > 0) notices.push(`Jawaban manual/tersimpan tidak diubah: ${protectedQuestionNumbers.map(number => `#${number}`).join(', ')}.`);
  if (unresolvedNumbers.length > 0) notices.push(`Perlu diperiksa manual: ${unresolvedNumbers.map(number => `#${number}`).join(', ')}.`);
  if (interpretation.unresolved.some(({ questionNumbers }) => questionNumbers.length === 0)) notices.push('Respons tanpa pertanyaan SRQ yang jelas tidak diterapkan.');
  if (notices.length === 0) notices.push('Ucapan belum cukup jelas untuk mengisi jawaban dengan aman.');
  sttInterpretationNotice.value = notices.join(' ');

  const q17Interpretation = interpretation.matches.find(({ questionNumber }) => questionNumber === 17);
  const affirmativeQ17 = q17Interpretation?.status === 'matched' && q17Interpretation.answer === true;
  const protectedQ17 = protectedQuestionNumbers.includes(17);
  if (interpretation.requiresSafetyReview) {
    redFlagReviewOnly.value = true;
    showRedFlagModal.value = true;
  } else if (affirmativeQ17) {
    redFlagReviewOnly.value = protectedQ17 && answers.value[17] !== true;
    showRedFlagModal.value = true;
  }
}

async function toggleMode() {
  if (!localAssessment.value) return;
  const nextMode = isVerbal.value ? 'NON_VERBAL' : 'VERBAL';
  try {
    await localPersistenceHealth.recordWrite(owner, () => assessmentRepository.update(owner, props.assessment.id, { mode: nextMode, sync_state: 'LOCAL_SAVED' }));
    localAssessment.value.mode = nextMode;
    isVerbal.value = nextMode === 'VERBAL';
    if (!isVerbal.value) cleanupStt();
    draftWarning.value = '';
  } catch { draftWarning.value = 'Mode belum tersimpan di perangkat ini.'; }
}

function handleWorkerEvent(event: WhisperWorkerEvent) {
  switch (event.type) {
    case 'MODEL_PROGRESS':
      sttStatus.value = 'preparing';
      sttBackend.value = event.backend;
      if (typeof event.progress === 'number') sttProgress.value = event.progress;
      sttMessage.value = event.backend === 'webgpu'
        ? 'Mencoba menyiapkan Whisper dengan WebGPU.'
        : 'Menyiapkan Whisper dengan WASM / CPU.';
      break;
    case 'READY':
      sttStatus.value = 'ready';
      sttBackend.value = event.backend;
      sttProgress.value = 100;
      sttMessage.value = 'Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.';
      break;
    case 'BACKEND_FALLBACK':
      sttStatus.value = 'preparing';
      sttBackend.value = 'wasm';
      sttProgress.value = null;
      sttMessage.value = 'WebGPU tidak dapat dimulai. Mencoba backend WASM / CPU.';
      break;
    case 'PROCESSING':
      sttStatus.value = 'processing';
      sttBackend.value = event.backend;
      sttMessage.value = 'Audio sedang ditranskripsikan secara lokal.';
      break;
    case 'RESULT':
      sttStatus.value = 'ready';
      sttBackend.value = event.backend;
      transcriptSnippet.value = event.transcript;
      sttInterpretationNotice.value = '';
      if (event.transcript) {
        sttMessage.value = 'Transkripsi selesai dan diperiksa dengan aturan SRQ konservatif.';
        void applySpeechTranscript(event.transcript);
      } else {
        sttMessage.value = 'Tidak ada ucapan yang dikenali. Coba rekam lagi di tempat yang lebih tenang.';
      }
      break;
    case 'ERROR':
      sttStatus.value = event.stage === 'transcribe' && sttBackend.value ? 'ready' : 'error';
      sttMessage.value = event.stage === 'prepare'
        ? 'Whisper tidak dapat disiapkan di perangkat ini. Jawaban manual tetap dapat digunakan.'
        : 'Transkripsi gagal. Coba rekam ulang; jawaban manual tetap dapat digunakan.';
      break;
  }
}

function prepareStt() {
  if (whisperClient && sttStatus.value === 'error') {
    whisperClient.dispose();
    whisperClient = null;
  }
  if (!whisperClient) {
    const client = new WhisperClient((event) => {
      if (whisperClient === client) handleWorkerEvent(event);
    });
    whisperClient = client;
  }
  sttStatus.value = 'preparing';
  sttProgress.value = null;
  sttMessage.value = navigator.onLine
    ? 'Mengunduh atau membuka model yang sudah tersimpan di cache perangkat.'
    : 'Mencoba membuka model yang sebelumnya sudah disiapkan di perangkat.';
  whisperClient.prepare();
}

async function startRecording() {
  const session = sttSession;
  const capture = new LocalAudioCapture();
  audioCapture = capture;
  transcriptSnippet.value = '';
  sttInterpretationNotice.value = '';
  try {
    await capture.start();
    if (sttSession !== session || audioCapture !== capture) {
      capture.cancel();
      return;
    }
    sttStatus.value = 'recording';
    sttMessage.value = 'Mikrofon aktif. Ucapkan satu jawaban, lalu selesaikan rekaman.';
  } catch (error) {
    if (sttSession !== session || audioCapture !== capture) return;
    audioCapture = null;
    sttStatus.value = 'ready';
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      sttMessage.value = 'Izin mikrofon ditolak. Izinkan mikrofon atau gunakan jawaban manual.';
    } else if (error instanceof DOMException && error.name === 'NotFoundError') {
      sttMessage.value = 'Mikrofon tidak ditemukan. Jawaban manual tetap dapat digunakan.';
    } else {
      sttMessage.value = 'Mikrofon tidak dapat dimulai. Jawaban manual tetap dapat digunakan.';
    }
  }
}

async function stopAndTranscribe() {
  const capture = audioCapture;
  const client = whisperClient;
  const session = sttSession;
  if (!capture || !client) return;
  audioCapture = null;
  sttStatus.value = 'processing';
  sttMessage.value = 'Menyiapkan audio untuk Whisper di perangkat.';
  try {
    const audio = await capture.stop();
    if (sttSession !== session || whisperClient !== client) return;
    client.transcribe(audio);
  } catch {
    if (sttSession !== session || whisperClient !== client) return;
    sttStatus.value = 'ready';
    sttMessage.value = 'Rekaman tidak dapat diproses. Coba rekam ulang.';
  }
}

function cancelRecording() {
  audioCapture?.cancel();
  audioCapture = null;
  sttStatus.value = 'ready';
  sttMessage.value = 'Rekaman dibatalkan. Mikrofon sudah dimatikan.';
}

function handleSttAction() {
  if (sttStatus.value === 'idle' || sttStatus.value === 'error') prepareStt();
  else if (sttStatus.value === 'ready') void startRecording();
  else if (sttStatus.value === 'recording') void stopAndTranscribe();
}

function cleanupStt() {
  sttSession += 1;
  audioCapture?.cancel();
  audioCapture = null;
  whisperClient?.dispose();
  whisperClient = null;
  sttStatus.value = 'idle';
  sttBackend.value = null;
  sttProgress.value = null;
  sttMessage.value = 'Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.';
  transcriptSnippet.value = '';
  sttInterpretationNotice.value = '';
}


async function persistDraft() {
  try {
    if (!localAssessment.value) throw new Error('Asesmen lokal belum siap.');
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'srq_answers', answers.value);
    draftWarning.value = '';
  } catch {
    draftWarning.value = 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

onMounted(async () => {
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    isVerbal.value = context.assessment.mode === 'VERBAL';
    patient.value = context.patient;
    const local = await readAssessmentDraft(owner, props.assessment.id, 'srq_answers');
    const merged = mergeAssessmentDraft('srq_answers', props.responses, local);
    for (const [key, value] of Object.entries(merged)) {
      if (!manualOverrides.has(Number(key))) (answers.value as Record<string, typeof value>)[key] = value;
    }
    draftReady.value = true;
  } catch (error) {
    draftWarning.value = error instanceof Error ? error.message : 'Asesmen lokal tidak dapat dibaca.';
  }
});

onUnmounted(cleanupStt);

async function saveAndNext() {
  if (isSaving.value || !draftReady.value) return;
  if (answeredCount.value !== 20) {
    saveError.value = 'Lengkapi semua jawaban sebelum melanjutkan.';
    return;
  }
  isSaving.value = true;
  saveError.value = '';
  try {
    await persistDraft();
    if (draftWarning.value) throw new Error(draftWarning.value);
    runtime.navigate(`/relawan/assessment/${props.assessment.id}/risk`);
  } catch {
    saveError.value = 'Jawaban belum tersimpan di perangkat ini. Coba lagi.';
  } finally {
    isSaving.value = false;
  }
}

</script>
