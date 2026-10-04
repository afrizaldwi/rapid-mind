<template>
  <RelawanLayout>
    <div class="space-y-5">
      <!-- Title & Phase Info -->
      <div class="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-teal-800 uppercase tracking-wider block">
              Hari 1–3 Pascabencana
            </span>
            <h2 class="text-xl font-bold text-slate-900 mt-1">
              Buku Saku Digital PFA
            </h2>
          </div>
        </div>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          <em>Psychological First Aid</em>: Hadir utuh, dengarkan tanpa menghakimi, dan berikan rasa aman tanpa membebani penyintas dengan administrasi.
        </p>
      </div>

      <!-- Segment Tabs: LOOK, LISTEN, LINK -->
      <div class="flex rounded-xl bg-slate-200/80 p-1">
        <button
          type="button"
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex-1 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center space-x-1.5"
          :class="activeTab === tab.id ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- TAHAP 1: LOOK -->
      <div v-if="activeTab === 'LOOK'" class="space-y-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4> Amati Keamanan Fisik</h4>
          </div>
          <ul class="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>Pastikan area sekitar aman dari reruntuhan atau cuaca ekstrem.</li>
            <li>Perhatikan apakah ada luka fisik berdarah atau cedera berat. <em>(Jika ada: prioritaskan evakuasi ke Pos Medis terdekat)</em>.</li>
          </ul>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>Amati Reaksi Distres Parah</h4>
          </div>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">Shock / Mutisme:</span> Tatapan mata kosong, mematung, tidak merespons panggilan.
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">Histeria:</span> Menangis tanpa henti, gemetar hebat, hiperventilasi (napas cepat/dangkal).
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">Agitasi:</span> Ngamuk, melempar barang, atau berteriak histeris membahayakan diri.
            </div>
          </div>
          <p class="text-[11px] text-slate-500 italic mt-1">
            Dekati secara perlahan dengan suara lembut, jaga jarak aman fisik.
          </p>
        </div>
      </div>

      <!-- TAHAP 2: LISTEN -->
      <div v-if="activeTab === 'LISTEN'" class="space-y-4">
        <!-- Sapaan Awal -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>Skrip Sapaan Hangat</h4>
          </div>
          <blockquote class="bg-teal-50/60 p-4 rounded-xl border-l-4 border-teal-600 text-xs text-teal-950 italic leading-relaxed">
            "Halo Ibu/Bapak, kenalkan saya Relawan di posko ini. Saya hadir di sini untuk menemani Ibu/Bapak. Ada yang bisa saya bantu atau temani saat ini?"
          </blockquote>
        </div>

        <!-- Do's and Don'ts -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h4 class="font-bold text-sm text-slate-900">
            Panduan Sikap (Do's & Don'ts)
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-emerald-950">
              <div class="flex items-center gap-2 font-bold text-emerald-800">
                <CircleCheck class="h-4 w-4" aria-hidden="true" />
                <span>LAKUKAN (DO):</span>
              </div>
              <ul class="space-y-1 list-disc list-inside text-emerald-900">
                <li>Duduk sejajar pandangan mata.</li>
                <li>Sediakan air minum hangat atau tisu.</li>
                <li>Validasi perasaan sedih penyintas.</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-red-950">
              <div class="flex items-center gap-2 font-bold text-red-800">
                <CircleX class="h-4 w-4" aria-hidden="true" />
                <span>JANGAN (DON'T):</span>
              </div>
              <ul class="space-y-1 list-disc list-inside text-red-900">
                <li>JANGAN memaksa cerita kronologi.</li>
                <li>JANGAN beri janji palsu ("pasti diganti").</li>
                <li>JANGAN membandingkan musibah orang.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Grounding 5-4-3-2-1 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h4 class="text-sm font-bold text-teal-800">Latihan Grounding</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            Gunakan teknik ini jika penyintas tampak panik, napas tersengal, atau mengalami disorientasi:
          </p>

          <div class="space-y-2 text-xs">
            <div v-for="step in groundingSteps" :key="step.title" class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="flex items-start gap-2">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                  {{ step.number }}
                </span>
                <span class="font-bold text-slate-800">{{ step.title }}</span>
              </div>
              <p class="pl-7 text-slate-700 leading-relaxed">{{ step.script }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TAHAP 3: LINK -->
      <div v-if="activeTab === 'LINK'" class="space-y-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>Kebutuhan Dasar Logistik</h4>
          </div>
          <p class="text-xs text-slate-600">
            Tanyakan kebutuhan paling mendesak detik ini:
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>Air Minum Bersih</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>Selimut & Pakaian</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>Obat Rutin Pribadi</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>Perlengkapan Bayi/Lansia</span>
            </div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>Menghubungkan Keluarga</h4>
          </div>
          <blockquote class="bg-slate-50 p-4 rounded-xl border-l-4 border-slate-400 text-xs text-slate-800 italic leading-relaxed">
            "Apakah ada keluarga inti atau kerabat dekat yang ingin Ibu/Bapak hubungi atau cari saat ini? Saya bantu sampaikan ke Tenda Informasi Posko."
          </blockquote>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>Penutup Sesi Humanis</h4>
          </div>
          <blockquote class="bg-teal-50 p-4 rounded-xl border border-teal-200 text-xs text-teal-950 italic leading-relaxed">
            "Merasa sedih, bingung, atau takut setelah kejadian ini adalah hal yang sangat wajar. Ibu/Bapak tidak sendiri. Saya dan tim posko ada di sekitar tenda ini ya."
          </blockquote>
        </div>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CircleCheck, CircleX} from 'lucide-vue-next';
import RelawanLayout from '@/layouts/RelawanLayout.vue';

const activeTab = ref<'LOOK' | 'LISTEN' | 'LINK'>('LOOK');

const tabs = [
  { id: 'LOOK' as const, label: 'LOOK'},
  { id: 'LISTEN' as const, label: 'LISTEN'},
  { id: 'LINK' as const, label: 'LINK'},
];

const groundingSteps = [
  {
    number: 1,
    title: 'Atur Napas Perlahan',
    script: '"Ayo tarik napas pelan-pelan bersama saya... Tahan... Hembuskan..."',
  },
  {
    number: 2,
    title: 'Arahkan Perhatian ke Sekitar',
    script: '"Sebutkan 3 benda yang ada di sekitar Ibu/Bapak saat ini."',
  },
  {
    number: 3,
    title: 'Kembalikan Fokus ke Tubuh',
    script: '"Rasakan pijakan kedua kaki Ibu/Bapak di tanah dan pegang gelas air ini."',
  },
];
</script>
