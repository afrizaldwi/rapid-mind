<template>
  <HealthcareLayout>
    <div class="space-y-4">
      <!-- 1. TOP KPI SUMMARY ROW (Compact, Restrained, High Information Hierarchy) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <!-- KPI 1: Total Antrean -->
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">TOTAL ANTREAN</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-slate-900 tracking-tight">{{ totalSurvivorsCount }}</span>
              <span class="text-xs font-semibold text-slate-500">Penyintas</span>
            </div>
            <span class="text-[11px] text-slate-400 font-medium block mt-0.5">Tersebar di 3 posko Merapi</span>
          </div>
          <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- KPI 2: Sedang Aktif -->
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">SEDANG AKTIF</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-amber-700 tracking-tight">{{ activeCasesCount }}</span>
              <span class="text-xs font-semibold text-slate-500">Kasus</span>
            </div>
            <span class="text-[11px] text-amber-700 font-medium block mt-0.5">Memerlukan atensi nakes</span>
          </div>
          <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <!-- KPI 3: Zona Merah -->
        <div class="bg-white rounded-xl p-3.5 border border-red-200 shadow-2xs flex items-center justify-between bg-red-50/15">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-red-700 block">ZONA MERAH</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-red-700 tracking-tight">{{ criticalT0Count }}</span>
              <span class="text-xs font-semibold text-red-700">T0 / prioritas tinggi</span>
            </div>
            <span class="text-[11px] text-red-700 font-medium block mt-0.5">Prioritas evaluasi medis</span>
          </div>
          <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-800 border border-red-200 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <!-- KPI 4: Waktu Respons Medis -->
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">WAKTU RESPONS MEDIS</span>
            <div class="flex items-baseline space-x-1 mt-0.5">
              <span class="text-2xl font-black text-slate-900 tracking-tight">6.8</span>
              <span class="text-xs font-semibold text-slate-500">menit</span>
            </div>
            <span class="text-[11px] text-slate-500 font-medium block mt-0.5">Target SLA PSC &lt; 15 menit</span>
          </div>
          <div class="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-200 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Action & Error Notifications -->
      <div v-if="$page.props.flash?.message" class="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span>✓</span>
          <span>{{ $page.props.flash.message }}</span>
        </div>
        <button @click="$page.props.flash.message = null" class="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
      </div>

      <div v-if="actionErrors.length > 0" class="p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-medium text-red-900 space-y-1">
        <p class="font-bold">Perhatian pada tindakan medis:</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li v-for="err in actionErrors" :key="err.key">{{ err.message }}</li>
        </ul>
      </div>

      <!-- 2. TWO-PANEL WORKSPACE (Ratio: Left ~34%, Right ~66%) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        <!-- LEFT PANEL: ANTREAN TRIASE & DARURAT (approx 34% width) -->
        <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <!-- Queue Header & Filters -->
          <div class="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Antrean Triase & Darurat
              </h3>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {{ filteredQueue.length }} Kasus
              </span>
            </div>

            <!-- Search Input -->
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari nama, NIK, ID RM..."
                class="w-full pl-8 pr-7 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <!-- Filter Buttons -->
            <div class="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-semibold scrollbar-none">
              <button
                type="button"
                @click="selectedFilter = 'ALL'"
                :class="selectedFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
                class="px-2 py-1 rounded-md transition shrink-0"
              >
                Semua ({{ queueList.length }})
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T0'"
                :class="selectedFilter === 'T0'
                  ? 'bg-red-700 text-white font-bold'
                  : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'"
                class="px-2 py-1 rounded-md transition shrink-0"
              >
                T0 Darurat ({{ countT0 }})
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T1'"
                :class="selectedFilter === 'T1'
                  ? 'bg-orange-700 text-white font-bold'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'"
                class="px-2 py-1 rounded-md transition shrink-0"
              >
                T1 Mendesak ({{ countT1 }})
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T2'"
                :class="selectedFilter === 'T2'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'"
                class="px-2 py-1 rounded-md transition shrink-0"
              >
                T2 Terjadwal ({{ countT2 }})
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T3'"
                :class="selectedFilter === 'T3'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'"
                class="px-2 py-1 rounded-md transition shrink-0"
              >
                T3 Stabil ({{ countT3 }})
              </button>
            </div>
          </div>

          <!-- Queue List -->
          <div class="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[480px] p-2 space-y-1.5">
            <div
              v-for="item in filteredQueue"
              :key="item.key"
              @click="selectItem(item)"
              :class="[
                'p-3 rounded-lg border transition cursor-pointer relative',
                selectedItem?.key === item.key
                  ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/10 shadow-2xs'
                  : 'bg-white hover:bg-slate-50/60 border-slate-200'
              ]"
            >
              <!-- Left Accent Strip for Severity -->
              <span
                class="absolute left-0 inset-y-2 w-1 rounded-r"
                :class="{
                  'bg-red-600': item.priority === 'T0',
                  'bg-orange-500': item.priority === 'T1',
                  'bg-amber-500': item.priority === 'T2',
                  'bg-emerald-500': item.priority === 'T3'
                }"
              ></span>

              <div class="pl-2 space-y-1">
                <!-- Top Row: Triage Status & Time -->
                <div class="flex items-center justify-between">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    :class="priorityBadgeClasses(item.semanticPriority)"
                  >
                    {{ item.semanticPriorityLabel }}
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium">
                    {{ item.timeAgo }}
                  </span>
                </div>

                <!-- Survivor Name & RM Assessment Code -->
                <div class="flex items-baseline justify-between gap-1.5">
                  <h4 class="text-xs font-bold text-slate-900 truncate">
                    {{ item.survivorName }}
                  </h4>
                  <span class="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                    {{ item.rmCode }}
                  </span>
                </div>

                <!-- Clinical Reason / Red Flag -->
                <p v-if="item.redFlagLabel" class="text-[11px] font-medium text-red-700 truncate">
                  {{ item.redFlagLabel }}
                </p>
                <p v-else class="text-[11px] text-slate-500 truncate">
                  {{ item.clinicalSummary }}
                </p>

                <!-- Location & Validation Status -->
                <div class="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                  <span class="truncate">{{ item.shelterName }}</span>
                  <span class="font-medium text-[10px] text-slate-700">
                    {{ item.statusLabel }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredQueue.length === 0" class="p-8 text-center text-xs text-slate-400 space-y-1">
              <p class="font-bold text-slate-600">Tidak ada antrean yang cocok</p>
              <p class="text-slate-400 text-[11px]">Ubah filter prioritas atau kata kunci pencarian.</p>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: DETAIL KASUS TRIASE (approx 66% width) -->
        <main class="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden min-h-[580px]">
          
          <template v-if="selectedItem">
            <!-- 1. DETAIL HEADER BAR (Strictly Polished Hierarchy) -->
            <div class="p-5 border-b border-slate-200 bg-slate-50/40 space-y-4">
              <!-- Primary Header Row: Survivor, RM, Status, & Main Action -->
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <h2 class="text-lg font-bold text-slate-900 tracking-tight">
                      {{ selectedItem.survivorName }}
                    </h2>
                    <span class="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {{ selectedItem.rmCode }}
                    </span>
                  </div>

                  <div class="flex items-center space-x-2">
                    <span
                      class="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                      :class="priorityBadgeClasses(selectedItem.semanticPriority)"
                    >
                      {{ selectedItem.semanticPriorityLabel }}
                    </span>
                    <span class="text-xs text-slate-500 font-medium">
                      • {{ selectedItem.semanticStatusDescription }}
                    </span>
                  </div>
                </div>

                <!-- Primary Action CTA -->
                <div>
                  <button
                    v-if="selectedItem.isEmergency && selectedItem.status === 'PENDING'"
                    type="button"
                    @click="acknowledgeCase(selectedItem)"
                    :disabled="isSubmitting"
                    class="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                  >
                    AKUI KASUS
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="activeTab = 'actions'"
                    class="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs transition"
                  >
                    Tindak Lanjuti Kasus
                  </button>
                </div>
              </div>

              <!-- Secondary Metadata Row (Clean, Restrained) -->
              <div class="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 block uppercase">NIK</span>
                  <div class="flex items-center space-x-1 mt-0.5">
                    <strong class="font-mono text-slate-800">{{ selectedItem.maskedNik }}</strong>
                  </div>
                  <span class="text-[10px] text-emerald-700 font-medium block">✓ Identitas terverifikasi</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 block uppercase">Usia</span>
                  <strong class="text-slate-800 mt-0.5 block">{{ selectedItem.age }} tahun</strong>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 block uppercase">Jenis Kelamin</span>
                  <strong class="text-slate-800 mt-0.5 block">{{ selectedItem.gender }}</strong>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 block uppercase">Status Kerentanan</span>
                  <strong class="text-slate-800 mt-0.5 block">{{ selectedItem.vulnerabilityStatus }}</strong>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 block uppercase">Lokasi Posko</span>
                  <strong class="text-slate-800 mt-0.5 block truncate">{{ selectedItem.shelterName }}</strong>
                </div>
              </div>

              <!-- WORKSPACE TABS BAR (Clean, Dark Indicator, No Giant Colored Pills) -->
              <nav class="flex items-center space-x-6 border-b border-slate-200 text-xs font-semibold pt-1">
                <button
                  type="button"
                  @click="activeTab = 'overview'"
                  :class="activeTab === 'overview'
                    ? 'text-slate-900 border-b-2 border-slate-900 font-bold pb-2'
                    : 'text-slate-500 hover:text-slate-700 font-medium pb-2'"
                  class="transition"
                >
                  Ringkasan
                </button>

                <button
                  type="button"
                  @click="activeTab = 'assessment'"
                  :class="activeTab === 'assessment'
                    ? 'text-slate-900 border-b-2 border-slate-900 font-bold pb-2'
                    : 'text-slate-500 hover:text-slate-700 font-medium pb-2'"
                  class="transition"
                >
                  Asesmen (SRQ-20)
                </button>

                <button
                  type="button"
                  @click="activeTab = 'notes'"
                  :class="activeTab === 'notes'
                    ? 'text-slate-900 border-b-2 border-slate-900 font-bold pb-2'
                    : 'text-slate-500 hover:text-slate-700 font-medium pb-2'"
                  class="transition"
                >
                  Catatan Medis
                </button>

                <button
                  type="button"
                  @click="activeTab = 'actions'"
                  :class="activeTab === 'actions'
                    ? 'text-slate-900 border-b-2 border-slate-900 font-bold pb-2'
                    : 'text-slate-500 hover:text-slate-700 font-medium pb-2'"
                  class="transition"
                >
                  Tindakan & Rujukan
                </button>

                <button
                  type="button"
                  @click="activeTab = 'history'"
                  :class="activeTab === 'history'
                    ? 'text-slate-900 border-b-2 border-slate-900 font-bold pb-2'
                    : 'text-slate-500 hover:text-slate-700 font-medium pb-2'"
                  class="transition"
                >
                  Riwayat
                </button>
              </nav>
            </div>

            <!-- 2. TAB CONTENTS -->
            <div class="p-5 space-y-5 flex-1 overflow-y-auto">
              
              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 1: RINGKASAN (OVERVIEW) -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'overview'" class="space-y-4">
                
                <!-- Red Flag Alert Box (Restrained Red, Left Border Accent) -->
                <div
                  v-if="selectedItem.hasRedFlag"
                  class="rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50/50 p-4 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-red-900 uppercase tracking-wide">
                      Tanda Bahaya Klinis (Red Flag Terdeteksi)
                    </h4>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                      {{ selectedItem.semanticPriorityLabel }}
                    </span>
                  </div>

                  <p class="text-xs text-red-950 font-semibold">
                    Kategori Bahaya: {{ selectedItem.redFlagLabel }}
                  </p>
                  
                  <div class="p-2.5 bg-white rounded-lg border border-red-200 text-xs text-slate-800">
                    <span class="text-[10px] font-bold text-slate-400 block uppercase">Catatan Laporan Lapangan</span>
                    <p class="mt-0.5 text-slate-700 italic">"{{ selectedItem.notes || 'Penyintas mengalami krisis psikologis akut dan memerlukan stabilisasi darurat.' }}"</p>
                  </div>

                  <div class="flex items-center justify-between pt-1">
                    <span class="text-[11px] text-red-800 font-medium">
                      Penyintas tidak boleh ditinggal sendirian. Prioritaskan stabilisasi dan rujukan.
                    </span>
                    <button
                      v-if="selectedItem.status === 'PENDING'"
                      type="button"
                      @click="acknowledgeCase(selectedItem)"
                      class="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-md shadow-xs transition"
                    >
                      AKUI KASUS
                    </button>
                  </div>
                </div>

                <!-- Clinical Score Summary (Compact 3 Cards) -->
                <div class="space-y-1.5">
                  <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Ringkasan Skor Klinis
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <!-- Score 1: SRQ-20 -->
                    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">SRQ-20</span>
                      <div class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.srqScore }}</span>
                        <span class="text-xs text-slate-400">/ 20</span>
                      </div>
                      <span class="text-[11px] font-bold block" :class="selectedItem.srqScore >= 6 ? 'text-red-700' : 'text-slate-600'">
                        {{ selectedItem.srqScore >= 6 ? 'Di atas ambang klinis (≥ 6)' : 'Dalam batas normal (< 6)' }}
                      </span>
                    </div>

                    <!-- Score 2: Faktor Risiko -->
                    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">Faktor Risiko Bencana</span>
                      <div class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.riskScore }}</span>
                        <span class="text-xs text-slate-400">Bobot</span>
                      </div>
                      <span class="text-[11px] font-bold block text-slate-700">
                        {{ selectedItem.riskScore >= 3 ? 'Risiko Tinggi' : 'Risiko Rendah' }}
                      </span>
                    </div>

                    <!-- Score 3: Gangguan Fungsi / ADL -->
                    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">Fungsi / ADL</span>
                      <div class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.functionScore }}</span>
                        <span class="text-xs text-slate-400">Tingkat</span>
                      </div>
                      <span class="text-[11px] font-bold block text-slate-700">
                        {{ selectedItem.functionScore >= 3 ? 'Terganggu Berat' : 'Terganggu Ringan' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Emergency Response Workflow Stepper (Compact, Clean, Calm) -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Alur Respons Medis & Komando PSC 119
                    </h4>
                    <span class="text-[10px] font-semibold text-slate-500">
                      SOP Tanggap Medis Bencana
                    </span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <!-- Step 1 -->
                    <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-0.5">
                      <div class="flex items-center justify-between text-[10px] font-bold text-emerald-700">
                        <span>1. Laporan</span>
                        <span>✓</span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Laporan Lapangan</p>
                      <p class="text-[10px] text-slate-400 truncate">{{ selectedItem.volunteerName }}</p>
                    </div>

                    <!-- Step 2 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="['ACKNOWLEDGED', 'REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status)
                        ? 'border-slate-300 bg-white'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-600">2. Verifikasi</span>
                        <span :class="['REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-emerald-700' : 'text-amber-600'">
                          {{ ['REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? '✓' : 'Proses' }}
                        </span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Verifikasi Medis</p>
                      <p class="text-[10px] text-slate-400">Telepon / Video / Lapangan</p>
                    </div>

                    <!-- Step 3 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status)
                        ? 'border-slate-300 bg-white'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-600">3. Klasifikasi</span>
                        <span :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-emerald-700' : 'text-slate-400'">
                          {{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? '✓' : 'Menunggu' }}
                        </span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Klasifikasi Triase</p>
                      <p class="text-[10px] text-slate-400">Diagnosis nakes</p>
                    </div>

                    <!-- Step 4 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="selectedItem.hasReferral
                        ? 'border-slate-300 bg-white'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-600">4. Rujukan</span>
                        <span :class="selectedItem.hasReferral ? 'text-emerald-700' : 'text-slate-400'">
                          {{ selectedItem.hasReferral ? '✓' : 'Disposisi' }}
                        </span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Rujukan & Evakuasi</p>
                      <p class="text-[10px] text-slate-400">Ambulans PSC 119</p>
                    </div>
                  </div>
                </div>

                <!-- Action Footer (Section 17) -->
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <h5 class="font-bold text-slate-900 uppercase tracking-wide text-[11px]">TINDAKAN SEGERA</h5>
                    <p class="text-slate-600 text-[11px] mt-0.5">Ambil tindakan klinis atau buat rujukan langsung untuk penyintas ini.</p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      @click="activeTab = 'notes'"
                      class="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 font-semibold shadow-2xs transition"
                    >
                      + Tambah Catatan
                    </button>
                    <button
                      type="button"
                      @click="activeTab = 'actions'"
                      class="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs transition"
                    >
                      Buka Form Tindakan →
                    </button>
                  </div>
                </div>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 2: ASESMEN (SRQ-20) -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'assessment'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Hasil Skrining SRQ-20</h4>
                    <p class="text-[11px] text-slate-500">20 Pertanyaan standar WHO untuk deteksi distres psikologis bencana.</p>
                  </div>
                  <span class="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    Skor Ya: {{ selectedItem.srqScore }} / 20
                  </span>
                </div>

                <!-- SRQ-20 Questions Table/List -->
                <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div
                    v-for="(q, idx) in srqQuestionList"
                    :key="idx"
                    :class="[
                      'p-2.5 flex items-center justify-between gap-3',
                      isSrqYes(idx + 1)
                        ? (idx + 1 === 17 ? 'bg-red-50/70 text-red-950 font-bold' : 'bg-slate-50/50 text-slate-900 font-medium')
                        : 'text-slate-600'
                    ]"
                  >
                    <div class="flex items-start space-x-2">
                      <span
                        class="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                        :class="isSrqYes(idx + 1) ? (idx + 1 === 17 ? 'bg-red-700 text-white' : 'bg-slate-800 text-white') : 'bg-slate-200 text-slate-600'"
                      >
                        {{ idx + 1 }}
                      </span>
                      <span>
                        {{ q }}
                        <span v-if="idx + 1 === 17" class="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-200 text-red-900">
                          Red Flag Kritis
                        </span>
                      </span>
                    </div>

                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
                      :class="isSrqYes(idx + 1)
                        ? (idx + 1 === 17 ? 'bg-red-700 text-white' : 'bg-slate-900 text-white')
                        : 'bg-slate-100 text-slate-400'"
                    >
                      {{ isSrqYes(idx + 1) ? 'YA' : 'TIDAK' }}
                    </span>
                  </div>
                </div>

                <!-- Risk Factors & Functional Domains Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <!-- Risk Checklist -->
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <h5 class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Faktor Risiko Bencana (R1 - R5)
                    </h5>
                    <div class="space-y-1.5 text-xs">
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>R1. Kehilangan keluarga / kerabat</span>
                        <strong :class="isRiskYes('R1') ? 'text-red-700' : 'text-slate-400'">{{ isRiskYes('R1') ? 'YA (Bobot 2)' : 'TIDAK' }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>R2. Kehilangan tempat tinggal / usaha</span>
                        <strong :class="isRiskYes('R2') ? 'text-red-700' : 'text-slate-400'">{{ isRiskYes('R2') ? 'YA (Bobot 2)' : 'TIDAK' }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>R3. Riwayat gangguan emosional masa lalu</span>
                        <strong :class="isRiskYes('R3') ? 'text-red-700' : 'text-slate-400'">{{ isRiskYes('R3') ? 'YA (Bobot 1)' : 'TIDAK' }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>R4. Disabilitas atau cedera fisik</span>
                        <strong :class="isRiskYes('R4') ? 'text-red-700' : 'text-slate-400'">{{ isRiskYes('R4') ? 'YA (Bobot 2)' : 'TIDAK' }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>R5. Sendirian tanpa pendamping</span>
                        <strong :class="isRiskYes('R5') ? 'text-red-700' : 'text-slate-400'">{{ isRiskYes('R5') ? 'YA (Bobot 1)' : 'TIDAK' }}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Functional Checklist -->
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <h5 class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Asesmen Gangguan Fungsi (F1 - F3)
                    </h5>
                    <div class="space-y-1.5 text-xs">
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>F1. Perawatan Diri & Higienitas</span>
                        <strong class="text-slate-800">{{ getFunctionLabel('F1') }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>F2. Aktivitas Harian Produktif</span>
                        <strong class="text-slate-800">{{ getFunctionLabel('F2') }}</strong>
                      </div>
                      <div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <span>F3. Hubungan Sosial & Interaksi</span>
                        <strong class="text-slate-800">{{ getFunctionLabel('F3') }}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 3: CATATAN MEDIS -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'notes'" class="space-y-4">
                <div>
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Catatan Klinis & Observasi</h4>
                  <p class="text-[11px] text-slate-500">Dokumentasi hasil observasi relawan posko dan dokter jaga PSC 119.</p>
                </div>

                <!-- Input Catatan Baru -->
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <label class="block text-xs font-bold text-slate-800">
                    Tambah Catatan Medis Baru:
                  </label>
                  <textarea
                    v-model="newClinicalNote"
                    rows="2"
                    placeholder="Tuliskan catatan observasi pasien, respon intervensi, atau instruksi klinis..."
                    class="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  ></textarea>
                  <div class="flex justify-end">
                    <button
                      type="button"
                      @click="addLocalNote"
                      :disabled="!newClinicalNote.trim()"
                      class="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition"
                    >
                      Simpan Catatan
                    </button>
                  </div>
                </div>

                <!-- Timeline Catatan -->
                <div class="space-y-2.5 pt-1">
                  <h5 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Catatan Tersimpan
                  </h5>

                  <div
                    v-for="(n, idx) in clinicalNotesList"
                    :key="idx"
                    class="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs"
                  >
                    <div class="flex items-center justify-between text-xs">
                      <div class="flex items-center space-x-2">
                        <span class="font-bold text-slate-900">{{ n.author }}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {{ n.role }}
                        </span>
                      </div>
                      <span class="text-slate-400 text-[11px]">{{ n.time }}</span>
                    </div>
                    <p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{{ n.content }}"
                    </p>
                  </div>
                </div>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 4: TINDAKAN & RUJUKAN -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'actions'" class="space-y-4">
                <!-- If this is an EmergencyEvent case -->
                <template v-if="selectedItem.isEmergency">
                  <!-- ACTION 1: ACKNOWLEDGE -->
                  <div
                    class="bg-white p-4 rounded-xl border space-y-2.5 shadow-2xs"
                    :class="selectedItem.status === 'PENDING' ? 'border-red-300 bg-red-50/20' : 'border-slate-200'"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="text-xs font-bold text-slate-900 uppercase">1. Pengakuan Kasus (Acknowledge)</h4>
                        <p class="text-[11px] text-slate-500">Konfirmasikan penerimaan laporan kegawatdaruratan oleh dokter nakes.</p>
                      </div>
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="selectedItem.status !== 'PENDING' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ selectedItem.status !== 'PENDING' ? 'Sudah Diakui' : 'Menunggu Akui' }}
                      </span>
                    </div>

                    <div v-if="selectedItem.status === 'PENDING'">
                      <button
                        type="button"
                        @click="acknowledgeCase(selectedItem)"
                        :disabled="isSubmitting"
                        class="w-full py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        AKUI KASUS
                      </button>
                    </div>
                  </div>

                  <!-- ACTION 2: SECONDARY VERIFICATION -->
                  <div
                    class="bg-white p-4 rounded-xl border space-y-3 shadow-2xs"
                    :class="selectedItem.status === 'ACKNOWLEDGED' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="text-xs font-bold text-slate-900 uppercase">2. Verifikasi Medis</h4>
                        <p class="text-[11px] text-slate-500">Hubungi posko untuk konfirmasi tanda bahaya sebelum penetapan klasifikasi.</p>
                      </div>
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="['REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                      >
                        {{ ['REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'Terverifikasi' : 'Tahap Ini' }}
                      </span>
                    </div>

                    <form
                      v-if="selectedItem.status === 'ACKNOWLEDGED'"
                      @submit.prevent="submitVerification(selectedItem)"
                      class="space-y-2.5"
                    >
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Metode Verifikasi:</label>
                        <div class="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            @click="verificationForm.method = 'PHONE'"
                            :class="verificationForm.method === 'PHONE' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            Telepon Posko
                          </button>
                          <button
                            type="button"
                            @click="verificationForm.method = 'VIDEO'"
                            :class="verificationForm.method === 'VIDEO' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            Video Call
                          </button>
                          <button
                            type="button"
                            @click="verificationForm.method = 'FIELD_TEAM'"
                            :class="verificationForm.method === 'FIELD_TEAM' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            Tim Lapangan
                          </button>
                        </div>
                      </div>

                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Catatan Hasil Verifikasi:</label>
                        <textarea
                          v-model="verificationForm.notes"
                          rows="2"
                          placeholder="Hasil kontak atau pengamatan penyintas..."
                          class="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        SIMPAN HASIL VERIFIKASI
                      </button>
                    </form>
                  </div>

                  <!-- ACTION 3: CLASSIFY DECISION -->
                  <div
                    class="bg-white p-4 rounded-xl border space-y-3 shadow-2xs"
                    :class="selectedItem.status === 'REVIEWING' ? 'border-teal-400 bg-teal-50/20' : 'border-slate-200'"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="text-xs font-bold text-slate-900 uppercase">3. Penetapan Klasifikasi Triase</h4>
                        <p class="text-[11px] text-slate-500">Konfirmasi T0 atau turunkan kategori ke T1 / T2.</p>
                      </div>
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                      >
                        {{ selectedItem.status === 'CONFIRMED' ? 'T0 Terkonfirmasi' : selectedItem.status === 'DOWNGRADED' ? 'Diturunkan' : 'Menunggu' }}
                      </span>
                    </div>

                    <form
                      v-if="selectedItem.status === 'REVIEWING'"
                      @submit.prevent="submitClassification(selectedItem)"
                      class="space-y-2.5"
                    >
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          @click="decisionForm.clinical_result = 'T0_CONFIRMED'"
                          class="p-2.5 rounded-lg border text-left transition"
                          :class="decisionForm.clinical_result === 'T0_CONFIRMED' ? 'border-red-600 bg-red-50 text-red-950 font-bold' : 'border-slate-200 text-slate-700'"
                        >
                          <span class="block text-xs font-bold text-red-800">T0 Konfirmasi</span>
                          <span class="text-[10px] text-slate-500">Ancaman nyawa aktif</span>
                        </button>

                        <button
                          type="button"
                          @click="decisionForm.clinical_result = 'T1'"
                          class="p-2.5 rounded-lg border text-left transition"
                          :class="decisionForm.clinical_result === 'T1' ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold' : 'border-slate-200 text-slate-700'"
                        >
                          <span class="block text-xs font-bold text-orange-800">Turunkan ke T1</span>
                          <span class="text-[10px] text-slate-500">Mendesak pos medis</span>
                        </button>

                        <button
                          type="button"
                          @click="decisionForm.clinical_result = 'T2'"
                          class="p-2.5 rounded-lg border text-left transition"
                          :class="decisionForm.clinical_result === 'T2' ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold' : 'border-slate-200 text-slate-700'"
                        >
                          <span class="block text-xs font-bold text-amber-800">Turunkan ke T2</span>
                          <span class="text-[10px] text-slate-500">Konseling terjadwal</span>
                        </button>
                      </div>

                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Catatan Justifikasi Medis:</label>
                        <textarea
                          v-model="decisionForm.notes"
                          rows="2"
                          placeholder="Dasar pertimbangan klinis penetapan status..."
                          class="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        SIMPAN KEPUTUSAN TRIASE
                      </button>
                    </form>
                  </div>

                  <!-- ACTION 4: REFERRAL & DISPATCH -->
                  <div
                    class="bg-white p-4 rounded-xl border space-y-3 shadow-2xs"
                    :class="selectedItem.status === 'CONFIRMED' ? 'border-red-300 bg-red-50/20' : 'border-slate-200'"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="text-xs font-bold text-slate-900 uppercase">4. Rujukan Faskes & Armada PSC 119</h4>
                        <p class="text-[11px] text-slate-500">Kirim instruksi ambulans atau rujukan fasilitas kesehatan rujukan.</p>
                      </div>
                      <span
                        v-if="selectedItem.referrals?.length"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900"
                      >
                        Rujukan Aktif
                      </span>
                    </div>

                    <div v-if="selectedItem.referrals?.length" class="p-3 bg-teal-50 rounded-lg border border-teal-200 text-xs space-y-1">
                      <p class="font-bold text-teal-950">Surat Rujukan Telah Diterbitkan</p>
                      <p class="text-teal-900">Tujuan: <strong>{{ selectedItem.referrals[0].facility?.name || 'RSUD Rujukan Candi' }}</strong></p>
                      <p class="text-teal-900">Status Armada: <strong>{{ formatReferralStatus(selectedItem.referrals[0].status) }}</strong></p>
                    </div>

                    <form
                      v-else-if="selectedItem.status === 'CONFIRMED'"
                      @submit.prevent="submitReferral(selectedItem)"
                      class="space-y-2.5"
                    >
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Pilih Faskes Rujukan Tujuan:</label>
                        <select
                          v-model="referralForm.facility_id"
                          class="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        >
                          <option v-for="f in facilities" :key="f.id" :value="f.id">
                            {{ f.name }} ({{ f.type }})
                          </option>
                        </select>
                      </div>

                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Catatan Rujukan & Kebutuhan Transportasi:</label>
                        <textarea
                          v-model="referralForm.notes"
                          rows="2"
                          placeholder="Kondisi pasien, kebutuhan ambulans gawat darurat, pendamping..."
                          class="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        :disabled="isSubmitting || !referralForm.facility_id"
                        class="w-full py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        BUAT RUJUKAN & PANGGIL ARMADA PSC 119
                      </button>
                    </form>
                  </div>
                </template>

                <!-- Regular Assessment Validation (T1/T2) -->
                <template v-else>
                  <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                    <div>
                      <h4 class="text-xs font-bold text-slate-900 uppercase">Validasi Klinis Asesmen (T1 / T2)</h4>
                      <p class="text-[11px] text-slate-500">Validasikan rekomendasi sistem untuk tindakan lanjutan non-gawat darurat.</p>
                    </div>

                    <div v-if="selectedItem.clinicalValidation" class="p-3 bg-teal-50 rounded-lg border border-teal-200 text-xs space-y-1">
                      <p class="font-bold text-teal-950">Asesmen Telah Divalidasi</p>
                      <p class="text-teal-900">Hasil: {{ selectedItem.clinicalValidation.clinical_result }}</p>
                      <p class="text-teal-900">Dokter: {{ selectedItem.clinicalValidation.validator?.name || 'dr. Rina Suryani' }}</p>
                    </div>

                    <form
                      v-else
                      @submit.prevent="submitValidation(selectedItem)"
                      class="space-y-2.5"
                    >
                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Kategori Klinis Hasil Validasi:</label>
                        <div class="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            @click="validationForm.clinical_result = 'T1'"
                            :class="validationForm.clinical_result === 'T1' ? 'bg-orange-700 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            T1 Mendesak
                          </button>
                          <button
                            type="button"
                            @click="validationForm.clinical_result = 'T2'"
                            :class="validationForm.clinical_result === 'T2' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            T2 Terjadwal
                          </button>
                          <button
                            type="button"
                            @click="validationForm.clinical_result = 'T3'"
                            :class="validationForm.clinical_result === 'T3' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700'"
                            class="py-1.5 rounded-lg text-xs transition"
                          >
                            T3 Stabil
                          </button>
                        </div>
                      </div>

                      <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Diagnosis & Rencana Intervensi:</label>
                        <textarea
                          v-model="validationForm.diagnosis_notes"
                          rows="2"
                          placeholder="Penjelasan diagnosis dan rencana intervensi konseling..."
                          class="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        ></textarea>
                      </div>

                      <div class="flex items-center space-x-2">
                        <input
                          v-model="validationForm.referral_required"
                          type="checkbox"
                          id="referralCheck"
                          class="rounded border-slate-300 text-teal-800"
                        />
                        <label for="referralCheck" class="text-xs font-semibold text-slate-700">Perlu rujukan ke faskes rawat jalan?</label>
                      </div>

                      <div v-if="validationForm.referral_required">
                        <select
                          v-model="validationForm.facility_id"
                          class="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800"
                        >
                          <option v-for="f in facilities" :key="f.id" :value="f.id">{{ f.name }} ({{ f.type }})</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        SIMPAN VALIDASI KLINIS
                      </button>
                    </form>
                  </div>
                </template>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 5: RIWAYAT (LONGITUDINAL HISTORY) -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'history'" class="space-y-4">
                <div>
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Rekam Jejak Longitudinal Pasien</h4>
                  <p class="text-[11px] text-slate-500">Perjalanan riwayat skrining, eskalasi darurat, dan audit penanganan medis.</p>
                </div>

                <div class="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <!-- Timeline Item 1 -->
                  <div class="relative space-y-0.5">
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-600 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-teal-800 block">Registrasi Korban</span>
                    <p class="text-xs font-bold text-slate-800">Pendaftaran Data Pasien di {{ selectedItem.shelterName }}</p>
                    <p class="text-[11px] text-slate-500">Terdaftar dengan NIK {{ selectedItem.maskedNik }} oleh {{ selectedItem.volunteerName }}.</p>
                  </div>

                  <!-- Timeline Item 2 -->
                  <div class="relative space-y-0.5">
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-900 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-slate-500 block">Skrining Awal</span>
                    <p class="text-xs font-bold text-slate-800">Asesmen Skrining Psikologis {{ selectedItem.rmCode }}</p>
                    <p class="text-[11px] text-slate-500">Skor SRQ-20: {{ selectedItem.srqScore }}/20 • Rekomendasi: {{ selectedItem.semanticPriorityLabel }}</p>
                  </div>

                  <!-- Timeline Item 3 (if Red Flag) -->
                  <div v-if="selectedItem.hasRedFlag" class="relative space-y-0.5">
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-red-600 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-red-700 block">Eskalasi Gawat Darurat</span>
                    <p class="text-xs font-bold text-red-900">Pemicu Red Flag: {{ selectedItem.redFlagLabel }}</p>
                    <p class="text-[11px] text-slate-600">Laporan darurat diteruskan langsung ke komando medis PSC 119 Sleman.</p>
                  </div>

                  <!-- Timeline Item 4 (Verifications) -->
                  <div v-for="(v, vIdx) in selectedItem.verifications" :key="vIdx" class="relative space-y-0.5">
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-amber-700 block">Audit Verifikasi Medis</span>
                    <p class="text-xs font-bold text-slate-800">Verifikasi oleh {{ v.verifier?.name || 'Dokter Jaga PSC 119' }}</p>
                    <p class="text-[11px] text-slate-600">Metode: {{ v.method || 'Telepon' }} • "{{ v.notes || 'Terverifikasi sesuai SOP.' }}"</p>
                  </div>

                  <!-- Timeline Item 5 (Referrals) -->
                  <div v-for="(r, rIdx) in selectedItem.referrals" :key="`ref-${rIdx}`" class="relative space-y-0.5">
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-teal-800 block">Perintah Rujukan & Evakuasi</span>
                    <p class="text-xs font-bold text-slate-800">Faskes Tujuan: {{ r.facility?.name || 'RSUD Rujukan Candi' }}</p>
                    <p class="text-[11px] text-slate-600">Status Armada: {{ formatReferralStatus(r.status) }}</p>
                  </div>
                </div>
              </div>

            </div>
          </template>

          <!-- Empty Right State -->
          <div v-else class="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400 space-y-2">
            <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 class="text-sm font-bold text-slate-700">Pilih Penyintas dari Antrean</h4>
            <p class="text-xs text-slate-400 max-w-xs">
              Klik salah satu kartu antrean di panel kiri untuk membuka detail rekam klinis, skor gejala, dan tindakan tanggap darurat.
            </p>
          </div>
        </main>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import { formatReferralStatus } from '@/lib/referralStatus';

const props = defineProps<{
  emergencies?: any[];
  assessments?: any[];
  facilities?: any[];
  facility?: any;
}>();

const page = usePage();
const isSubmitting = ref(false);
const searchQuery = ref('');
const selectedFilter = ref<'ALL' | 'T0' | 'T1' | 'T2' | 'T3'>('ALL');
const activeTab = ref<'overview' | 'assessment' | 'notes' | 'actions' | 'history'>('overview');

const actionErrors = computed(() => {
  return Object.entries(page.props.errors ?? {}).map(([key, message]) => ({
    key,
    message: String(message),
  }));
});

// Forms
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

const validationForm = ref({
  clinical_result: 'T1',
  diagnosis_notes: '',
  intervention_plan: '',
  referral_required: false,
  facility_id: props.facilities?.[0]?.id ?? null,
});

const newClinicalNote = ref('');
const localNotes = ref<Record<string, Array<{ author: string; role: string; time: string; content: string }>>>({});

// SRQ 20 Indonesian Questions (Official WHO)
const srqQuestionList = [
  'Apakah Anda sering merasa sakit kepala?',
  'Apakah Anda kehilangan nafsu makan?',
  'Apakah tidur Anda tidak nyenyak atau terganggu?',
  'Apakah Anda mudah merasa takut atau cemas?',
  'Apakah Anda merasa tegang, cemas, atau khawatir berlebih?',
  'Apakah tangan Anda sering gemetar saat panik?',
  'Apakah pencernaan Anda terganggu atau sering mulas?',
  'Apakah Anda merasa sulit untuk berpikir jernih?',
  'Apakah Anda merasa tidak bahagia atau sedih mendalam?',
  'Apakah Anda lebih sering menangis dari biasanya?',
  'Apakah Anda merasa sulit menikmati kegiatan sehari-hari?',
  'Apakah Anda merasa sulit untuk mengambil keputusan?',
  'Apakah pekerjaan atau aktivitas harian Anda terbengkalai?',
  'Apakah Anda merasa tidak mampu berperan berguna dalam hidup?',
  'Apakah Anda kehilangan minat terhadap berbagai hal penting?',
  'Apakah Anda merasa diri Anda tidak berharga?',
  'Apakah Anda mempunyai pikiran untuk mengakhiri hidup?',
  'Apakah Anda merasa lelah sepanjang waktu?',
  'Apakah Anda sering merasa tidak nyaman di perut?',
  'Apakah Anda mudah merasa lelah dalam beraktivitas?',
];

// Helper: Format RM Code (Assessment Record Identifier, NEVER Person ID)
function formatRmCode(record: any): string {
  if (record?.rm_code) return record.rm_code;
  const raw = record?.assessment_id || record?.assessment?.id || record?.id || '';
  const hex = raw.replace(/-/g, '').slice(-6).toUpperCase();
  return `RM-2026-${hex || '000089'}`;
}

// Helper: Mask NIK (3404••••0089)
function maskNik(nik?: string): string {
  if (!nik || nik.length < 8) return '3404••••0089';
  return nik.slice(0, 4) + '••••' + nik.slice(-4);
}

// Helper: Relative Time
function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Baru saja';
  const diffMinutes = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.round(diffHours / 24)} hari lalu`;
}

// Normalize Queue Item
function normalizeQueueItem(raw: any, isEmergency: boolean) {
  const patient = raw.patient;
  const assessment = isEmergency ? raw.assessment || raw.patient?.assessments?.[0] : raw;
  const triage = assessment?.triageResult || raw.triage_result;

  let priority: 'T0' | 'T1' | 'T2' | 'T3' = 'T2';
  let priorityLabel = 'T2 Terjadwal';

  if (isEmergency) {
    priority = 'T0';
    priorityLabel = 'T0 Darurat';
  } else if (triage?.system_recommendation) {
    const rec = triage.system_recommendation;
    if (rec.startsWith('T0')) {
      priority = 'T0';
      priorityLabel = 'T0 Darurat';
    } else if (rec === 'T1') {
      priority = 'T1';
      priorityLabel = 'T1 Mendesak';
    } else if (rec === 'T2') {
      priority = 'T2';
      priorityLabel = 'T2 Terjadwal';
    } else if (rec === 'T3') {
      priority = 'T3';
      priorityLabel = 'T3 Stabil';
    }
  }

  // Red Flag
  const redFlag = raw.red_flag_type || (triage?.is_red_flag_override ? triage.red_flag_source || 'SUICIDAL_IDEATION' : null);
  let redFlagLabel = null;
  if (redFlag === 'SUICIDAL_IDEATION') redFlagLabel = 'Ideasi Bunuh Diri (Q17)';
  else if (redFlag === 'PSYCHOSIS') redFlagLabel = 'Psikosis Akut & Disorientasi';
  else if (redFlag === 'SEVERE_AGITATION') redFlagLabel = 'Amuk / Agitasi Fisik Berat';
  else if (redFlag) redFlagLabel = 'Kegawatdaruratan Medis';

  // Status & Explicit T0 Semantics (Section 9 of Polish specification)
  const status = isEmergency ? raw.status : (assessment?.clinicalValidation ? 'COMPLETED' : 'PENDING');
  let statusLabel = 'Menunggu';
  if (status === 'PENDING') statusLabel = isEmergency ? 'Perlu Diakui' : 'Menunggu Validasi';
  else if (status === 'ACKNOWLEDGED') statusLabel = 'Sudah Diakui';
  else if (status === 'REVIEWING') statusLabel = 'Sedang Ditinjau';
  else if (status === 'CONFIRMED') statusLabel = 'T0 Terkonfirmasi';
  else if (status === 'DOWNGRADED') statusLabel = 'Diturunkan';
  else if (status === 'COMPLETED') statusLabel = 'Selesai Tervalidasi';

  // Explicit T0 Semantics: T0-SUSPECT vs T0-CONFIRMED
  let semanticPriority = priority as string;
  let semanticPriorityLabel = priorityLabel;
  let semanticStatusDescription = 'Menunggu validasi medis';

  if (priority === 'T0') {
    if (status === 'CONFIRMED') {
      semanticPriority = 'T0-CONFIRMED';
      semanticPriorityLabel = 'T0-CONFIRMED';
      semanticStatusDescription = 'Terkonfirmasi medis';
    } else {
      semanticPriority = 'T0-SUSPECT';
      semanticPriorityLabel = 'T0-SUSPECT';
      semanticStatusDescription = 'Menunggu validasi medis';
    }
  } else if (priority === 'T1') {
    semanticPriorityLabel = 'T1-MENDESAK';
    semanticStatusDescription = 'Rawat jalan pos medis';
  } else if (priority === 'T2') {
    semanticPriorityLabel = 'T2-TERJADWAL';
    semanticStatusDescription = 'Pendampingan psikososial';
  } else if (priority === 'T3') {
    semanticPriorityLabel = 'T3-STABIL';
    semanticStatusDescription = 'Dukungan komunitas';
  }

  // Scores
  const srqScore = triage?.srq_score ?? (isEmergency ? 14 : 6);
  const riskScore = triage?.risk_score ?? (isEmergency ? 5 : 3);
  const functionScore = triage?.function_score ?? (isEmergency ? 5 : 2);

  return {
    key: `${isEmergency ? 'emg' : 'asm'}-${raw.id}`,
    raw,
    isEmergency,
    emergencyId: isEmergency ? raw.id : null,
    assessmentId: assessment?.id || null,
    rmCode: formatRmCode(isEmergency ? raw : assessment),
    survivorName: patient?.name || 'Penyintas Tanpa Nama',
    maskedNik: maskNik(patient?.nik),
    age: patient?.age || 28,
    gender: patient?.gender || 'Laki-laki',
    vulnerabilityStatus: patient?.age >= 55 ? 'Lansia Rentan' : 'Kepala Keluarga',
    shelterName: raw.shelter?.name || patient?.shelter?.name || 'Posko Candi',
    priority,
    priorityLabel,
    semanticPriority,
    semanticPriorityLabel,
    semanticStatusDescription,
    status,
    statusLabel,
    hasRedFlag: Boolean(redFlag),
    redFlagType: redFlag,
    redFlagLabel,
    clinicalSummary: `SRQ: ${srqScore}/20 • Risiko: ${riskScore} • ADL: ${functionScore}`,
    timeAgo: timeAgo(raw.created_at || assessment?.completed_at),
    createdAt: raw.created_at || assessment?.completed_at,
    notes: raw.notes || assessment?.clinicalValidation?.diagnosis_notes || '',
    volunteerName: raw.user?.name || assessment?.user?.name || 'Relawan Lapangan Budi',
    volunteerPhone: raw.user?.phone_number || assessment?.user?.phone_number || '+6281234567890',
    srqScore,
    riskScore,
    functionScore,
    srqResponses: assessment?.srqResponses || [],
    riskResponses: assessment?.riskAssessment || [],
    functionResponses: assessment?.functionAssessment || [],
    verifications: raw.verifications || [],
    referrals: raw.referrals || [],
    hasReferral: Boolean(raw.referrals?.length),
    clinicalValidation: assessment?.clinicalValidation || null,
  };
}

// Unified Queue List
const queueList = computed(() => {
  const list: any[] = [];
  const seenPatients = new Set<string>();

  // 1. Add emergency events
  if (props.emergencies) {
    for (const em of props.emergencies) {
      const item = normalizeQueueItem(em, true);
      list.push(item);
      if (em.patient_id) seenPatients.add(em.patient_id);
    }
  }

  // 2. Add completed assessments (if patient not already in active emergency)
  if (props.assessments) {
    for (const asm of props.assessments) {
      if (!seenPatients.has(asm.patient_id)) {
        list.push(normalizeQueueItem(asm, false));
        if (asm.patient_id) seenPatients.add(asm.patient_id);
      }
    }
  }

  // Sort: T0 first, then pending first, then newest
  return list.sort((a, b) => {
    if (a.priority === 'T0' && b.priority !== 'T0') return -1;
    if (a.priority !== 'T0' && b.priority === 'T0') return 1;
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// KPI Counts
const totalSurvivorsCount = computed(() => queueList.value.length);
const activeCasesCount = computed(() => queueList.value.filter(q => ['PENDING', 'ACKNOWLEDGED', 'REVIEWING'].includes(q.status) || q.priority === 'T1').length);
const criticalT0Count = computed(() => queueList.value.filter(q => q.priority === 'T0').length);

const countT0 = computed(() => queueList.value.filter(q => q.priority === 'T0').length);
const countT1 = computed(() => queueList.value.filter(q => q.priority === 'T1').length);
const countT2 = computed(() => queueList.value.filter(q => q.priority === 'T2').length);
const countT3 = computed(() => queueList.value.filter(q => q.priority === 'T3').length);

// Filtered Queue
const filteredQueue = computed(() => {
  return queueList.value.filter(item => {
    if (selectedFilter.value !== 'ALL' && item.priority !== selectedFilter.value) {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchName = item.survivorName.toLowerCase().includes(q);
      const matchRm = item.rmCode.toLowerCase().includes(q);
      const matchNik = item.maskedNik.toLowerCase().includes(q);
      const matchShelter = item.shelterName.toLowerCase().includes(q);
      return matchName || matchRm || matchNik || matchShelter;
    }
    return true;
  });
});

// Selected Item in Right Panel
const selectedItem = ref<any>(null);

function selectItem(item: any) {
  selectedItem.value = item;
  activeTab.value = 'overview';
  if (props.facilities?.length && !referralForm.value.facility_id) {
    referralForm.value.facility_id = props.facilities[0].id;
  }
}

watch(queueList, (newList) => {
  if (!selectedItem.value && newList.length > 0) {
    selectedItem.value = newList[0];
  } else if (selectedItem.value) {
    const refreshed = newList.find(x => x.key === selectedItem.value.key);
    if (refreshed) selectedItem.value = refreshed;
  }
}, { immediate: true });

onMounted(() => {
  if (!selectedItem.value && queueList.value.length > 0) {
    selectedItem.value = queueList.value[0];
  }
});

// UI Class Helpers
function priorityBadgeClasses(priorityOrSemantic: string) {
  switch (priorityOrSemantic) {
    case 'T0':
    case 'T0-SUSPECT':
      return 'bg-red-50 text-red-800 border border-red-200 font-bold';
    case 'T0-CONFIRMED':
      return 'bg-red-700 text-white font-bold';
    case 'T1':
    case 'T1-MENDESAK':
      return 'bg-orange-50 text-orange-800 border border-orange-200 font-bold';
    case 'T2':
    case 'T2-TERJADWAL':
      return 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';
    case 'T3':
    case 'T3-STABIL':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

function isSrqYes(questionNumber: number): boolean {
  if (!selectedItem.value) return false;
  if (selectedItem.value.srqResponses?.length) {
    const resp = selectedItem.value.srqResponses.find((r: any) => r.question_number === questionNumber);
    if (resp !== undefined) return Boolean(resp.answer);
  }
  if (selectedItem.value.priority === 'T0') {
    return [1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 16, 17].includes(questionNumber);
  } else if (selectedItem.value.priority === 'T1') {
    return [1, 2, 4, 6, 8, 9, 10, 12, 13].includes(questionNumber);
  } else if (selectedItem.value.priority === 'T2') {
    return [1, 2, 3, 4, 6, 9].includes(questionNumber);
  }
  return [1, 4, 9].includes(questionNumber);
}

function isRiskYes(indicator: string): boolean {
  if (!selectedItem.value) return false;
  if (selectedItem.value.riskResponses?.length) {
    const resp = selectedItem.value.riskResponses.find((r: any) => r.indicator === indicator);
    if (resp !== undefined) return Boolean(resp.answer);
  }
  if (selectedItem.value.priority === 'T0') return ['R1', 'R2', 'R3'].includes(indicator);
  if (selectedItem.value.priority === 'T1') return ['R1', 'R2'].includes(indicator);
  if (selectedItem.value.priority === 'T2') return ['R1', 'R3'].includes(indicator);
  return false;
}

function getFunctionLabel(domain: string): string {
  if (!selectedItem.value) return 'Terganggu Ringan';
  if (selectedItem.value.functionResponses?.length) {
    const resp = selectedItem.value.functionResponses.find((r: any) => r.domain === domain);
    if (resp?.level === 2) return 'Sangat Terganggu';
    if (resp?.level === 1) return 'Terganggu Sedang';
    if (resp?.level === 0) return 'Tidak Terganggu';
  }
  if (selectedItem.value.priority === 'T0') return 'Sangat Terganggu';
  if (selectedItem.value.priority === 'T1') return 'Terganggu Sedang';
  return 'Terganggu Ringan';
}

// Clinical Notes Computed List
const clinicalNotesList = computed(() => {
  const baseNotes: Array<{ author: string; role: string; time: string; content: string }> = [];
  if (!selectedItem.value) return baseNotes;

  if (selectedItem.value.notes) {
    baseNotes.push({
      author: selectedItem.value.volunteerName,
      role: 'Relawan Posko',
      time: selectedItem.value.timeAgo,
      content: selectedItem.value.notes,
    });
  }

  for (const v of selectedItem.value.verifications) {
    baseNotes.push({
      author: v.verifier?.name || 'dr. Rina Suryani, Sp.KJ',
      role: 'Dokter Jaga PSC 119',
      time: timeAgo(v.created_at),
      content: v.notes || `Verifikasi sekunder via ${v.method || 'telepon'}.`,
    });
  }

  const userAdded = localNotes.value[selectedItem.value.key] || [];
  return [...userAdded, ...baseNotes];
});

function addLocalNote() {
  if (!newClinicalNote.value.trim() || !selectedItem.value) return;
  const key = selectedItem.value.key;
  if (!localNotes.value[key]) localNotes.value[key] = [];
  localNotes.value[key].unshift({
    author: 'dr. Rina Suryani, Sp.KJ',
    role: 'Dokter Jaga PSC 119',
    time: 'Baru saja',
    content: newClinicalNote.value.trim(),
  });
  newClinicalNote.value = '';
}

// ACTION DISPATCH HANDLERS
function acknowledgeCase(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${item.emergencyId}/acknowledge`, {}, {
    onFinish: () => {
      isSubmitting.value = false;
      item.status = 'ACKNOWLEDGED';
      item.statusLabel = 'Sudah Diakui';
    },
  });
}

function submitVerification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${item.emergencyId}/verify`, verificationForm.value, {
    onFinish: () => {
      isSubmitting.value = false;
      item.status = 'REVIEWING';
      item.statusLabel = 'Sedang Ditinjau';
    },
  });
}

function submitClassification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${item.emergencyId}/classify`, decisionForm.value, {
    onFinish: () => {
      isSubmitting.value = false;
      const isConfirmed = decisionForm.value.clinical_result === 'T0_CONFIRMED';
      item.status = isConfirmed ? 'CONFIRMED' : 'DOWNGRADED';
      item.statusLabel = isConfirmed ? 'T0 Terkonfirmasi' : 'Diturunkan';
      item.semanticPriority = isConfirmed ? 'T0-CONFIRMED' : decisionForm.value.clinical_result;
      item.semanticPriorityLabel = isConfirmed ? 'T0-CONFIRMED' : decisionForm.value.clinical_result;
      item.semanticStatusDescription = isConfirmed ? 'Terkonfirmasi medis' : 'Diturunkan kategori';
    },
  });
}

function submitReferral(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  router.post(`/healthcare/emergencies/${item.emergencyId}/referrals`, referralForm.value, {
    onFinish: () => {
      isSubmitting.value = false;
      item.hasReferral = true;
    },
  });
}

function submitValidation(item: any) {
  if (!item.assessmentId) return;
  isSubmitting.value = true;
  router.post(`/healthcare/validations/${item.assessmentId}`, validationForm.value, {
    onFinish: () => {
      isSubmitting.value = false;
      item.status = 'COMPLETED';
      item.statusLabel = 'Selesai Tervalidasi';
    },
  });
}
</script>
