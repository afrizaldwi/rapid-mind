<template>
  <HealthcareLayout>
    <div class="space-y-4">
      <!-- 1. Page Title & Operational Context (Minimalist, Calm) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-lg lg:text-xl font-black text-slate-900 tracking-tight">
            Pusat Triase & Kedaruratan Medis
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Antrean insiden T0 untuk verifikasi dan respons medis.
          </p>
        </div>
      </div>

      <!-- 2. Essential KPI Summary Row (Compact, No Giant Icons, No Fake Trends) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- KPI 1: Antrean Aktif -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Antrean Aktif</span>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-2xl font-black text-slate-900 tracking-tight">{{ totalSurvivorsCount }}</span>
            <span class="text-xs text-slate-400 font-medium">kasus</span>
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5">Menunggu tindak lanjut</span>
        </div>

        <!-- KPI 2: T0 Darurat -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 border-t-2 border-t-rose-600 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">T0 Darurat</span>
          </div>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-2xl font-black text-slate-900 tracking-tight">{{ criticalT0Count }}</span>
            <span class="text-xs text-slate-400 font-medium">kasus</span>
          </div>
          <span class="text-[11px] text-rose-600 font-medium mt-0.5">Prioritas tinggi</span>
        </div>

        <!-- KPI 3: Dalam Verifikasi -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 border-t-2 border-t-amber-500 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Dalam Verifikasi</span>
          </div>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-2xl font-black text-slate-900 tracking-tight">{{ pendingValidationCount }}</span>
            <span class="text-xs text-slate-400 font-medium">kasus</span>
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5">Sedang ditinjau medis</span>
        </div>

        <!-- KPI 4: Rujukan Aktif -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 border-t-2 border-t-teal-600 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Rujukan Aktif</span>
          </div>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-2xl font-black text-slate-900 tracking-tight">{{ referralsIssuedCount }}</span>
            <span class="text-xs text-slate-400 font-medium">kasus</span>
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5">Rujukan telah diterbitkan</span>
        </div>
      </div>

      <!-- Action Feedback Banners -->
      <div
        v-if="flashMessage"
        class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between"
      >
        <div class="flex items-center space-x-2">
          <span>✓</span>
          <span>{{ flashMessage }}</span>
        </div>
      </div>

      <div
        v-if="actionErrors.length > 0"
        class="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-medium text-rose-900 space-y-1"
      >
        <p class="font-bold">Perhatian pada tindakan medis:</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li v-for="err in actionErrors" :key="err.key">
            {{ err.message }}
          </li>
        </ul>
      </div>

      <!-- 3. Main Workspace: Two-Panel Clinical Hierarchy (Queue Left, Selected Case Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- LEFT PANEL: CASE QUEUE (~33% width / lg:col-span-4) -->
        <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
          <div class="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Antrean Darurat
              </h3>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {{ filteredQueue.length }} kasus
              </span>
            </div>

            <!-- Search Bar -->
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
                class="w-full pl-8 pr-7 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition"
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

            <!-- Filter Buttons: Semua, T0-Suspect, T0-Confirmed -->
            <div class="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                @click="selectedFilter = 'ALL'"
                :class="selectedFilter === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                Semua
              </button>
              <button
                type="button"
                @click="selectedFilter = 'PENDING'"
                :class="selectedFilter === 'PENDING' ? 'bg-rose-700 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                T0-Suspect
              </button>
              <button
                type="button"
                @click="selectedFilter = 'CONFIRMED'"
                :class="selectedFilter === 'CONFIRMED' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                T0-Confirmed
              </button>
            </div>
          </div>

          <!-- Queue List Items -->
          <div class="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div
              v-for="item in filteredQueue"
              :key="item.key"
              @click="selectItem(item)"
              class="p-3 rounded-lg border transition cursor-pointer text-xs space-y-1.5 select-none"
              :class="[
                selectedItem?.key === item.key
                  ? 'bg-teal-50/40 border-teal-500 shadow-2xs ring-1 ring-teal-500/20'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300'
              ]"
            >
              <!-- Line 1: Priority Badge + Time -->
              <div class="flex items-center justify-between">
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
                  :class="priorityBadgeClasses(item.semanticPriority)"
                >
                  {{ item.semanticPriorityLabel }}
                </span>
                <span class="text-[11px] text-slate-400 font-medium">
                  {{ item.timeAgo }}
                </span>
              </div>

              <!-- Line 2: Patient Name + RM Code -->
              <div class="flex items-baseline justify-between gap-1">
                <h4 class="font-bold text-slate-900 text-xs truncate">
                  {{ item.survivorName }}
                </h4>
                <span class="font-mono text-[10px] text-slate-400 shrink-0">
                  {{ item.rmCode }}
                </span>
              </div>

              <!-- Line 3: Location + Status + Red indicator -->
              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span class="truncate flex items-center gap-1">
                  <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {{ item.shelterName }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    v-if="item.hasRedFlag"
                    class="w-1.5 h-1.5 rounded-full bg-rose-600"
                    title="Indikator bahaya terdeteksi"
                  ></span>
                  <span
                    class="font-medium text-[10px]"
                    :class="item.status === 'PENDING' ? 'text-rose-600 font-bold' : 'text-slate-600'"
                  >
                    {{ item.status === 'PENDING' ? 'Menunggu validasi medis' : item.statusLabel }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty Queue State -->
            <div
              v-if="filteredQueue.length === 0"
              class="p-8 text-center text-xs text-slate-400 space-y-1"
            >
              <p class="font-bold text-slate-600">
                Tidak ada antrean yang cocok
              </p>
              <p class="text-slate-400 text-[11px]">
                Ubah filter prioritas atau kata kunci pencarian.
              </p>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: SELECTED CASE DETAIL WORKSPACE (~67% width / lg:col-span-8) -->
        <main class="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden min-h-[620px]">
          <template v-if="selectedItem">
            <!-- 1. PATIENT HEADER (Section 4, 5: Name, Identifier, Status, ONE Primary CTA) -->
            <div class="p-4 sm:p-5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                  <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {{ selectedItem.survivorName }}
                  </h2>
                  <span class="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {{ selectedItem.rmCode }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    :class="priorityBadgeClasses(selectedItem.semanticPriority)"
                  >
                    {{ selectedItem.semanticPriorityLabel }}
                  </span>
                  <span class="text-xs text-slate-500 font-medium">
                    • {{ selectedItem.semanticStatusDescription }}
                  </span>
                </div>
              </div>

              <!-- ONE Primary Action CTA on Top Right (Section 5, 24: No duplicate buttons!) -->
              <div class="shrink-0">
                <button
                  v-if="selectedItem.isEmergency && selectedItem.status === 'PENDING'"
                  type="button"
                  @click="acknowledgeCase(selectedItem)"
                  :disabled="isSubmitting"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs"
                >
                  Akui Kasus
                </button>
                <button
                  v-else-if="['ACKNOWLEDGED', 'REVIEWING'].includes(selectedItem.status)"
                  type="button"
                  @click="activeTab = 'actions'"
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-xs"
                >
                  Lanjutkan Verifikasi Medis
                </button>
                <button
                  v-else-if="selectedItem.status === 'CONFIRMED' && !selectedItem.hasReferral"
                  type="button"
                  @click="activeTab = 'actions'"
                  class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition shadow-xs"
                >
                  Terbitkan Rujukan Medis
                </button>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold"
                >
                  ✓ {{ getFinalActionLabel(selectedItem) }}
                </span>
              </div>
            </div>

            <!-- 2. PATIENT METADATA (Sections 7, 8: Single clean horizontal bar, no separate cards) -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 py-3 bg-slate-50/50 border-b border-slate-200/80 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60">
              <div class="sm:pr-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIK</span>
                <span class="font-mono text-xs sm:text-sm font-semibold text-slate-900 block mt-0.5">{{ selectedItem.maskedNik }}</span>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usia</span>
                <span class="text-xs sm:text-sm font-semibold text-slate-900 block mt-0.5">
                  {{ selectedItem.age !== null ? `${selectedItem.age} tahun` : "Data tidak tersedia" }}
                </span>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jenis Kelamin</span>
                <span class="text-xs sm:text-sm font-semibold text-slate-900 block mt-0.5">{{ selectedItem.gender }}</span>
              </div>
              <div class="pt-2 sm:pt-0 sm:px-3">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lokasi</span>
                <span class="text-xs sm:text-sm font-semibold text-slate-900 block mt-0.5 truncate" :title="selectedItem.shelterName">{{ selectedItem.shelterName }}</span>
              </div>
              <div class="pt-2 sm:pt-0 sm:pl-3">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pelapor</span>
                <span class="text-xs sm:text-sm font-semibold text-slate-900 block mt-0.5 truncate" :title="selectedItem.volunteerName">{{ selectedItem.volunteerName }}</span>
              </div>
            </div>

            <!-- 3. TABS (Section 9: Clean underline tabs matching Admin page) -->
            <nav class="px-4 border-b border-slate-200/80 flex items-center space-x-6 text-xs font-semibold bg-white">
              <button
                type="button"
                @click="activeTab = 'overview'"
                :class="activeTab === 'overview' ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Ringkasan
              </button>
              <button
                type="button"
                @click="activeTab = 'assessment'"
                :class="activeTab === 'assessment' ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Asesmen
              </button>
              <button
                type="button"
                @click="activeTab = 'actions'"
                :class="activeTab === 'actions' ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Tindakan
              </button>
              <button
                type="button"
                @click="activeTab = 'history'"
                :class="activeTab === 'history' ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Riwayat
              </button>
            </nav>

            <!-- Action Feedback Notification Banner -->
            <div
              v-if="actionFeedback"
              class="mx-4 mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between"
              :class="actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
            >
              <div class="flex items-center space-x-2">
                <span>{{ actionFeedback.type === 'success' ? '✓' : '⚠' }}</span>
                <span>{{ actionFeedback.message }}</span>
              </div>
              <button
                type="button"
                @click="actionFeedback = null"
                class="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <!-- Dynamic Tab Content -->
            <div class="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              <!-- TAB 1: RINGKASAN (Overview Hierarchy: Critical Status -> Red Flag -> Clinical Summary -> Workflow) -->
              <div v-if="activeTab === 'overview'" class="space-y-4">
                <!-- 4. CRITICAL STATUS BANNER (Section 10: Compact, pale red, NO duplicate action button) -->
                <div
                  v-if="selectedItem.hasRedFlag || selectedItem.semanticPriority.startsWith('T0')"
                  class="p-3 rounded-lg border border-rose-200/80 bg-rose-50/50 flex items-center gap-2.5 text-xs text-rose-900"
                >
                  <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span class="font-bold text-rose-950">STATUS KRITIS — {{ selectedItem.semanticPriorityLabel }}</span>
                    <span class="text-rose-700 ml-1.5">• {{ selectedItem.semanticStatusDescription }}</span>
                  </div>
                </div>

                <!-- 5. RED FLAG SECTION (Sections 11, 12: Subtle row separators, small badge, no nested cards) -->
                <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-900">Indikator Bahaya</span>
                    <span
                      v-if="detectedRedFlags.length > 0"
                      class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider"
                    >
                      {{ detectedRedFlags.length }} Terdeteksi
                    </span>
                    <span v-else class="text-[10px] text-slate-400">Tidak ada indikator terdeteksi</span>
                  </div>

                  <div v-if="detectedRedFlags.length > 0" class="divide-y divide-slate-100">
                    <div
                      v-for="rf in detectedRedFlags"
                      :key="rf.key"
                      class="p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div class="space-y-0.5">
                        <p class="font-bold text-slate-900 text-xs">{{ rf.title }}</p>
                        <p class="text-[11px] text-slate-600 leading-relaxed">{{ rf.evidence }}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        ✓ Terdeteksi
                      </span>
                    </div>
                  </div>
                  <div
                    v-else
                    class="p-3 text-xs text-slate-500"
                  >
                    Tidak ada indikator bahaya terdeteksi
                  </div>
                </div>

                <!-- 6. CLINICAL SUMMARY (Sections 13, 14: ONE shared container, 3 equal columns with subtle separators) -->
                <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                  <div class="p-3.5 border-b border-slate-100">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-900">Ringkasan Hasil Skrining</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-3.5 text-xs">
                    <!-- Column 1: SRQ-20 -->
                    <div class="space-y-0.5 sm:pr-3">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SRQ-20</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-black text-slate-900">
                          {{ selectedItem.srqScore !== null ? selectedItem.srqScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-semibold">/ 20</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.srqScore !== null ? (selectedItem.srqScore >= 6 ? 'Skor Positif (≥6)' : 'Skor Negatif (<6)') : 'Data tidak tersedia' }}
                      </span>
                    </div>

                    <!-- Column 2: Faktor Risiko -->
                    <div class="pt-2 sm:pt-0 sm:px-3 space-y-0.5">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faktor Risiko</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-black text-slate-900">
                          {{ selectedItem.riskScore !== null ? selectedItem.riskScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-semibold">/ 8</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.riskScore !== null ? (selectedItem.riskScore >= 3 ? 'Risiko Tinggi' : 'Risiko Rendah') : 'Data tidak tersedia' }}
                      </span>
                    </div>

                    <!-- Column 3: Fungsi / ADL -->
                    <div class="pt-2 sm:pt-0 sm:pl-3 space-y-0.5">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fungsi / ADL</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-black text-slate-900">
                          {{ selectedItem.functionScore !== null ? selectedItem.functionScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-semibold">/ 9</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.functionScore !== null ? (selectedItem.functionScore >= 3 ? 'Terganggu Berat' : 'Terganggu Ringan') : 'Data tidak tersedia' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 7. WORKFLOW STEPPER (Section 15: Compact horizontal stepper, no heavy cards) -->
                <div class="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                    Alur Penanganan Medis
                  </span>
                  <div class="flex items-center justify-between text-xs pt-1">
                    <!-- Step 1: Laporan -->
                    <div class="flex items-center gap-1.5 font-semibold text-teal-800">
                      <span class="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      <div>
                        <p class="leading-tight">Laporan</p>
                        <span class="text-[10px] text-slate-400 block font-normal">Terdata</span>
                      </div>
                    </div>

                    <svg class="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>

                    <!-- Step 2: Verifikasi -->
                    <div class="flex items-center gap-1.5 font-semibold" :class="selectedItem.status !== 'PENDING' ? 'text-teal-800' : 'text-slate-700'">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="selectedItem.status !== 'PENDING' ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ selectedItem.status !== 'PENDING' ? '✓' : '2' }}
                      </span>
                      <div>
                        <p class="leading-tight">Verifikasi</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ selectedItem.status === 'PENDING' ? 'Menunggu' : 'Selesai' }}</span>
                      </div>
                    </div>

                    <svg class="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>

                    <!-- Step 3: Klasifikasi -->
                    <div class="flex items-center gap-1.5 font-semibold" :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-teal-800' : 'text-slate-700'">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? '✓' : '3' }}
                      </span>
                      <div>
                        <p class="leading-tight">Klasifikasi</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'Ditetapkan' : 'Menunggu' }}</span>
                      </div>
                    </div>

                    <svg class="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>

                    <!-- Step 4: Rujukan -->
                    <div class="flex items-center gap-1.5 font-semibold" :class="selectedItem.hasReferral ? 'text-teal-800' : 'text-slate-700'">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="selectedItem.hasReferral ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ selectedItem.hasReferral ? '✓' : '4' }}
                      </span>
                      <div>
                        <p class="leading-tight">Rujukan</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ selectedItem.hasReferral ? 'Diterbitkan' : 'Menunggu' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: ASESMEN LENGKAP (SRQ-20, Risk, Functioning) -->
              <div v-if="activeTab === 'assessment'" class="space-y-4">
                <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Hasil Pemeriksaan Instrumen SRQ-20 (20 Pertanyaan)
                      </h4>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        Skor: <strong class="text-slate-800">{{ selectedItem.srqScore !== null ? `${selectedItem.srqScore} / 20` : "Data SRQ-20 tidak tersedia" }}</strong>
                      </p>
                    </div>
                    <span
                      v-if="selectedItem.srqScore !== null"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
                    >
                      Skor SRQ-20: {{ selectedItem.srqScore }} / 20
                    </span>
                  </div>

                  <div
                    v-if="selectedItem.srqResponses && selectedItem.srqResponses.length > 0"
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3.5 text-xs"
                  >
                    <div
                      v-for="q in srqQuestions"
                      :key="q.number"
                      class="p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2"
                      :class="
                        getSrqAnswer(q.number) === true
                          ? 'border-rose-200 bg-rose-50/40 text-rose-950 font-medium'
                          : getSrqAnswer(q.number) === false
                            ? 'border-slate-100 bg-slate-50/50 text-slate-600'
                            : 'border-slate-100 bg-white text-slate-400 italic'
                      "
                    >
                      <span class="text-[11px] leading-tight">
                        <strong class="font-mono text-[10px] text-slate-500 mr-1">{{ q.number }}.</strong>
                        {{ q.text }}
                      </span>
                      <span
                        v-if="getSrqAnswer(q.number) === true"
                        class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white shrink-0"
                      >
                        YA
                      </span>
                      <span
                        v-else-if="getSrqAnswer(q.number) === false"
                        class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-200 text-slate-600 shrink-0"
                      >
                        TIDAK
                      </span>
                      <span
                        v-else
                        class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-400 shrink-0"
                      >
                        -
                      </span>
                    </div>
                  </div>
                  <div
                    v-else
                    class="p-6 text-center text-xs text-slate-400"
                  >
                    Data rincian pertanyaan SRQ-20 belum tercatat.
                  </div>
                </div>

                <!-- Risk Factors & Functioning Breakdown -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <!-- Risk factors -->
                  <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                    <div class="p-3 border-b border-slate-100">
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Faktor Risiko Bencana
                      </h4>
                    </div>
                    <div v-if="selectedItem.riskResponses?.length" class="divide-y divide-slate-100 text-xs">
                      <div
                        v-for="item in riskItems"
                        :key="item.code"
                        class="p-2.5 flex items-center justify-between text-[11px]"
                      >
                        <span class="text-slate-700">{{ item.label }}</span>
                        <span class="font-bold text-slate-900">{{ formatRiskAnswer(getRiskAnswer(item.code)) }}</span>
                      </div>
                    </div>
                    <div v-else class="p-4 text-center text-xs text-slate-400">
                      Data faktor risiko belum tersedia
                    </div>
                  </div>

                  <!-- Functioning -->
                  <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                    <div class="p-3 border-b border-slate-100">
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Penilaian Fungsi & ADL
                      </h4>
                    </div>
                    <div v-if="selectedItem.functionResponses?.length" class="divide-y divide-slate-100 text-xs">
                      <div class="p-2.5 flex items-center justify-between text-[11px]">
                        <span class="text-slate-700">Perawatan Diri</span>
                        <span class="font-bold text-slate-900">{{ getFunctionLabel('SELF_CARE') }}</span>
                      </div>
                      <div class="p-2.5 flex items-center justify-between text-[11px]">
                        <span class="text-slate-700">Aktivitas Harian / Pekerjaan</span>
                        <span class="font-bold text-slate-900">{{ getFunctionLabel('WORK_STUDY') }}</span>
                      </div>
                      <div class="p-2.5 flex items-center justify-between text-[11px]">
                        <span class="text-slate-700">Relasi Sosial</span>
                        <span class="font-bold text-slate-900">{{ getFunctionLabel('SOCIAL_RELATION') }}</span>
                      </div>
                    </div>
                    <div v-else class="p-4 text-center text-xs text-slate-400">
                      Data fungsi belum tersedia
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 3: TINDAKAN & RUJUKAN -->
              <div v-if="activeTab === 'actions'" class="space-y-4">
                <!-- Section A: Tele-Verification Form -->
                <div
                  v-if="['PENDING', 'ACKNOWLEDGED'].includes(selectedItem.status)"
                  class="rounded-xl border border-slate-200/80 bg-white overflow-hidden"
                >
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Verifikasi Medis Sekunder (Tele-Verifikasi)
                    </h4>
                    <span class="text-[10px] font-bold text-slate-400">Tahap 1</span>
                  </div>

                  <form @submit.prevent="submitVerification(selectedItem)" class="p-4 space-y-3 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">
                          Metode Verifikasi
                        </label>
                        <select
                          v-model="verificationForm.method"
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                        >
                          <option value="PHONE">Telepon Seluler Langsung</option>
                          <option value="VIDEO">Video Call</option>
                          <option value="FIELD_TEAM">Tim Lapangan / Pemeriksaan Langsung</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">
                          Pelapor Lapangan
                        </label>
                        <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold truncate">
                          {{ selectedItem.volunteerName }}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">
                        Catatan Hasil Verifikasi Sekunder Nakes
                      </label>
                      <textarea
                        v-model="verificationForm.notes"
                        rows="2"
                        placeholder="Konfirmasi kondisi kesadaran, kontak mata, orientasi, serta potensi melukai diri..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>

                    <div class="flex justify-end pt-1">
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

                <!-- Section B: Triage Classification Form -->
                <div
                  v-if="selectedItem.status === 'REVIEWING'"
                  class="rounded-xl border border-slate-200/80 bg-white overflow-hidden"
                >
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Penetapan Klasifikasi Triase Klinis Nakes
                    </h4>
                    <span class="text-[10px] font-bold text-slate-400">Tahap 2</span>
                  </div>

                  <form @submit.prevent="submitClassification(selectedItem)" class="p-4 space-y-3 text-xs">
                    <div>
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">
                        Keputusan Klasifikasi
                      </label>
                      <select
                        v-model="decisionForm.clinical_result"
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                      >
                        <option value="T0_CONFIRMED">Konfirmasi T0 (Kedaruratan Nyata — Evakuasi/Rujukan)</option>
                        <option value="T1_DOWNGRADE">Turunkan ke T1 (Mendesak — Pos Medis Lapangan)</option>
                        <option value="T2_DOWNGRADE">Turunkan ke T2 (Terjadwal — Pendampingan Psikososial)</option>
                      </select>
                    </div>

                    <div>
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">
                        Pertimbangan Klinis Keputusan
                      </label>
                      <textarea
                        v-model="decisionForm.notes"
                        rows="2"
                        placeholder="Alasan klinis penegakan atau penurunan triase..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>

                    <div class="flex justify-end pt-1">
                      <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                      >
                        Tetapkan Klasifikasi Triase
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Section C: Referral Dispatch Form -->
                <div
                  v-if="selectedItem.status === 'CONFIRMED' && !selectedItem.hasReferral"
                  class="rounded-xl border border-slate-200/80 bg-white overflow-hidden"
                >
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Terbitkan Rujukan Medis Darurat
                    </h4>
                    <span class="text-[10px] text-teal-700 font-bold">Rujukan</span>
                  </div>

                  <form @submit.prevent="submitReferral(selectedItem)" class="p-4 space-y-3 text-xs">
                    <div>
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">
                        Fasilitas Kesehatan Tujuan Rujukan
                      </label>
                      <select
                        v-model="referralForm.facility_id"
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                      >
                        <option :value="null">-- Pilih Fasilitas Kesehatan Rujukan --</option>
                        <option v-for="f in facilities || []" :key="f.id" :value="f.id">
                          {{ f.name }} — {{ f.type }}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">
                        Instruksi Medis untuk Tim Transport / Faskes
                      </label>
                      <textarea
                        v-model="referralForm.notes"
                        rows="2"
                        placeholder="Instruksi medis saat transport / penanganan awal di faskes..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>

                    <div class="flex justify-end pt-1">
                      <button
                        type="submit"
                        :disabled="isSubmitting || !referralForm.facility_id"
                        class="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        Terbitkan Rujukan Medis
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Section D: If Referral already issued -->
                <div
                  v-if="selectedItem.hasReferral"
                  class="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-teal-900">Rujukan Medis Diterbitkan</span>
                    <span class="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px]">
                      {{ formatReferralStatus(selectedItem.referrals[0]?.status) }}
                    </span>
                  </div>
                  <p class="text-slate-600">
                    Faskes Tujuan: <strong>{{ selectedItem.referrals[0]?.facility?.name || 'Faskes Rujukan' }}</strong>
                  </p>
                  <p v-if="selectedItem.referrals[0]?.notes" class="text-slate-500 italic">
                    "{{ selectedItem.referrals[0].notes }}"
                  </p>
                </div>
              </div>

              <!-- TAB 4: RIWAYAT -->
              <div v-if="activeTab === 'history'" class="space-y-4">
                <div class="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                  <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Rekam Jejak Operasional Kasus
                    </h4>
                    <span class="text-[11px] font-mono text-slate-400">
                      ID: {{ selectedItem.rmCode }}
                    </span>
                  </div>

                  <div class="p-4">
                    <div class="relative pl-6 space-y-3.5 text-xs before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      <!-- Step 1: Shelter report -->
                      <div class="relative space-y-0.5">
                        <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-600 ring-4 ring-white"></span>
                        <span class="text-[10px] font-bold text-teal-800 block">Laporan Kedaruratan Lapangan</span>
                        <p class="font-bold text-slate-800">{{ selectedItem.shelterName }}</p>
                        <p class="text-[11px] text-slate-500">
                          Dilaporkan oleh {{ selectedItem.volunteerName }} • {{ formatDateTime(selectedItem.createdAt) }}
                        </p>
                      </div>

                      <!-- Step 2: Assessment if present -->
                      <div v-if="selectedItem.hasAssessment" class="relative space-y-0.5">
                        <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-900 ring-4 ring-white"></span>
                        <span class="text-[10px] font-bold text-slate-500 block">Skrining Awal</span>
                        <p class="font-bold text-slate-800">Instrumen Psikologis {{ selectedItem.rmCode }}</p>
                        <p class="text-[11px] text-slate-500">
                          {{ selectedItem.srqScore !== null ? `Skor SRQ-20: ${selectedItem.srqScore}/20` : "Skor tidak tersedia" }}
                        </p>
                      </div>

                      <!-- Step 3: Verifications -->
                      <div
                        v-for="(v, idx) in selectedItem.verifications"
                        :key="`ver-${idx}`"
                        class="relative space-y-0.5"
                      >
                        <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white"></span>
                        <span class="text-[10px] font-bold text-amber-800 block">Verifikasi Sekunder Nakes</span>
                        <p class="font-bold text-slate-800">
                          Metode: {{ v.method }} • Hasil: {{ v.clinical_result || 'Dalam Peninjauan' }}
                        </p>
                        <p v-if="v.notes" class="text-[11px] text-slate-500 italic">"{{ v.notes }}"</p>
                      </div>

                      <!-- Step 4: Referrals -->
                      <div
                        v-for="(r, idx) in selectedItem.referrals"
                        :key="`ref-${idx}`"
                        class="relative space-y-0.5"
                      >
                        <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"></span>
                        <span class="text-[10px] font-bold text-teal-800 block">Rujukan Medis</span>
                        <p class="font-bold text-slate-800">
                          Tujuan: {{ r.facility?.name || "Fasilitas Rujukan" }}
                        </p>
                        <p class="text-[11px] text-slate-500">
                          Status: {{ formatReferralStatus(r.status) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty Case Selection State -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3"
          >
            <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 class="text-sm font-bold text-slate-700">Pilih Insiden dari Antrean</h4>
            <p class="text-xs text-slate-400 max-w-xs">
              Klik salah satu kasus di panel antrean kiri untuk memeriksa identitas, bukti asesmen, dan tindakan klinis.
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
import {
  formatDateTime,
  formatRiskAnswer,
  normalizeQueueItem,
  priorityBadgeClasses,
  riskItems,
  srqQuestions,
} from '@/lib/healthcareEmergency';

const props = defineProps<{
  emergencies?: any[];
  facilities?: any[];
  facility?: any;
}>();

const page = usePage();
const flashMessage = computed(() => String((page.props.flash as { message?: string } | undefined)?.message ?? ''));
const isSubmitting = ref(false);
const searchQuery = ref('');
const selectedFilter = ref<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');
const activeTab = ref<'overview' | 'assessment' | 'actions' | 'history'>('overview');

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
  facility_id: null as number | null,
  notes: '',
});

// Normalized Queue List
const queueList = computed(() => {
  return (props.emergencies ?? [])
    .map((emergency) => normalizeQueueItem(emergency, true))
    .sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
});

// 4 Essential KPI Counts (Sections 10, 11)
const totalSurvivorsCount = computed(() => queueList.value.length);
const criticalT0Count = computed(() => {
  return queueList.value.filter((q) => ['PENDING', 'ACKNOWLEDGED', 'REVIEWING', 'CONFIRMED'].includes(q.status)).length;
});
const pendingValidationCount = computed(() => {
  return queueList.value.filter((item) => ['ACKNOWLEDGED', 'REVIEWING'].includes(item.status)).length;
});
const referralsIssuedCount = computed(() => {
  let count = 0;
  for (const e of props.emergencies || []) {
    count += (e.referrals || []).length;
  }
  return count;
});

// Filtered Queue
const filteredQueue = computed(() => {
  return queueList.value.filter((item) => {
    if (selectedFilter.value === 'PENDING' && item.status !== 'PENDING') {
      return false;
    }
    if (selectedFilter.value === 'CONFIRMED' && item.status !== 'CONFIRMED') {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const nikQuery = q.replace(/\D/g, '');
      const matchName = item.survivorName.toLowerCase().includes(q);
      const matchRm = item.rmCode.toLowerCase().includes(q);
      const matchNik = nikQuery.length > 0 && item.searchNik.includes(nikQuery);
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
  verificationForm.value = { method: 'PHONE', notes: '' };
  decisionForm.value = { clinical_result: 'T0_CONFIRMED', notes: '' };
  referralForm.value = { facility_id: null, notes: '' };
  actionFeedback.value = null;
}

watch(
  queueList,
  (newList) => {
    if (!selectedItem.value && newList.length > 0) {
      selectedItem.value = newList[0];
    } else if (selectedItem.value) {
      const refreshed = newList.find((x) => x.key === selectedItem.value.key);
      if (refreshed) selectedItem.value = refreshed;
    }
  },
  { immediate: true },
);

watch(filteredQueue, (visibleItems) => {
  if (selectedItem.value && !visibleItems.some((item) => item.key === selectedItem.value.key)) {
    selectItem(visibleItems[0] ?? null);
  }
});

onMounted(() => {
  if (!selectedItem.value && queueList.value.length > 0) {
    selectedItem.value = queueList.value[0];
  }
});

function getSrqAnswer(qNumber: number): boolean | null {
  if (!selectedItem.value?.srqResponses?.length) return null;
  const resp = selectedItem.value.srqResponses.find((r: any) => r.question_number === qNumber);
  if (!resp || resp.answer === undefined || resp.answer === null) return null;
  return Boolean(resp.answer);
}

function getRiskAnswer(code: string): boolean | null {
  if (!selectedItem.value?.riskResponses?.length) return null;
  const resp = selectedItem.value.riskResponses.find((r: any) => r.indicator === code);
  if (!resp || resp.answer === undefined || resp.answer === null) return null;
  return Boolean(resp.answer);
}

function getFunctionLabel(domain: string): string {
  if (!selectedItem.value?.functionResponses?.length) return 'Data fungsi tidak tersedia';
  const resp = selectedItem.value.functionResponses.find((r: any) => r.domain === domain);
  if (resp?.level === 3) return 'Gangguan berat';
  if (resp?.level === 1) return 'Gangguan ringan-sedang / perlu dukungan';
  if (resp?.level === 0) return 'Tidak terganggu / mandiri';
  return 'Data fungsi tidak tersedia';
}

function getFinalActionLabel(item: any): string {
  if (item.status === 'DOWNGRADED') {
    const decision = (item.verifications || []).find((verification: any) => verification.clinical_result);
    return decision?.clinical_result
      ? `Klasifikasi Selesai — Diturunkan ke ${decision.clinical_result}`
      : 'Klasifikasi Selesai — Diturunkan';
  }

  if (item.status === 'CONFIRMED' && item.hasReferral) {
    const status = item.referrals.find((referral: any) => referral.status === 'ACTIVE')?.status ?? item.referrals[0]?.status;
    return status === 'ACTIVE' ? 'Rujukan Aktif' : `Rujukan ${formatReferralStatus(status)}`;
  }

  return item.statusLabel;
}

// Action Feedback State
const actionFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

// ACTION DISPATCH HANDLERS
function acknowledgeCase(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(
    `/healthcare/emergencies/${item.emergencyId}/acknowledge`,
    {},
    {
      onSuccess: () => {
        actionFeedback.value = {
          type: 'success',
          message: 'Kasus darurat berhasil diakui.',
        };
      },
      onError: (errors) => {
        actionFeedback.value = {
          type: 'error',
          message: (Object.values(errors)[0] as string) || 'Gagal mengakui kasus.',
        };
      },
      onFinish: () => {
        isSubmitting.value = false;
      },
    },
  );
}

function submitVerification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(
    `/healthcare/emergencies/${item.emergencyId}/verify`,
    verificationForm.value,
    {
      onSuccess: () => {
        actionFeedback.value = {
          type: 'success',
          message: 'Verifikasi medis berhasil disimpan.',
        };
      },
      onError: (errors) => {
        actionFeedback.value = {
          type: 'error',
          message: (Object.values(errors)[0] as string) || 'Gagal menyimpan verifikasi.',
        };
      },
      onFinish: () => {
        isSubmitting.value = false;
      },
    },
  );
}

function submitClassification(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(
    `/healthcare/emergencies/${item.emergencyId}/classify`,
    decisionForm.value,
    {
      onSuccess: () => {
        actionFeedback.value = {
          type: 'success',
          message: 'Klasifikasi triase berhasil ditetapkan.',
        };
      },
      onError: (errors) => {
        actionFeedback.value = {
          type: 'error',
          message: (Object.values(errors)[0] as string) || 'Gagal menetapkan klasifikasi.',
        };
      },
      onFinish: () => {
        isSubmitting.value = false;
      },
    },
  );
}

function submitReferral(item: any) {
  if (!item.emergencyId) return;
  isSubmitting.value = true;
  actionFeedback.value = null;
  router.post(
    `/healthcare/emergencies/${item.emergencyId}/referrals`,
    referralForm.value,
    {
      onSuccess: () => {
        actionFeedback.value = {
          type: 'success',
          message: 'Rujukan medis berhasil diterbitkan.',
        };
      },
      onError: (errors) => {
        actionFeedback.value = {
          type: 'error',
          message: (Object.values(errors)[0] as string) || 'Gagal menerbitkan rujukan.',
        };
      },
      onFinish: () => {
        isSubmitting.value = false;
      },
    },
  );
}

const detectedRedFlags = computed(() => {
  if (!selectedItem.value) return [];
  const list: Array<{ key: string; title: string; evidence: string }> = [];
  const item = selectedItem.value;

  if (item.redFlagType === 'SUICIDAL_IDEATION' || getSrqAnswer(17) === true) {
    let evidence =
      item.redFlagType === 'SUICIDAL_IDEATION'
        ? 'Jenis Red Flag tercatat: Ideasi / Risiko Bunuh Diri.'
        : '';
    if (getSrqAnswer(17) === true) {
      evidence = (evidence ? evidence + ' • ' : '') + 'Jawaban YA pada SRQ #17 (Pikiran mengakhiri hidup)';
    }
    list.push({
      key: 'SUICIDAL_IDEATION',
      title: 'Risiko keamanan jiwa spesifik',
      evidence: evidence || 'Jawaban YA pada SRQ #17',
    });
  }

  if (item.redFlagType === 'PSYCHOSIS') {
    list.push({
      key: 'PSYCHOSIS',
      title: 'Gejala psikotik akut',
      evidence: 'Jenis Red Flag tercatat: PSYCHOSIS. Gangguan persepsi / waham.',
    });
  }

  if (item.redFlagType === 'SEVERE_AGITATION') {
    list.push({
      key: 'SEVERE_AGITATION',
      title: 'Perilaku agresif & gangguan kontrol impuls',
      evidence: 'Jenis Red Flag tercatat: SEVERE_AGITATION. Risiko melukai orang lain atau merusak lingkungan.',
    });
  }

  if (item.redFlagType === 'MEDICAL_CRISIS') {
    list.push({
      key: 'MEDICAL_CRISIS',
      title: 'Krisis medis akut',
      evidence: 'Jenis Red Flag tercatat: MEDICAL_CRISIS. Penurunan kesadaran atau cedera fisik.',
    });
  }

  if (list.length === 0 && item.hasRedFlag) {
    list.push({
      key: 'GENERAL_EMERGENCY',
      title: item.redFlagLabel || 'Kedaruratan Medis Terlapor',
      evidence: 'Tanda bahaya lapangan dilaporkan oleh relawan.',
    });
  }

  return list;
});
</script>
