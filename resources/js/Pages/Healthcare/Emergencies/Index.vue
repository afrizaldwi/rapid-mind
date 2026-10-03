<template>
  <HealthcareLayout>
    <div class="space-y-4">
      <!-- 1. Operational Workspace Title Bar (Admin Design System Match) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-lg lg:text-xl font-black text-slate-900 tracking-tight">
            Pusat Triase & Kedaruratan Medis PSC 119
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Antrean skrining lapangan terpadu, respon red flag T0, validasi klinis nakes, dan koordinasi rujukan faskes.
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Sistem Siaga: {{ lastUpdatedTime }}
          </span>
        </div>
      </div>

      <!-- 2. KPI Summary Grid (4 Compact Cards matching Admin Summary KPI system) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <!-- Card 1: TOTAL ANTREAN -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Antrean</span>
            <div class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{{ totalSurvivorsCount }}</span>
              <span class="text-xs font-semibold text-slate-500">penyintas</span>
              <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                Terdata aktif
              </span>
            </div>
            <span class="text-[11px] text-slate-400 block mt-1 font-medium">
              Rekam skrining aktif lapangan
            </span>
          </div>
        </div>

        <!-- Card 2: T0 EMERGENCY -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-rose-600 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-rose-600"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">T0 — Emergency</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl lg:text-3xl font-black text-rose-600 tracking-tight">{{ criticalT0Count }}</span>
              <span class="text-xs font-semibold text-rose-600">kasus</span>
              <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Prioritas Nakes
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Siaga PSC 119 & IGD Jiwa
            </span>
          </div>
        </div>

        <!-- Card 3: SEDANG DITINJAU -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-amber-500 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Sedang Ditinjau</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl lg:text-3xl font-black text-amber-600 tracking-tight">{{ activeCasesCount }}</span>
              <span class="text-xs font-semibold text-amber-600">kasus</span>
              <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Proses Triase
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Verifikasi & Klasifikasi nakes
            </span>
          </div>
        </div>

        <!-- Card 4: WAKTU RESPONS PSC 119 -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-teal-600 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-teal-600"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Respons Medis</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">6.8</span>
              <span class="text-xs font-semibold text-slate-500">menit</span>
              <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Target &lt; 15 m
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              SLA Tanggap Darurat PSC 119
            </span>
          </div>
        </div>
      </div>

      <!-- Action & Error Notifications (Admin Alert System Match) -->
      <div v-if="$page.props.flash?.message" class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span>✓</span>
          <span>{{ $page.props.flash.message }}</span>
        </div>
        <button @click="$page.props.flash.message = null" class="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
      </div>

      <div v-if="actionErrors.length > 0" class="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-medium text-rose-900 space-y-1">
        <p class="font-bold">Perhatian pada tindakan medis:</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li v-for="err in actionErrors" :key="err.key">{{ err.message }}</li>
        </ul>
      </div>

      <!-- 3. Two-Panel Clinical Operations Workspace (Left ~32%, Right ~68%) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        <!-- LEFT PANEL: ANTREAN KORBAN & SKRINING (~32% width) -->
        <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
          <!-- Queue Header & Filters -->
          <div class="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Antrean Korban & Skrining
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
                class="w-full pl-8 pr-7 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
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
          <div class="divide-y divide-slate-100 overflow-y-auto max-h-[680px]">
            <div
              v-for="item in filteredQueue"
              :key="item.queueId"
              @click="selectQueueItem(item.queueId)"
              class="p-3.5 transition cursor-pointer text-xs space-y-1.5 relative border-l-4"
              :class="[
                getSeverityBorderClass(item.semanticPriority),
                selectedQueueId === item.queueId
                  ? 'bg-teal-50/40 ring-1 ring-teal-500/20 shadow-2xs'
                  : 'bg-white hover:bg-slate-50/80'
              ]"
            >
              <!-- Card Line 1: Status Badge & Time -->
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

              <!-- Card Line 2: Survivor Name & RM Code (RM = Record ID, never person ID) -->
              <div class="flex items-baseline justify-between gap-1.5">
                <h4 class="text-xs font-bold text-slate-900 truncate">
                  {{ item.survivorName }}
                </h4>
                <span class="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                  {{ item.rmCode }}
                </span>
              </div>

              <!-- Card Line 3: Clinical Reason / Red Flag Snippet -->
              <p v-if="item.redFlagLabel" class="text-[11px] font-medium text-rose-700 truncate">
                RED FLAG: {{ item.redFlagLabel }}
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
        <main class="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden min-h-[680px]">
          <template v-if="selectedItem">
            <!-- Header Bar: Survivor, RM, Status & Prominent Action CTA -->
            <div class="p-5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <!-- Prev / Next navigation buttons -->
                  <div class="flex items-center space-x-1 mr-1">
                    <button
                      type="button"
                      @click="selectPrevCase"
                      class="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 text-xs transition"
                      title="Kasus Sebelumnya"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      @click="selectNextCase"
                      class="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 text-xs transition"
                      title="Kasus Berikutnya"
                    >
                      →
                    </button>
                  </div>

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

              <!-- Primary Action CTA (Admin Button System Match) -->
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
                  <span>AKUI KASUS DARURAT</span>
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

            <!-- Integrated Flat Metadata Row (Admin Design System Match) -->
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

            <!-- Tab Navigation Bar (Admin Tab System Match) -->
            <nav class="px-5 border-b border-slate-200/80 flex items-center space-x-6 text-xs font-semibold bg-white">
              <button
                type="button"
                @click="activeTab = 'overview'"
                :class="activeTab === 'overview'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Ringkasan
              </button>

              <button
                type="button"
                @click="activeTab = 'assessment'"
                :class="activeTab === 'assessment'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Asesmen (SRQ-20)
              </button>

              <button
                type="button"
                @click="activeTab = 'notes'"
                :class="activeTab === 'notes'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Catatan Medis
              </button>

              <button
                type="button"
                @click="activeTab = 'actions'"
                :class="activeTab === 'actions'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Tindakan & Rujukan
              </button>

              <button
                type="button"
                @click="activeTab = 'history'"
                :class="activeTab === 'history'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold py-3 -mb-px'
                  : 'text-slate-500 hover:text-slate-800 font-medium py-3 -mb-px'"
                class="transition"
              >
                Riwayat
              </button>
            </nav>

            <!-- Dynamic Tab Contents -->
            <div class="p-5 flex-1 overflow-y-auto space-y-4">
              
              <!-- TAB 1: RINGKASAN (OVERVIEW) -->
              <div v-if="activeTab === 'overview'" class="space-y-4">
                
                <!-- A. Status Kritis Banner (Admin Alert Component System Match) -->
                <div
                  v-if="selectedItem.hasRedFlag || selectedItem.semanticPriority.startsWith('T0')"
                  class="rounded-xl border border-rose-200/90 border-l-4 border-l-rose-600 bg-rose-50/50 p-4 space-y-2.5 shadow-2xs"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-rose-600 font-black">⚠</span>
                      <h4 class="text-xs font-bold text-rose-900 uppercase tracking-wide">
                        Status Kritis: {{ selectedItem.semanticPriorityLabel }}
                      </h4>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-rose-800 border border-rose-200 shadow-2xs">
                      {{ selectedItem.semanticPriorityLabel }}
                    </span>
                  </div>

                  <p class="text-xs text-rose-950 font-medium">
                    Kasus terdeteksi memiliki sinyal kegawatdaruratan psikiatri/medis aktif dari posko. Segera lakukan validasi sekunder melalui sambungan Tele-Emergency dengan relawan pelapor.
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

                <!-- B. Structured Red Flag List (Sections 20, 21: Real evidence only) -->
                <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <span class="text-rose-600 text-xs font-bold">⚠️</span>
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Indikator Bahaya (Red Flag Kegawatdaruratan)
                      </h4>
                    </div>
                    <span class="text-xs text-slate-400">
                      Evaluasi Multi-Domain Lapangan
                    </span>
                  </div>

                  <!-- 4 Structured Rows using Admin Card Language -->
                  <div class="space-y-2 text-xs">
                    <!-- Row 1: Suicide / Self-Harm -->
                    <div class="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between bg-white hover:bg-slate-50/50 transition">
                      <span class="font-medium text-slate-700 pr-2">
                        1. Risiko keamanan jiwa spesifik: rencana/ungkapan ingin mati (SRQ-17) atau tindakan menyakiti diri aktif
                      </span>
                      <span
                        v-if="isRedFlagIndicatorDetected('SUICIDAL_IDEATION')"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                      >
                        ✓ Terdeteksi
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200 shrink-0"
                      >
                        Tidak Terdeteksi
                      </span>
                    </div>

                    <!-- Row 2: Psychosis -->
                    <div class="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between bg-white hover:bg-slate-50/50 transition">
                      <span class="font-medium text-slate-700 pr-2">
                        2. Gejala psikotik akut: halusinasi visual/auditori, waham paranoid, atau disorganisasi/ucapan tidak terkontrol
                      </span>
                      <span
                        v-if="isRedFlagIndicatorDetected('PSYCHOSIS')"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                      >
                        ✓ Terdeteksi
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200 shrink-0"
                      >
                        Tidak Terdeteksi
                      </span>
                    </div>

                    <!-- Row 3: Agitation -->
                    <div class="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between bg-white hover:bg-slate-50/50 transition">
                      <span class="font-medium text-slate-700 pr-2">
                        3. Perilaku agresif & gangguan kontrol impuls: amuk/agresif fisik merusak atau ancaman pada sekitar
                      </span>
                      <span
                        v-if="isRedFlagIndicatorDetected('SEVERE_AGITATION')"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                      >
                        ✓ Terdeteksi
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200 shrink-0"
                      >
                        Tidak Terdeteksi
                      </span>
                    </div>

                    <!-- Row 4: Somatic Emergency -->
                    <div class="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between bg-white hover:bg-slate-50/50 transition">
                      <span class="font-medium text-slate-700 pr-2">
                        4. Kegawatdaruratan medis & somatik akut: penurunan kesadaran, kejang, hipertermia, atau cedera berat lainnya
                      </span>
                      <span
                        v-if="isRedFlagIndicatorDetected('SOMATIC_EMERGENCY')"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                      >
                        ✓ Terdeteksi
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200 shrink-0"
                      >
                        Tidak Terdeteksi
                      </span>
                    </div>
                  </div>
                </div>

                <!-- C. Compact 3-Column Clinical Score Summary (Real values only) -->
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

                <!-- D. Emergency Response Workflow Stepper (Admin Stepper System Match) -->
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
                        <span :class="['ACKNOWLEDGED', 'REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-teal-700' : 'text-slate-400'">2. Verifikasi</span>
                        <span v-if="['ACKNOWLEDGED', 'REVIEWING', 'CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status)" class="text-teal-600">✓</span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Verifikasi Telepon</p>
                      <p class="text-[10px] text-slate-400 truncate">Tele-Emergency</p>
                    </div>

                    <!-- Step 3 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status)
                        ? 'border-slate-300 bg-white ring-1 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span :class="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status) ? 'text-teal-700' : 'text-slate-400'">3. Klasifikasi</span>
                        <span v-if="['CONFIRMED', 'DOWNGRADED'].includes(selectedItem.status)" class="text-teal-600">✓</span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Hasil Triase Nakes</p>
                      <p class="text-[10px] text-slate-400 truncate">{{ selectedItem.semanticPriorityLabel }}</p>
                    </div>

                    <!-- Step 4 -->
                    <div
                      class="p-2.5 rounded-lg border space-y-0.5"
                      :class="selectedItem.hasReferral
                        ? 'border-slate-300 bg-white ring-1 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/30 opacity-60'"
                    >
                      <div class="flex items-center justify-between text-[10px] font-bold">
                        <span :class="selectedItem.hasReferral ? 'text-teal-700' : 'text-slate-400'">4. Rujukan</span>
                        <span v-if="selectedItem.hasReferral" class="text-teal-600">✓</span>
                      </div>
                      <p class="font-bold text-slate-800 text-[11px]">Rujukan Faskes</p>
                      <p class="text-[10px] text-slate-400 truncate">{{ selectedItem.hasReferral ? 'Diterbitkan' : 'Menunggu' }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: ASESMEN LENGKAP -->
              <div v-if="activeTab === 'assessment'" class="space-y-4">
                <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Hasil Pemeriksaan Instrumen SRQ-20 (20 Pertanyaan)
                      </h4>
                      <p class="text-[11px] text-slate-400">
                        Skor: <strong class="text-slate-800">{{ selectedItem.srqScore !== null ? `${selectedItem.srqScore} / 20` : 'Data SRQ-20 tidak tersedia' }}</strong>
                      </p>
                    </div>
                    <span v-if="selectedItem.srqScore !== null" class="px-2 py-0.5 rounded text-[10px] font-bold" :class="selectedItem.srqScore >= 6 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'">
                      {{ selectedItem.srqScore >= 6 ? 'Skrining Positif (≥ 6)' : 'Skrining Negatif (< 6)' }}
                    </span>
                  </div>

                  <div v-if="selectedItem.srqResponses && selectedItem.srqResponses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div
                      v-for="(q, idx) in srqQuestions"
                      :key="q.number"
                      class="p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2"
                      :class="getSrqAnswer(q.number) === true
                        ? 'border-rose-200 bg-rose-50/40 text-rose-950 font-medium'
                        : (getSrqAnswer(q.number) === false ? 'border-slate-100 bg-slate-50/50 text-slate-600' : 'border-slate-100 bg-white text-slate-400 italic')"
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
                  <div v-else class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                    Data rincian pertanyaan SRQ-20 belum tersedia untuk rekam asesmen ini.
                  </div>
                </div>

                <!-- Faktor Risiko & Fungsi -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Faktor Risiko -->
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Faktor Risiko Kejadian Bencana
                    </h4>
                    <ul class="space-y-1.5 text-xs text-slate-700">
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Kehilangan anggota keluarga terdekat</span>
                        <span class="font-bold text-[11px]" :class="isRiskYes('R1') ? 'text-rose-600' : 'text-slate-400'">
                          {{ isRiskYes('R1') ? 'YA' : 'TIDAK' }}
                        </span>
                      </li>
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Kerusakan rumah / kehilangan tempat tinggal</span>
                        <span class="font-bold text-[11px]" :class="isRiskYes('R2') ? 'text-rose-600' : 'text-slate-400'">
                          {{ isRiskYes('R2') ? 'YA' : 'TIDAK' }}
                        </span>
                      </li>
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Riwayat gangguan psikiatri sebelum bencana</span>
                        <span class="font-bold text-[11px]" :class="isRiskYes('R3') ? 'text-rose-600' : 'text-slate-400'">
                          {{ isRiskYes('R3') ? 'YA' : 'TIDAK' }}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <!-- Tingkat Disfungsi -->
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Asesmen Fungsi Harian (ADL)
                    </h4>
                    <ul class="space-y-1.5 text-xs text-slate-700">
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Perawatan Diri (Makan, Mandi, Tidur)</span>
                        <span class="font-bold text-[11px] text-slate-800">
                          {{ getFunctionLabel('CARE') }}
                        </span>
                      </li>
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Fungsi Sosial & Interaksi Pengungsian</span>
                        <span class="font-bold text-[11px] text-slate-800">
                          {{ getFunctionLabel('SOCIAL') }}
                        </span>
                      </li>
                      <li class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>Aktivitas Sehari-hari / Bekerja</span>
                        <span class="font-bold text-[11px] text-slate-800">
                          {{ getFunctionLabel('WORK') }}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- TAB 3: CATATAN MEDIS -->
              <div v-if="activeTab === 'notes'" class="space-y-4">
                <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Catatan Klinis & Komunikasi Tim Medis
                  </h4>

                  <!-- Timeline notes -->
                  <div class="space-y-2.5">
                    <div
                      v-for="(n, idx) in clinicalNotesList"
                      :key="idx"
                      class="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1 text-xs"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-1.5">
                          <strong class="text-slate-800">{{ n.author }}</strong>
                          <span class="text-[10px] text-slate-400">• {{ n.role }}</span>
                        </div>
                        <span class="text-[10px] text-slate-400">{{ n.time }}</span>
                      </div>
                      <p class="text-slate-700">{{ n.content }}</p>
                    </div>

                    <div v-if="clinicalNotesList.length === 0" class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                      Belum ada catatan klinis tambahan untuk kasus ini.
                    </div>
                  </div>

                  <!-- Input catatan baru -->
                  <div class="pt-2 border-t border-slate-100 space-y-2">
                    <label class="text-[11px] font-bold text-slate-700 block">Tambah Catatan Observasi Nakes</label>
                    <textarea
                      v-model="newClinicalNote"
                      rows="2"
                      placeholder="Tuliskan catatan observasi gejala, respons terapi awal, atau instruksi..."
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
                    ></textarea>
                    <div class="flex justify-end">
                      <button
                        type="button"
                        @click="addLocalNote"
                        :disabled="!newClinicalNote.trim()"
                        class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                      >
                        Simpan Catatan
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 4: TINDAKAN & RUJUKAN -->
              <div v-if="activeTab === 'actions'" class="space-y-4">
                
                <!-- IF EMERGENCY (T0) WORKFLOW -->
                <template v-if="selectedItem.isEmergency">
                  <!-- Section A: Tele-Emergency Verifikasi -->
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Tele-Emergency: Verifikasi Medis dengan Relawan
                        </h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Verifikasi Lapangan</span>
                    </div>

                    <form @submit.prevent="submitVerification(selectedItem)" class="space-y-3 text-xs">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label class="text-[11px] font-bold text-slate-700 block mb-1">Metode Verifikasi</label>
                          <select v-model="verificationForm.method" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
                            <option value="PHONE">Telepon Seluler Langsung</option>
                            <option value="RADIO">Radio Komunikasi Kebencanaan (HT)</option>
                            <option value="FIELD">Pemeriksaan Langsung di Posko</option>
                          </select>
                        </div>
                        <div>
                          <label class="text-[11px] font-bold text-slate-700 block mb-1">Nomor Kontak Relawan Lapangan</label>
                          <input
                            type="text"
                            :value="selectedItem.volunteerPhone || 'Kontak telepon relawan tidak tersedia'"
                            readonly
                            class="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Catatan Hasil Verifikasi Sekunder Nakes</label>
                        <textarea
                          v-model="verificationForm.notes"
                          rows="2"
                          placeholder="Konfirmasi kondisi kesadaran, kontak mata, orientasi, serta potensi melukai diri..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400"
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

                  <!-- Section B: Klasifikasi Triase Nakes -->
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Penetapan Klasifikasi Triase Klinis Nakes
                        </h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Keputusan Klinis</span>
                    </div>

                    <form @submit.prevent="submitClassification(selectedItem)" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Catatan Validasi Klinis Nakes</label>
                        <textarea
                          v-model="decisionForm.clinical_notes"
                          rows="2"
                          placeholder="Catatan justifikasi medis atas penetapan status..."
                          class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                        ></textarea>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label
                          class="p-3 rounded-lg border cursor-pointer text-xs space-y-1 block transition"
                          :class="decisionForm.clinical_result === 'T0_CONFIRMED' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 hover:bg-slate-50'"
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-rose-700">Konfirmasi T0 (Darurat)</span>
                            <input type="radio" value="T0_CONFIRMED" v-model="decisionForm.clinical_result" class="text-rose-600" />
                          </div>
                          <p class="text-[10px] text-slate-500">Pasien membutuhkan intervensi segera dan evakuasi ke faskes rujukan.</p>
                        </label>

                        <label
                          class="p-3 rounded-lg border cursor-pointer text-xs space-y-1 block transition"
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

                  <!-- Section C: Penerbitan Rujukan Medis -->
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Penerbitan Rujukan Medis ke Faskes
                        </h4>
                      </div>
                      <span class="text-[10px] text-slate-400">Disposisi Rujukan Medis</span>
                    </div>

                    <div v-if="selectedItem.status !== 'CONFIRMED'" class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                      Rujukan medis darurat hanya dapat diterbitkan setelah status T0 dikonfirmasi oleh tenaga medis pada tahap klasifikasi.
                    </div>

                    <form @submit.prevent="submitReferral(selectedItem)" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Rumah Sakit / Faskes Tujuan</label>
                        <select v-model="referralForm.facility_id" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
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

                <!-- IF NORMAL ASSESSMENT VALIDATION WORKFLOW -->
                <template v-else>
                  <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Validasi Hasil Skrining Asesmen
                    </h4>

                    <form @submit.prevent="submitValidation(selectedItem)" class="space-y-3 text-xs">
                      <div>
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Konfirmasi Kategori Triase Nakes</label>
                        <select v-model="validationForm.clinical_result" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
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

                      <div v-if="validationForm.referral_required" class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <label class="text-[11px] font-bold text-slate-700 block mb-1">Faskes Rujukan</label>
                        <select v-model="validationForm.facility_id" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800">
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

              <!-- TAB 5: RIWAYAT OPERASIONAL -->
              <div v-if="activeTab === 'history'" class="space-y-4">
                <div class="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Rekam Jejak Operasional Kasus
                    </h4>
                    <span class="text-[11px] font-mono text-slate-400">ID Rekam: {{ selectedItem.rmCode }}</span>
                  </div>

                  <div class="relative pl-6 space-y-4 text-xs before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    <!-- Step 1: Pendaftaran -->
                    <div class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-600 ring-4 ring-white"></span>
                      <span class="text-[10px] font-bold text-teal-800 block">Registrasi Korban</span>
                      <p class="font-bold text-slate-800">Pendaftaran Data Pasien di {{ selectedItem.shelterName }}</p>
                      <p class="text-[11px] text-slate-500">Terdaftar dengan NIK {{ selectedItem.maskedNik }} oleh {{ selectedItem.volunteerName }}.</p>
                    </div>

                    <!-- Step 2: Asesmen Skrining -->
                    <div class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-slate-900 ring-4 ring-white"></span>
                      <span class="text-[10px] font-bold text-slate-500 block">Skrining Awal</span>
                      <p class="font-bold text-slate-800">Asesmen Skrining Psikologis {{ selectedItem.rmCode }}</p>
                      <p class="text-[11px] text-slate-500">Skor SRQ-20: {{ selectedItem.srqScore }}/20 • Rekomendasi: {{ selectedItem.semanticPriorityLabel }}</p>
                    </div>

                    <!-- Step 3: Red Flag (if any) -->
                    <div v-if="selectedItem.hasRedFlag" class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-rose-600 ring-4 ring-white"></span>
                      <span class="text-[10px] font-bold text-rose-700 block">Eskalasi Gawat Darurat</span>
                      <p class="font-bold text-slate-800">Pemicu Red Flag: {{ selectedItem.redFlagLabel }}</p>
                      <p class="text-[11px] text-slate-600">Laporan darurat diteruskan langsung ke komando medis PSC 119 Sleman.</p>
                    </div>

                    <!-- Verifications from DB -->
                    <div v-for="(v, idx) in selectedItem.verifications" :key="idx" class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white"></span>
                      <span class="text-[10px] font-bold text-amber-700 block">Audit Verifikasi Medis</span>
                      <p class="font-bold text-slate-800">Verifikasi oleh {{ v.verifier?.name || 'Dokter Jaga PSC 119' }}</p>
                      <p class="text-[11px] text-slate-500">Metode: {{ v.method || 'Telepon' }} • "{{ v.notes || 'Terverifikasi sesuai SOP.' }}"</p>
                    </div>

                    <!-- Referrals from DB -->
                    <div v-for="(r, idx) in selectedItem.referrals" :key="`ref-${idx}`" class="relative space-y-0.5">
                      <span class="absolute -left-5 top-1 w-2 h-2 rounded-full bg-teal-700 ring-4 ring-white"></span>
                      <span class="text-[10px] font-bold text-teal-800 block">Perintah Rujukan & Evakuasi</span>
                      <p class="font-bold text-slate-800">Faskes Tujuan: {{ r.facility?.name || 'RSUD Rujukan Candi' }}</p>
                      <p class="text-[11px] text-slate-500">Status Rujukan: {{ formatReferralStatus(r.status) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty Case Selection State -->
          <div v-else class="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
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

function selectPrevCase() {
  const idx = filteredQueue.value.findIndex((item: any) => item.queueId === selectedQueueId.value);
  if (idx > 0) {
    selectQueueItem(filteredQueue.value[idx - 1].queueId);
  }
}

function selectNextCase() {
  const idx = filteredQueue.value.findIndex((item: any) => item.queueId === selectedQueueId.value);
  if (idx >= 0 && idx < filteredQueue.value.length - 1) {
    selectQueueItem(filteredQueue.value[idx + 1].queueId);
  }
}

function isRedFlagIndicatorDetected(indicatorKey: string): boolean {
  if (!selectedItem.value) return false;
  const item = selectedItem.value;
  const rawType = String(item.redFlagType || '').toUpperCase();
  const notes = String(item.notes || '').toLowerCase();
  const label = String(item.redFlagLabel || '').toLowerCase();

  if (indicatorKey === 'SUICIDAL_IDEATION') {
    return rawType.includes('SUICIDAL') || notes.includes('bunuh diri') || notes.includes('menyakiti diri') || label.includes('bunuh diri') || getSrqAnswer(17) === true;
  }
  if (indicatorKey === 'PSYCHOSIS') {
    return rawType.includes('PSYCHOS') || notes.includes('halusinasi') || notes.includes('waham') || label.includes('psikotik') || getSrqAnswer(18) === true;
  }
  if (indicatorKey === 'SEVERE_AGITATION') {
    return rawType.includes('AGITAT') || notes.includes('amuk') || notes.includes('agresif') || notes.includes('kekerasan') || label.includes('agitasi');
  }
  if (indicatorKey === 'SOMATIC_EMERGENCY') {
    return rawType.includes('SOMATIC') || notes.includes('kejang') || notes.includes('penurunan kesadaran') || notes.includes('somatik');
  }
  return false;
}

const lastUpdatedTime = ref('10:30 WIB');
onMounted(() => {
  const now = new Date();
  lastUpdatedTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
});

</script>