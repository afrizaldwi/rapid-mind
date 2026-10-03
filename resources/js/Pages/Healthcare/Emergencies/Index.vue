<template>
  <HealthcareLayout>
    <div class="space-y-4">
      <!-- 1. Page Title & Operational Context (Section 7) -->
      <div>
        <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Pusat Triase & Kedaruratan Medis
        </h1>
        <p class="text-xs text-slate-500 mt-1 font-normal">
          Antrean insiden T0 untuk verifikasi dan respons medis.
        </p>
      </div>

      <!-- 2. Small Operational Summary (Compact Horizontal Strip, Sections 8 & 9) -->
      <div class="bg-white rounded-xl border border-slate-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <!-- Metric 1: ANTREAN AKTIF -->
        <div class="flex-1 min-w-[130px] sm:pr-4">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Antrean Aktif</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-bold text-slate-900 tracking-tight">{{ totalSurvivorsCount }}</span>
            <span class="text-xs text-slate-400 font-normal">kasus</span>
          </div>
        </div>

        <!-- Metric 2: T0 DARURAT -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:px-4">
          <div class="flex items-center gap-1.5">
            <span v-if="criticalT0Count > 0" class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">T0 Darurat</span>
          </div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-bold tracking-tight" :class="criticalT0Count > 0 ? 'text-rose-600' : 'text-slate-900'">{{ criticalT0Count }}</span>
            <span class="text-xs text-slate-400 font-normal">kasus</span>
          </div>
        </div>

        <!-- Metric 3: DALAM VERIFIKASI -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:px-4">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dalam Verifikasi</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-bold text-slate-900 tracking-tight">{{ pendingValidationCount }}</span>
            <span class="text-xs text-slate-400 font-normal">kasus</span>
          </div>
        </div>

        <!-- Metric 4: RUJUKAN AKTIF -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:pl-4">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Rujukan Aktif</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-bold text-slate-900 tracking-tight">{{ referralsIssuedCount }}</span>
            <span class="text-xs text-slate-400 font-normal">kasus</span>
          </div>
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
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <!-- LEFT PANEL: CASE QUEUE (~33% width / lg:col-span-4) -->
        <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-slate-100 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900">
                Antrean Darurat
              </h2>
              <span class="text-[11px] font-semibold text-slate-500">
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
                class="w-full pl-8 pr-7 py-1.5 bg-slate-50/70 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition"
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
            <div class="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                @click="selectedFilter = 'ALL'"
                :class="selectedFilter === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                Semua
              </button>
              <button
                type="button"
                @click="selectedFilter = 'PENDING'"
                :class="selectedFilter === 'PENDING' ? 'bg-rose-700 text-white font-semibold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                T0-Suspect
              </button>
              <button
                type="button"
                @click="selectedFilter = 'CONFIRMED'"
                :class="selectedFilter === 'CONFIRMED' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'"
                class="px-2.5 py-1 rounded-lg transition"
              >
                T0-Confirmed
              </button>
            </div>
          </div>

          <!-- Queue List Items (Inbox style, thin dividers, Sections 10, 11, 12) -->
          <div class="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div
              v-for="item in filteredQueue"
              :key="item.key"
              @click="selectItem(item)"
              class="p-3.5 transition cursor-pointer text-xs space-y-1 select-none hover:bg-slate-50/70"
              :class="[
                selectedItem?.key === item.key
                  ? 'bg-teal-50/50 border-l-2 border-l-teal-600 pl-3'
                  : 'bg-white pl-3.5'
              ]"
            >
              <!-- Line 1: Priority Indicator + Time -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="item.semanticPriority.startsWith('T0')"
                    class="w-1.5 h-1.5 rounded-full bg-rose-600"
                  ></span>
                  <span
                    class="text-[10px] font-bold tracking-wide uppercase"
                    :class="item.semanticPriority === 'T0_CONFIRMED' ? 'text-rose-700' : 'text-amber-700'"
                  >
                    {{ item.semanticPriorityLabel }}
                  </span>
                </div>
                <span class="text-[11px] text-slate-400 font-normal">
                  {{ item.timeAgo }}
                </span>
              </div>

              <!-- Line 2: Patient Name + RM Code -->
              <div class="flex items-baseline justify-between gap-1">
                <h3 class="font-bold text-slate-900 text-xs truncate">
                  {{ item.survivorName }}
                </h3>
                <span class="font-mono text-[10px] text-slate-400 shrink-0">
                  {{ item.rmCode }}
                </span>
              </div>

              <!-- Line 3: Posko + Status description -->
              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span class="truncate">{{ item.shelterName }}</span>
                <span
                  class="font-medium text-[10px] shrink-0"
                  :class="item.status === 'PENDING' ? 'text-rose-600 font-semibold' : 'text-slate-500'"
                >
                  {{ item.status === 'PENDING' ? 'Menunggu validasi medis' : item.statusLabel }}
                </span>
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
        <main class="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden min-h-[620px]">
          <template v-if="selectedItem">
            <!-- 1. PATIENT HEADER (Section 13, 14, 24: Name, Identifier, ONE Primary CTA) -->
            <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                  <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {{ selectedItem.survivorName }}
                  </h2>
                  <span class="text-xs font-mono font-medium text-slate-500">
                    {{ selectedItem.rmCode }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    class="font-bold text-[10px] uppercase tracking-wider"
                    :class="selectedItem.semanticPriority === 'T0_CONFIRMED' ? 'text-rose-700' : 'text-amber-700'"
                  >
                    {{ selectedItem.semanticPriorityLabel }}
                  </span>
                  <span>·</span>
                  <span>{{ selectedItem.semanticStatusDescription }}</span>
                </div>
              </div>

              <!-- ONE Primary Action CTA on Top Right (Section 14: No duplicate buttons!) -->
              <div class="shrink-0">
                <button
                  v-if="selectedItem.isEmergency && selectedItem.status === 'PENDING'"
                  type="button"
                  @click="acknowledgeCase(selectedItem)"
                  :disabled="isSubmitting"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                >
                  Akui Kasus
                </button>
                <button
                  v-else-if="['ACKNOWLEDGED', 'REVIEWING'].includes(selectedItem.status)"
                  type="button"
                  @click="activeTab = 'actions'"
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                >
                  Lanjutkan Verifikasi Medis
                </button>
                <button
                  v-else-if="selectedItem.status === 'CONFIRMED' && !selectedItem.hasReferral"
                  type="button"
                  @click="activeTab = 'actions'"
                  class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition"
                >
                  Terbitkan Rujukan Medis
                </button>
                <span
                  v-else-if="selectedItem.hasReferral"
                  class="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold"
                >
                  Rujukan Medis Diterbitkan
                </span>
              </div>
            </div>

            <!-- 2. PATIENT METADATA STRIP (Section 15: Clean strip, subtle dividers, NO nested boxes) -->
            <div class="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-y-2 text-xs divide-x divide-slate-100 text-slate-600">
              <div class="pr-4">
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">NIK</span>
                <span class="font-mono text-slate-800 font-semibold">{{ selectedItem.maskedNik || '••••' }}</span>
              </div>
              <div class="px-4">
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Usia</span>
                <span class="text-slate-800 font-semibold">{{ selectedItem.age !== null ? `${selectedItem.age} tahun` : '-' }}</span>
              </div>
              <div class="px-4">
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Jenis Kelamin</span>
                <span class="text-slate-800 font-semibold">{{ selectedItem.genderLabel || '-' }}</span>
              </div>
              <div class="pl-4">
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Lokasi Posko</span>
                <span class="text-slate-800 font-semibold">{{ selectedItem.shelterName }}</span>
              </div>
            </div>

            <!-- 3. NAVIGATION TABS (Section 17: Text + thin bottom indicator, NO pills) -->
            <nav class="flex items-center space-x-6 border-b border-slate-100 px-5 text-xs">
              <button
                type="button"
                @click="activeTab = 'overview'"
                :class="activeTab === 'overview' ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Ringkasan
              </button>
              <button
                type="button"
                @click="activeTab = 'assessment'"
                :class="activeTab === 'assessment' ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Asesmen
              </button>
              <button
                type="button"
                @click="activeTab = 'actions'"
                :class="activeTab === 'actions' ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Tindakan
              </button>
              <button
                type="button"
                @click="activeTab = 'history'"
                :class="activeTab === 'history' ? 'text-teal-800 border-b-2 border-teal-600 font-bold py-3 -mb-px' : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Riwayat
              </button>
            </nav>

            <!-- Action Feedback Notification Banner -->
            <div
              v-if="actionFeedback"
              class="mx-5 mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between"
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

            <!-- Dynamic Tab Content (Continuous Workspace, Section 3) -->
            <div class="p-5 flex-1 overflow-y-auto space-y-5">
              <!-- TAB 1: RINGKASAN (Overview: Status -> Red Flag -> Clinical Summary -> Workflow) -->
              <div v-if="activeTab === 'overview'" class="space-y-5">
                <!-- Status Kritis (Section 18: Much quieter, very pale red, thin border, small dot) -->
                <div
                  v-if="selectedItem.hasRedFlag || selectedItem.semanticPriority.startsWith('T0')"
                  class="py-2.5 px-3.5 rounded-lg border border-rose-200/80 bg-rose-50/40 flex items-center gap-2 text-xs text-rose-900"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                  <span class="font-bold text-rose-950">STATUS KRITIS</span>
                  <span class="text-rose-700">·</span>
                  <span class="font-medium text-rose-800">{{ selectedItem.semanticPriorityLabel }} — {{ selectedItem.semanticStatusDescription }}</span>
                </div>

                <!-- Indikator Bahaya / Red Flag (Sections 19, 20: Real data, thin dividers, NO giant red container) -->
                <div class="pt-2">
                  <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Indikator Bahaya
                    </h3>
                    <span
                      v-if="detectedRedFlags.length > 0"
                      class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/70 uppercase tracking-wider"
                    >
                      {{ detectedRedFlags.length }} Terdeteksi
                    </span>
                    <span v-else class="text-[10px] text-slate-400">Tidak ada indikator terdeteksi</span>
                  </div>

                  <div v-if="detectedRedFlags.length > 0" class="divide-y divide-slate-100">
                    <div
                      v-for="rf in detectedRedFlags"
                      :key="rf.key"
                      class="py-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div class="space-y-0.5">
                        <p class="font-bold text-slate-900 text-xs">{{ rf.title }}</p>
                        <p class="text-[11px] text-slate-500 leading-relaxed">{{ rf.evidence }}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        ✓ Terdeteksi
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Clinical Summary (Sections 21, 22: ONE compact strip, 3 equal columns, subtle vertical dividers) -->
                <div class="pt-2">
                  <div class="pb-2.5 border-b border-slate-100">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Ringkasan Hasil Skrining
                    </h3>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 pt-3 pb-1 text-xs">
                    <!-- Column 1: SRQ-20 -->
                    <div class="sm:pr-4">
                      <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">SRQ-20</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                          {{ selectedItem.srqScore !== null ? selectedItem.srqScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal">/ 20</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.srqScore !== null ? (selectedItem.srqScore >= 6 ? 'Skor Positif (≥6)' : 'Skor Negatif (<6)') : 'Data tidak tersedia' }}
                      </span>
                    </div>

                    <!-- Column 2: Faktor Risiko -->
                    <div class="pt-3 sm:pt-0 sm:px-4">
                      <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Faktor Risiko</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                          {{ selectedItem.riskScore !== null ? selectedItem.riskScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal">/ 8</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.riskScore !== null ? (selectedItem.riskScore >= 3 ? 'Risiko Tinggi' : 'Risiko Rendah') : 'Data tidak tersedia' }}
                      </span>
                    </div>

                    <!-- Column 3: Fungsi / ADL -->
                    <div class="pt-3 sm:pt-0 sm:pl-4">
                      <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fungsi / ADL</span>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                          {{ selectedItem.functionScore !== null ? selectedItem.functionScore : '-' }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal">/ 9</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{ selectedItem.functionScore !== null ? (selectedItem.functionScore >= 3 ? 'Terganggu Berat' : 'Terganggu Ringan') : 'Data tidak tersedia' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Workflow Stepper (Section 23: Lightweight horizontal timeline, small circles, thin line) -->
                <div class="pt-2">
                  <div class="pb-2.5 border-b border-slate-100">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Alur Penanganan
                    </h3>
                  </div>
                  <div class="flex items-center justify-between text-xs pt-3 py-1">
                    <!-- Step 1: Laporan -->
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
                        ✓
                      </span>
                      <div>
                        <p class="font-semibold text-slate-800 leading-tight text-xs">Laporan</p>
                        <span class="text-[10px] text-slate-400 block font-normal">Terdata</span>
                      </div>
                    </div>

                    <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                    <!-- Step 2: Verifikasi -->
                    <div class="flex items-center gap-2">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="selectedItem.status !== 'PENDING' ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ selectedItem.status !== 'PENDING' ? '✓' : '2' }}
                      </span>
                      <div>
                        <p class="font-semibold text-slate-800 leading-tight text-xs">Verifikasi</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ selectedItem.status === 'PENDING' ? 'Menunggu' : 'Selesai' }}</span>
                      </div>
                    </div>

                    <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                    <!-- Step 3: Klasifikasi -->
                    <div class="flex items-center gap-2">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? '✓' : '3' }}
                      </span>
                      <div>
                        <p class="font-semibold text-slate-800 leading-tight text-xs">Klasifikasi</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ ['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'Ditetapkan' : 'Menunggu' }}</span>
                      </div>
                    </div>

                    <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                    <!-- Step 4: Rujukan -->
                    <div class="flex items-center gap-2">
                      <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="selectedItem.hasReferral ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        {{ selectedItem.hasReferral ? '✓' : '4' }}
                      </span>
                      <div>
                        <p class="font-semibold text-slate-800 leading-tight text-xs">Rujukan</p>
                        <span class="text-[10px] text-slate-400 block font-normal">{{ selectedItem.hasReferral ? 'Diterbitkan' : 'Menunggu' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: ASESMEN LENGKAP -->
              <div v-if="activeTab === 'assessment'" class="space-y-5">
                <div>
                  <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Instrumen SRQ-20 (20 Pertanyaan)
                      </h3>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        Skor: <strong class="text-slate-800">{{ selectedItem.srqScore !== null ? `${selectedItem.srqScore} / 20` : "Data SRQ-20 tidak tersedia" }}</strong>
                      </p>
                    </div>
                    <span
                      v-if="selectedItem.srqScore !== null"
                      class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                    >
                      Skor: {{ selectedItem.srqScore }} / 20
                    </span>
                  </div>

                  <div
                    v-if="selectedItem.srqResponses && selectedItem.srqResponses.length > 0"
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs"
                  >
                    <div
                      v-for="q in srqQuestions"
                      :key="q.number"
                      class="p-2 rounded-lg border text-xs flex items-start justify-between gap-2"
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
                    class="py-6 text-center text-xs text-slate-400"
                  >
                    Data rincian pertanyaan SRQ-20 belum tercatat.
                  </div>
                </div>

                <!-- Risk Factors & Functioning Breakdown -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <!-- Risk factors -->
                  <div>
                    <div class="pb-2 border-b border-slate-100">
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Faktor Risiko Bencana
                      </h4>
                    </div>
                    <div v-if="selectedItem.riskResponses?.length" class="divide-y divide-slate-100 text-xs">
                      <div
                        v-for="item in riskItems"
                        :key="item.code"
                        class="py-2 flex items-center justify-between text-[11px]"
                      >
                        <span class="text-slate-700">{{ item.label }}</span>
                        <span class="font-bold text-slate-900">{{ formatRiskAnswer(getRiskAnswer(item.code)) }}</span>
                      </div>
                    </div>
                    <div v-else class="py-4 text-center text-xs text-slate-400">
                      Data faktor risiko belum tersedia
                    </div>
                  </div>

                  <!-- Functioning -->
                  <div>
                    <div class="pb-2 border-b border-slate-100">
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Penilaian Fungsi & ADL
                      </h4>
                    </div>
                    <div v-if="selectedItem.functionResponses?.length" class="divide-y divide-slate-100 text-xs">
                      <div
                        v-for="domain in ['SELF_CARE', 'WORK_PRODUCTIVITY', 'FAMILY_SOCIAL', 'MOBILITY']"
                        :key="domain"
                        class="py-2 flex items-center justify-between text-[11px]"
                      >
                        <span class="text-slate-700">{{ domain.replace('_', ' ') }}</span>
                        <span class="font-bold text-slate-900">{{ getFunctionLabel(domain) }}</span>
                      </div>
                    </div>
                    <div v-else class="py-4 text-center text-xs text-slate-400">
                      Data fungsi belum tersedia
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 3: TINDAKAN & RUJUKAN -->
              <div v-if="activeTab === 'actions'" class="space-y-5">
                <!-- Section A: Tele-Verification Form -->
                <div
                  v-if="['PENDING', 'ACKNOWLEDGED'].includes(selectedItem.status)"
                >
                  <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Verifikasi Medis Sekunder (Tele-Verifikasi)
                    </h3>
                    <span class="text-[10px] font-semibold text-slate-400">Tahap 1</span>
                  </div>

                  <form @submit.prevent="submitVerification(selectedItem)" class="pt-3 space-y-3 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                        <label class="text-[11px] font-semibold text-slate-700 block mb-1">
                          Pelapor Lapangan
                        </label>
                        <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold truncate">
                          {{ selectedItem.volunteerName }}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                >
                  <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Penetapan Klasifikasi Triase Klinis Nakes
                    </h3>
                    <span class="text-[10px] font-semibold text-slate-400">Tahap 2</span>
                  </div>

                  <form @submit.prevent="submitClassification(selectedItem)" class="pt-3 space-y-3 text-xs">
                    <div>
                      <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                      <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                >
                  <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Terbitkan Rujukan Medis Darurat
                    </h3>
                    <span class="text-[10px] text-teal-700 font-semibold">Rujukan</span>
                  </div>

                  <form @submit.prevent="submitReferral(selectedItem)" class="pt-3 space-y-3 text-xs">
                    <div>
                      <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                      <label class="text-[11px] font-semibold text-slate-700 block mb-1">
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
                        class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition"
                      >
                        Terbitkan Rujukan Medis
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Section D: If Referral already issued -->
                <div
                  v-if="selectedItem.hasReferral"
                  class="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-1.5"
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
                <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rekam Jejak Operasional Kasus
                  </h3>
                  <span class="text-[11px] font-mono text-slate-400">
                    ID: {{ selectedItem.rmCode }}
                  </span>
                </div>

                <div class="pt-2">
                  <div class="relative pl-6 space-y-4 text-xs before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    <!-- Step 1: Shelter report -->
                    <div class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"></span>
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
          </template>

          <!-- Empty Case Selection State -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3"
          >
            <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="text-sm font-bold text-slate-700">Pilih Insiden dari Antrean</h3>
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

// 4 Essential KPI Counts (Sections 8 & 9)
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
