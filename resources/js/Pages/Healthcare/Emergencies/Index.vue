<template>
  <HealthcareLayout>
    <div class="space-y-4">
      <!-- 1. TOP KPI SUMMARY ROW (Shorter Vertically, Minimalist, High Contrast) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- KPI 1: Total Antrean -->
        <div class="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">TOTAL ANTREAN</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-slate-900 tracking-tight">{{ totalSurvivorsCount }}</span>
              <span class="text-xs font-semibold text-slate-500">Penyintas</span>
            </div>
            <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Terdata aktif</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- KPI 2: Sedang Aktif -->
        <div class="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">SEDANG AKTIF</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-amber-600 tracking-tight">{{ activeCasesCount }}</span>
              <span class="text-xs font-semibold text-slate-500">Kasus</span>
            </div>
            <span class="text-[10px] text-amber-700 font-medium block mt-0.5">Atensi operasional nakes</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <!-- KPI 3: Zona Merah -->
        <div class="bg-white rounded-xl p-3 border border-rose-200/90 shadow-2xs flex items-center justify-between bg-rose-50/20">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">ZONA MERAH</span>
            <div class="flex items-baseline space-x-1.5 mt-0.5">
              <span class="text-2xl font-black text-rose-600 tracking-tight">{{ criticalT0Count }}</span>
              <span class="text-xs font-semibold text-rose-700">T0 / prioritas tinggi</span>
            </div>
            <span class="text-[10px] text-rose-700 font-medium block mt-0.5">Prioritas evaluasi medis</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 border border-rose-200 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <!-- KPI 4: Waktu Respons Medis -->
        <div class="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">WAKTU RESPONS MEDIS</span>
            <div class="flex items-baseline space-x-1 mt-0.5">
              <span class="text-2xl font-black text-slate-900 tracking-tight">6.8</span>
              <span class="text-xs font-semibold text-slate-500">menit</span>
            </div>
            <span class="text-[10px] text-slate-500 font-medium block mt-0.5">Target SLA PSC &lt; 15 menit</span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-100 shrink-0">
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

      <div v-if="actionErrors.length > 0" class="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs font-medium text-rose-900 space-y-1">
        <p class="font-bold">Perhatian pada tindakan medis:</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li v-for="err in actionErrors" :key="err.key">{{ err.message }}</li>
        </ul>
      </div>

      <!-- 2. TWO-PANEL WORKSPACE (Ratio: Left ~32%, Right ~68%) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        <!-- LEFT PANEL: ANTREAN TRIASE & DARURAT (~32% width) -->
        <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
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
                type="button"
                @click="searchQuery = ''"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <!-- Priority Filter Pills -->
            <div class="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-semibold scrollbar-none">
              <button
                type="button"
                @click="selectedFilter = 'ALL'"
                :class="selectedFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
                class="px-2.5 py-1 rounded-md transition shrink-0"
              >
                Semua
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T0'"
                :class="selectedFilter === 'T0'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-md transition shrink-0 flex items-center space-x-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>T0 Darurat</span>
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T1'"
                :class="selectedFilter === 'T1'
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-white text-orange-700 hover:bg-orange-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-md transition shrink-0"
              >
                T1 Mendesak
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T2'"
                :class="selectedFilter === 'T2'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-white text-amber-700 hover:bg-amber-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-md transition shrink-0"
              >
                T2 Terjadwal
              </button>
              <button
                type="button"
                @click="selectedFilter = 'T3'"
                :class="selectedFilter === 'T3'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-md transition shrink-0"
              >
                T3 Stabil
              </button>
            </div>
          </div>

          <!-- Queue List Items (Scannable Cards with Left Severity Indicator) -->
          <div class="divide-y divide-slate-100 overflow-y-auto max-h-[660px]">
            <div
              v-for="item in filteredQueue"
              :key="item.queueId"
              @click="selectQueueItem(item.queueId)"
              class="p-3 transition cursor-pointer text-xs space-y-1.5 relative border-l-4"
              :class="[
                getSeverityBorderClass(item.semanticPriority),
                selectedQueueId === item.queueId
                  ? 'bg-white ring-2 ring-teal-600/20 shadow-xs'
                  : 'bg-white/90 hover:bg-white hover:border-slate-300'
              ]"
            >
              <!-- Card Line 1: Status & Time -->
              <div class="flex items-center justify-between">
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  :class="priorityBadgeClasses(item.semanticPriority)"
                >
                  {{ item.semanticPriorityLabel }}
                </span>
                <span class="text-[10px] text-slate-400 font-medium">
                  {{ item.timeAgo }}
                </span>
              </div>

              <!-- Card Line 2: Survivor Name & RM Code -->
              <div class="flex items-baseline justify-between gap-1.5">
                <h4 class="text-xs font-bold text-slate-900 truncate">
                  {{ item.survivorName }}
                </h4>
                <span class="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                  {{ item.rmCode }}
                </span>
              </div>

              <!-- Card Line 3: Clinical Reason -->
              <p v-if="item.redFlagLabel" class="text-[11px] font-medium text-rose-700 truncate">
                {{ item.redFlagLabel }}
              </p>
              <p v-else class="text-[11px] text-slate-500 truncate">
                {{ item.clinicalSummary }}
              </p>

              <!-- Card Line 4: Location & Status Action -->
              <div class="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                <span class="truncate flex items-center gap-1">
                  <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {{ item.shelterName }}
                </span>
                <span class="font-semibold text-[10px]" :class="item.status === 'PENDING' ? 'text-rose-600 font-bold' : 'text-slate-600'">
                  {{ item.status === 'PENDING' ? 'Perlu Diakui' : item.statusLabel }}
                </span>
              </div>
            </div>

            <!-- Empty Queue State -->
            <div v-if="filteredQueue.length === 0" class="p-8 text-center text-xs text-slate-400 space-y-1">
              <p class="font-bold text-slate-600">Tidak ada antrean yang cocok</p>
              <p class="text-slate-400 text-[11px]">Ubah filter prioritas atau kata kunci pencarian.</p>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: ONE LARGE UNIFIED CASE WORKSPACE (~68% width) -->
        <main class="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden min-h-[660px]">
          <template v-if="selectedItem">
            <!-- Surface 1: Unified Header Bar (Survivor, RM, Status & Prominent Action CTA) -->
            <div class="p-5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <h2 class="text-xl font-black text-slate-900 tracking-tight">
                    {{ selectedItem.survivorName }}
                  </h2>
                  <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
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

              <!-- Primary Emergency CTA (Right next to status, highly visible) -->
              <div>
                <button
                  v-if="selectedItem.isEmergency && selectedItem.status === 'PENDING'"
                  type="button"
                  @click="acknowledgeCase(selectedItem)"
                  :disabled="isSubmitting"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition tracking-wide flex items-center gap-1.5"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AKUI KASUS</span>
                </button>
                <button
                  v-else
                  type="button"
                  @click="activeTab = 'actions'"
                  class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <span>Buka Form Tindakan</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Surface 2: Flatter Integrated Metadata Row (NO separate card boxes) -->
            <div class="px-5 py-3 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
              <div class="sm:pr-2">
                <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">NIK</span>
                <strong class="font-mono text-slate-800 text-xs mt-0.5 block">{{ selectedItem.maskedNik }}</strong>
                <span v-if="selectedItem.maskedNik !== 'NIK tidak tersedia'" class="text-[10px] text-teal-700 font-medium block mt-0.5">✓ Terdaftar</span>
                <span v-else class="text-[10px] text-slate-400 font-medium block mt-0.5">Tidak tersedia</span>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Usia</span>
                <strong class="text-slate-800 text-xs mt-0.5 block">{{ selectedItem.age !== null ? `${selectedItem.age} tahun` : 'Usia tidak tersedia' }}</strong>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Jenis Kelamin</span>
                <strong class="text-slate-800 text-xs mt-0.5 block">{{ selectedItem.gender }}</strong>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Status Kerentanan</span>
                <strong class="text-slate-800 text-xs mt-0.5 block">{{ selectedItem.vulnerabilityStatus }}</strong>
              </div>
              <div class="pt-2 sm:pt-0 sm:pl-3">
                <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Lokasi Posko</span>
                <strong class="text-slate-800 text-xs mt-0.5 block truncate">{{ selectedItem.shelterName }}</strong>
                <span class="text-[10px] text-slate-500 block truncate mt-0.5">Relawan: {{ selectedItem.volunteerName }}</span>
              </div>
            </div>

            <!-- Action Feedback Notification Banner -->
            <div v-if="actionFeedback" class="mx-5 mt-3 p-3 rounded-lg text-xs font-semibold flex items-center justify-between" :class="actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'">
              <div class="flex items-center space-x-2">
                <span>{{ actionFeedback.type === 'success' ? '✓' : '⚠' }}</span>
                <span>{{ actionFeedback.message }}</span>
              </div>
              <button type="button" @click="actionFeedback = null" class="text-slate-400 hover:text-slate-600 text-sm font-bold">&times;</button>
            </div>

            <!-- Surface 3: Clean Clinical Tab Navigation Bar -->
            <nav class="px-5 border-b border-slate-200/80 flex items-center space-x-6 text-xs font-semibold bg-white">
              <button
                type="button"
                @click="activeTab = 'overview'"
                :class="activeTab === 'overview'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Ringkasan
              </button>

              <button
                type="button"
                @click="activeTab = 'assessment'"
                :class="activeTab === 'assessment'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Asesmen (SRQ-20)
              </button>

              <button
                type="button"
                @click="activeTab = 'notes'"
                :class="activeTab === 'notes'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Catatan Medis
              </button>

              <button
                type="button"
                @click="activeTab = 'actions'"
                :class="activeTab === 'actions'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Tindakan & Rujukan
              </button>

              <button
                type="button"
                @click="activeTab = 'history'"
                :class="activeTab === 'history'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Riwayat
              </button>
            </nav>

            <!-- Surface 4: Unified Content Area -->
            <div class="p-5 space-y-4 flex-1 overflow-y-auto">
              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 1: RINGKASAN (OVERVIEW) -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'overview'" class="space-y-4">
                
                <!-- A. Red Flag Alert Box (Restrained Red, Left Border Accent) -->
                <div
                  v-if="selectedItem.hasRedFlag"
                  class="rounded-xl border border-rose-200/90 border-l-4 border-l-rose-600 bg-rose-50/50 p-4 space-y-2.5 shadow-2xs"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-rose-600 font-black">⚠</span>
                      <h4 class="text-xs font-bold text-rose-900 uppercase tracking-wide">
                        TANDA BAHAYA KLINIS (RED FLAG TERDETEKSI)
                      </h4>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-rose-800 border border-rose-200 shadow-2xs">
                      {{ selectedItem.semanticPriorityLabel }}
                    </span>
                  </div>

                  <p class="text-xs text-rose-950 font-bold">
                    Kategori Bahaya: {{ selectedItem.redFlagLabel }}
                  </p>
                  
                  <div class="p-2.5 bg-white rounded-lg border border-rose-200/80 text-xs text-slate-800">
                    <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Catatan Laporan Lapangan</span>
                    <p class="mt-0.5 text-slate-700 italic">"{{ selectedItem.notes || 'Catatan laporan lapangan tidak tersedia.' }}"</p>
                  </div>

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                    <span class="text-rose-800 font-medium">
                      Penyintas tidak boleh ditinggal sendiri. Prioritaskan stabilisasi dan rujukan.
                    </span>
                    <button
                      v-if="selectedItem.status === 'PENDING'"
                      type="button"
                      @click="acknowledgeCase(selectedItem)"
                      class="self-start sm:self-auto px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-md shadow-xs transition"
                    >
                      AKUI KASUS
                    </button>
                  </div>
                </div>

                <!-- B. Compact 3-Column Clinical Score Summary (Real values only, no fabricated numbers per Section 4 & 5) -->
                <div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                    Ringkasan Hasil Skrining
                  </span>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                    <!-- Col 1: SRQ-20 -->
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SRQ-20</span>
                      <div v-if="selectedItem.srqScore !== null" class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.srqScore }}</span>
                        <span class="text-xs text-slate-400 font-semibold">/ 20</span>
                      </div>
                      <div v-else class="text-lg font-bold text-slate-400">-</div>
                      <span v-if="selectedItem.srqScore !== null" class="text-[11px] font-bold block" :class="selectedItem.srqScore >= 6 ? 'text-rose-600' : 'text-slate-600'">
                        {{ selectedItem.srqScore >= 6 ? 'Di atas ambang penapisan (≥ 6)' : 'Dalam batas normal (< 6)' }}
                      </span>
                      <span v-else class="text-[11px] text-slate-400 block font-medium">Data SRQ-20 tidak tersedia</span>
                    </div>

                    <!-- Col 2: Faktor Risiko -->
                    <div class="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Faktor Risiko Bencana</span>
                      <div v-if="selectedItem.riskScore !== null" class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.riskScore }}</span>
                        <span class="text-xs text-slate-400 font-semibold">Bobot</span>
                      </div>
                      <div v-else class="text-lg font-bold text-slate-400">-</div>
                      <span v-if="selectedItem.riskScore !== null" class="text-[11px] font-bold block text-slate-700">
                        {{ selectedItem.riskScore >= 3 ? 'Risiko Tinggi' : 'Risiko Rendah' }}
                      </span>
                      <span v-else class="text-[11px] text-slate-400 block font-medium">Data faktor risiko tidak tersedia</span>
                    </div>

                    <!-- Col 3: Fungsi / ADL -->
                    <div class="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fungsi / ADL</span>
                      <div v-if="selectedItem.functionScore !== null" class="flex items-baseline space-x-1">
                        <span class="text-2xl font-black text-slate-900">{{ selectedItem.functionScore }}</span>
                        <span class="text-xs text-slate-400 font-semibold">Tingkat</span>
                      </div>
                      <div v-else class="text-lg font-bold text-slate-400">-</div>
                      <span v-if="selectedItem.functionScore !== null" class="text-[11px] font-bold block text-slate-700">
                        {{ selectedItem.functionScore >= 3 ? 'Terganggu Berat' : 'Terganggu Ringan' }}
                      </span>
                      <span v-else class="text-[11px] text-slate-400 block font-medium">Data fungsi tidak tersedia</span>
                    </div>
                  </div>
                </div>

                <!-- C. Emergency Response Workflow Stepper (Horizontal & Compact) -->
                <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Alur Respons Medis & Komando PSC 119
                    </h4>
                    <span class="text-[10px] font-semibold text-slate-400">
                      SOP Tanggap Medis Bencana
                    </span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <!-- Step 1 -->
                    <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-0.5">
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
                        ? 'border-slate-300 bg-white ring-1 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-700">2. Verifikasi</span>
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
                        ? 'border-slate-300 bg-white ring-1 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-700">3. Klasifikasi</span>
                        <span :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-emerald-700' : 'text-slate-400'">
                          {{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? '✓' : 'Menunggu' }}
                        </span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Klasifikasi Triase</p>
                      <p class="text-[10px] text-slate-400">Validasi klinis nakes</p>
                    </div>

                    <!-- Step 4 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="selectedItem.hasReferral
                        ? 'border-slate-300 bg-white ring-1 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span class="text-slate-700">4. Rujukan</span>
                        <span :class="selectedItem.hasReferral ? 'text-emerald-700' : 'text-slate-400'">
                          {{ selectedItem.hasReferral ? '✓' : 'Disposisi' }}
                        </span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Rujukan & Evakuasi</p>
                      <p class="text-[10px] text-slate-400">Ambulans PSC 119</p>
                    </div>
                  </div>
                </div>

                <!-- D. Action Footer (Tindakan Segera) -->
                <div class="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <h5 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">TINDAKAN SEGERA</h5>
                    <p class="text-slate-500 text-[11px] mt-0.5">Ambil tindakan klinis atau buat rujukan langsung untuk penyintas ini.</p>
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
                      class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <span>Buka Form Tindakan</span>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
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
                  <span v-if="selectedItem.srqScore !== null" class="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    Skor Ya: {{ selectedItem.srqScore }} / 20
                  </span>
                  <span v-else class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Skor: Belum tersedia
                  </span>
                </div>

                <!-- Empty State if no SRQ answers exist (Explicit empty state per Section 4 & 5) -->
                <div v-if="!selectedItem.srqResponses || selectedItem.srqResponses.length === 0" class="py-8 px-4 text-center bg-white rounded-xl border border-slate-200 space-y-2">
                  <div class="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                  <h5 class="text-xs font-bold text-slate-800">Data SRQ-20 tidak tersedia</h5>
                  <p class="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Penyintas ini masuk antrean melalui penapisan tanda bahaya darurat (Red Flag) langsung di posko atau kuesioner SRQ-20 belum diadministrasikan secara lengkap.
                  </p>
                </div>

                <!-- SRQ-20 Questions Table/List if answers exist -->
                <div v-else class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div
                    v-for="(q, idx) in srqQuestionList"
                    :key="idx"
                    :class="[
                      'p-2.5 flex items-center justify-between gap-3',
                      getSrqAnswer(idx + 1) === true
                        ? (idx + 1 === 17 ? 'bg-rose-50/70 text-rose-950 font-bold' : 'bg-slate-50/50 text-slate-900 font-medium')
                        : 'text-slate-600'
                    ]"
                  >
                    <div class="flex items-start space-x-2">
                      <span
                        class="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                        :class="getSrqAnswer(idx + 1) === true ? (idx + 1 === 17 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white') : 'bg-slate-200 text-slate-600'"
                      >
                        {{ idx + 1 }}
                      </span>
                      <span>{{ q }}</span>
                    </div>
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                      :class="getSrqAnswer(idx + 1) === true ? (idx + 1 === 17 ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white') : (getSrqAnswer(idx + 1) === false ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-400 border border-dashed border-slate-200')"
                    >
                      {{ getSrqAnswer(idx + 1) === true ? 'YA' : (getSrqAnswer(idx + 1) === false ? 'TIDAK' : 'Belum diisi') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 3: CATATAN MEDIS -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'notes'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Catatan Klinis & Observasi Nakes</h4>
                  <span class="text-[11px] text-slate-400">Audit Trail Terenkripsi</span>
                </div>

                <!-- Input Catatan Baru -->
                <div class="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
                  <label class="text-[11px] font-bold text-slate-700 block">Tambah Catatan Observasi / Konsultasi Telemedis</label>
                  <textarea
                    v-model="newClinicalNote"
                    rows="3"
                    placeholder="Tuliskan hasil evaluasi klinis, observasi emosional, atau instruksi khusus untuk relawan di posko..."
                    class="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  ></textarea>
                  <div class="flex justify-end">
                    <button
                      type="button"
                      @click="submitNote"
                      :disabled="!newClinicalNote.trim()"
                      class="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                    >
                      Simpan Catatan
                    </button>
                  </div>
                </div>

                <!-- Riwayat Catatan -->
                <div class="space-y-2.5">
                  <div
                    v-for="(n, nIdx) in combinedNotes"
                    :key="nIdx"
                    class="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs"
                  >
                    <div class="flex items-center justify-between text-[11px] text-slate-500">
                      <div class="flex items-center space-x-1.5">
                        <strong class="text-slate-800">{{ n.author }}</strong>
                        <span>•</span>
                        <span class="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">{{ n.role }}</span>
                      </div>
                      <span>{{ n.time }}</span>
                    </div>
                    <p class="text-slate-700 mt-1 whitespace-pre-line">{{ n.content }}</p>
                  </div>
                </div>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 4: TINDAKAN & RUJUKAN -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'actions'" class="space-y-5">
                <!-- If T0 Emergency Workflow -->
                <template v-if="selectedItem.isEmergency">
                  <!-- Section A: Verifikasi Medis Sekunder -->
                  <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Verifikasi Medis Sekunder (Tele-Triase)</h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Tahap Wajib T0</span>
                    </div>

                    <form @submit.prevent="submitVerification" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Metode Kontak Posko / Relawan</label>
                        <select
                          v-model="verificationForm.method"
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        >
                          <option value="PHONE">Telepon Seluler (Voice Call)</option>
                          <option value="RADIO">Radio Komunikasi Darurat / HT</option>
                          <option value="VIDEO">Video Call / WhatsApp Telemedis</option>
                          <option value="IN_PERSON">Kunjungan Langsung Tim Nakes Lapangan</option>
                        </select>
                      </div>

                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Catatan Hasil Verifikasi Langsung</label>
                        <textarea
                          v-model="verificationForm.notes"
                          rows="2"
                          placeholder="Konfirmasi kondisi fisik, tingkat kesadaran, saturasi, atau intensitas ideasi bunuh diri dari relawan..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        ></textarea>
                      </div>

                      <div class="flex justify-end">
                        <button
                          type="submit"
                          :disabled="isSubmitting"
                          class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                        >
                          Simpan Verifikasi
                        </button>
                      </div>
                    </form>
                  </div>

                  <!-- Section B: Keputusan Klasifikasi Nakes -->
                  <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Keputusan Klasifikasi Triase</h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Konfirmasi / Penyesuaian</span>
                    </div>

                    <form @submit.prevent="submitClassification" class="space-y-3 text-xs">
                      <div class="grid grid-cols-2 gap-2">
                        <label
                          class="p-3 rounded-lg border cursor-pointer flex flex-col space-y-1 transition"
                          :class="decisionForm.clinical_result === 'T0_CONFIRMED' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 hover:bg-slate-50'"
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-rose-700">T0 — Terkonfirmasi</span>
                            <input type="radio" value="T0_CONFIRMED" v-model="decisionForm.clinical_result" class="text-rose-600" />
                          </div>
                          <p class="text-[10px] text-slate-500">Kedaruratan jiwa terbukti, butuh evakuasi segera ke RS Jiwa / Faskes Rujukan.</p>
                        </label>

                        <label
                          class="p-3 rounded-lg border cursor-pointer flex flex-col space-y-1 transition"
                          :class="decisionForm.clinical_result === 'DOWNGRADED' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 hover:bg-slate-50'"
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-teal-700">Turunkan Status (T1)</span>
                            <input type="radio" value="DOWNGRADED" v-model="decisionForm.clinical_result" class="text-teal-600" />
                          </div>
                          <p class="text-[10px] text-slate-500">Kondisi stabil, dapat ditangani melalui konsultasi terjadwal di posko.</p>
                        </label>
                      </div>

                      <div class="flex justify-end">
                        <button
                          type="submit"
                          :disabled="isSubmitting"
                          class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                        >
                          Tetapkan Klasifikasi
                        </button>
                      </div>
                    </form>
                  </div>

                  <!-- Section C: Penerbitan Rujukan Medis ke Faskes (Separated from dispatch per Section 14) -->
                  <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Penerbitan Rujukan Medis ke Faskes</h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Disposisi Rujukan Medis</span>
                    </div>

                    <div v-if="selectedItem.status !== 'CONFIRMED'" class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                      Rujukan medis darurat hanya dapat diterbitkan setelah status T0 dikonfirmasi oleh tenaga medis pada tahap klasifikasi.
                    </div>

                    <form @submit.prevent="submitReferral" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Rumah Sakit / Faskes Tujuan</label>
                        <select
                          v-model="referralForm.facility_id"
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        >
                          <option v-for="f in facilities" :key="f.id" :value="f.id">
                            {{ f.name }} ({{ f.type }}) — Sisa Bed: {{ f.bed_capacity || 4 }}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Instruksi Medis untuk Tim Rujukan</label>
                        <textarea
                          v-model="referralForm.notes"
                          rows="2"
                          placeholder="Instruksi medis saat transport / penanganan awal di faskes..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        ></textarea>
                      </div>

                      <div class="flex justify-end">
                        <button
                          type="submit"
                          :disabled="isSubmitting || selectedItem.status !== 'CONFIRMED'"
                          class="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition"
                        >
                          Terbitkan Rujukan Medis
                        </button>
                      </div>
                    </form>
                  </div>
                </template>

                <!-- If Non-T0 Assessment Validation -->
                <template v-else>
                  <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Validasi Hasil Skrining Asesmen</h4>
                    <form @submit.prevent="submitValidation" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Konfirmasi Kategori Triase Nakes</label>
                        <select
                          v-model="validationForm.clinical_result"
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        >
                          <option value="T1">T1 — Butuh Perhatian Khusus / Rujuk Medis</option>
                          <option value="T2">T2 — Dukungan Psikologis Terjadwal (PFA)</option>
                          <option value="T3">T3 — Stabil / Penguatan Komunitas</option>
                        </select>
                      </div>

                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Catatan Validasi Klinis / Resume Asesmen</label>
                        <textarea
                          v-model="validationForm.diagnosis_notes"
                          rows="2"
                          placeholder="Catatan hasil validasi klinis..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        ></textarea>
                      </div>

                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Rencana Intervensi Lanjutan</label>
                        <textarea
                          v-model="validationForm.intervention_plan"
                          rows="2"
                          placeholder="Rencana konseling lanjutan atau intervensi posko..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        ></textarea>
                      </div>

                      <div class="pt-1">
                        <label class="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" v-model="validationForm.referral_required" class="rounded text-teal-600" />
                          <span class="text-xs font-bold text-slate-800">Rekomendasikan Rujukan ke Rumah Sakit</span>
                        </label>
                      </div>

                      <div v-if="validationForm.referral_required">
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Faskes Rujukan</label>
                        <select
                          v-model="validationForm.facility_id"
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        >
                          <option v-for="f in facilities" :key="f.id" :value="f.id">
                            {{ f.name }} ({{ f.type }})
                          </option>
                        </select>
                      </div>

                      <div class="flex justify-end">
                        <button
                          type="submit"
                          :disabled="isSubmitting"
                          class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                        >
                          Simpan Validasi Klinis
                        </button>
                      </div>
                    </form>
                  </div>
                </template>
              </div>

              <!-- ══════════════════════════════════════════════ -->
              <!-- TAB 5: RIWAYAT KASUS -->
              <!-- ══════════════════════════════════════════════ -->
              <div v-if="activeTab === 'history'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Rekam Jejak Operasional Kasus</h4>
                  <span class="text-[11px] text-slate-400">ID Rekam: {{ selectedItem.rmCode }}</span>
                </div>

                <!-- Timeline Audit Trail -->
                <div class="border-l-2 border-slate-200 ml-3 pl-4 space-y-4 text-xs">
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
                    <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-rose-600 ring-4 ring-white"></span>
                    <span class="text-[10px] font-bold text-rose-700 block">Eskalasi Gawat Darurat</span>
                    <p class="text-xs font-bold text-rose-900">Pemicu Red Flag: {{ selectedItem.redFlagLabel }}</p>
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
function getSeverityBorderClass(priority: string): string {
  switch (priority) {
    case 'T0_CONFIRMED':
    case 'T0_SUSPECT':
    case 'T0':
      return 'border-l-rose-600';
    case 'T1':
      return 'border-l-orange-500';
    case 'T2':
      return 'border-l-amber-500';
    case 'T3':
      return 'border-l-emerald-500';
    default:
      return 'border-l-slate-300';
  }
}

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
  if (!raw) return 'RM-BELUM-TERBIT';
  const hex = String(raw).replace(/-/g, '').slice(-6).toUpperCase();
  return `RM-2026-${hex.padStart(6, '0')}`;
}

// Helper: Mask NIK (Real mask or explicit empty state)
function maskNik(nik?: string): string {
  if (!nik || nik.length < 8) return 'NIK tidak tersedia';
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

// Normalize Queue Item (Strictly real data only — no fabricated clinical numbers or patient info)
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

  // Red Flag: Real evidence only (no automatic fallback to suicidal ideation)
  const redFlag = raw.red_flag_type || (triage?.is_red_flag_override ? triage.red_flag_source || null : null);
  let redFlagLabel = null;
  if (redFlag === 'SUICIDAL_IDEATION') redFlagLabel = 'Ideasi Bunuh Diri (Q17)';
  else if (redFlag === 'PSYCHOSIS') redFlagLabel = 'Psikosis Akut & Disorientasi';
  else if (redFlag === 'SEVERE_AGITATION') redFlagLabel = 'Amuk / Agitasi Fisik Berat';
  else if (redFlag) redFlagLabel = `Kedaruratan: ${redFlag}`;
  else redFlagLabel = 'Tanda Bahaya Lapangan';

  // Status & Explicit T0 Semantics
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

  // Scores: strictly real values, null if absent
  const srqScore = triage?.srq_score !== undefined && triage?.srq_score !== null ? Number(triage.srq_score) : null;
  const riskScore = triage?.risk_score !== undefined && triage?.risk_score !== null ? Number(triage.risk_score) : null;
  const functionScore = triage?.function_score !== undefined && triage?.function_score !== null ? Number(triage.function_score) : null;

  return {
    key: `${isEmergency ? 'emg' : 'asm'}-${raw.id}`,
    raw,
    isEmergency,
    emergencyId: isEmergency ? raw.id : null,
    assessmentId: assessment?.id || null,
    rmCode: formatRmCode(isEmergency ? raw : assessment),
    survivorName: patient?.name || 'Penyintas Tanpa Nama',
    maskedNik: maskNik(patient?.nik),
    age: patient?.age !== undefined && patient?.age !== null ? patient.age : null,
    gender: patient?.gender || 'Jenis kelamin tidak tersedia',
    vulnerabilityStatus: patient?.age && patient.age >= 55 ? 'Lansia Rentan' : (patient?.age && patient.age < 18 ? 'Anak Rentan' : 'Umum'),
    shelterName: raw.shelter?.name || patient?.shelter?.name || 'Posko tidak diketahui',
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
    clinicalSummary: srqScore !== null ? `SRQ: ${srqScore}/20 • Risiko: ${riskScore ?? '-'} • ADL: ${functionScore ?? '-'}` : 'Skrining Langsung Lapangan',
    timeAgo: timeAgo(raw.created_at || assessment?.completed_at),
    createdAt: raw.created_at || assessment?.completed_at,
    notes: raw.notes || assessment?.clinicalValidation?.diagnosis_notes || '',
    volunteerName: raw.user?.name || assessment?.user?.name || 'Relawan tidak tersedia',
    volunteerPhone: raw.user?.phone_number || assessment?.user?.phone_number || null,
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

// Unified Queue List (DO NOT dedup assessments by person per Section 13)
const queueList = computed(() => {
  const list: any[] = [];
  const linkedAssessmentIds = new Set<string>();

  // 1. Add emergency events
  if (props.emergencies) {
    for (const em of props.emergencies) {
      const item = normalizeQueueItem(em, true);
      list.push(item);
      if (em.assessment_id) linkedAssessmentIds.add(em.assessment_id);
    }
  }

  // 2. Add completed assessments (keep all individual assessment RM records distinct)
  if (props.assessments) {
    for (const asm of props.assessments) {
      if (!linkedAssessmentIds.has(asm.id)) {
        list.push(normalizeQueueItem(asm, false));
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

// Getter for SRQ answers (Strictly real data — returns null if answer not present per Section 5)
function getSrqAnswer(questionNumber: number): boolean | null {
  if (!selectedItem.value?.srqResponses?.length) return null;
  const resp = selectedItem.value.srqResponses.find((r: any) => r.question_number === questionNumber);
  if (resp === undefined || resp === null) return null;
  return Boolean(resp.answer);
}

function isRiskYes(indicator: string): boolean {
  if (!selectedItem.value?.riskResponses?.length) return false;
  const resp = selectedItem.value.riskResponses.find((r: any) => r.indicator === indicator);
  if (resp !== undefined && resp !== null) return Boolean(resp.answer);
  return false;
}

function getFunctionLabel(domain: string): string {
  if (!selectedItem.value?.functionResponses?.length) return 'Data fungsi tidak tersedia';
  const resp = selectedItem.value.functionResponses.find((r: any) => r.domain === domain);
  if (resp?.level === 2) return 'Sangat Terganggu';
  if (resp?.level === 1) return 'Terganggu Sedang';
  if (resp?.level === 0) return 'Tidak Terganggu';
  return 'Data fungsi tidak tersedia';
}

// Action notification banner feedback
const actionFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

// Clinical Notes Computed List (Real author identities only)
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
      author: v.verifier?.name || (page.props.auth as any)?.user?.name || 'Tenaga Medis',
      role: 'Tenaga Medis Verifikator',
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
    author: (page.props.auth as any)?.user?.name || 'Tenaga Medis',
    role: 'Tenaga Medis • PSC 119',
    time: 'Baru saja',
    content: newClinicalNote.value.trim(),
  });
  newClinicalNote.value = '';
}

// ACTION DISPATCH HANDLERS (Section 15: Never update canonical state in onFinish!)
function acknowledgeCase(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(`/healthcare/emergencies/${item.emergencyId}/acknowledge`, {}, {
    onSuccess: () => {
      actionFeedback.value = { type: 'success', message: 'Kasus darurat berhasil diakui.' };
    },
    onError: (errors) => {
      actionFeedback.value = { type: 'error', message: (Object.values(errors)[0] as string) || 'Gagal mengakui kasus.' };
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}

function submitVerification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(`/healthcare/emergencies/${item.emergencyId}/verify`, verificationForm.value, {
    onSuccess: () => {
      actionFeedback.value = { type: 'success', message: 'Verifikasi medis berhasil disimpan.' };
    },
    onError: (errors) => {
      actionFeedback.value = { type: 'error', message: (Object.values(errors)[0] as string) || 'Gagal menyimpan verifikasi.' };
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}

function submitClassification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(`/healthcare/emergencies/${item.emergencyId}/classify`, decisionForm.value, {
    onSuccess: () => {
      actionFeedback.value = { type: 'success', message: 'Klasifikasi triase berhasil ditetapkan.' };
    },
    onError: (errors) => {
      actionFeedback.value = { type: 'error', message: (Object.values(errors)[0] as string) || 'Gagal menetapkan klasifikasi.' };
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}

function submitReferral(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(`/healthcare/emergencies/${item.emergencyId}/referrals`, referralForm.value, {
    onSuccess: () => {
      actionFeedback.value = { type: 'success', message: 'Rujukan medis berhasil diterbitkan.' };
    },
    onError: (errors) => {
      actionFeedback.value = { type: 'error', message: (Object.values(errors)[0] as string) || 'Gagal menerbitkan rujukan.' };
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}

function submitValidation(item: any) {
  if (!item.assessmentId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(`/healthcare/validations/${item.assessmentId}`, validationForm.value, {
    onSuccess: () => {
      actionFeedback.value = { type: 'success', message: 'Validasi klinis berhasil disimpan.' };
    },
    onError: (errors) => {
      actionFeedback.value = { type: 'error', message: (Object.values(errors)[0] as string) || 'Gagal menyimpan validasi.' };
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}
</script>
