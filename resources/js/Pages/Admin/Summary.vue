<template>
  <AdminLayout>
    <div class="space-y-5">
      <!-- Title & Subtitle -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 class="text-lg lg:text-xl font-black text-slate-900 tracking-tight">
            Ringkasan Operasional Lapangan
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Distribusi kondisi kesehatan jiwa penyintas di seluruh posko pengungsian aktif.
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Data Diperbarui: {{ lastUpdatedTime }}
          </span>
        </div>
      </div>

      <!-- Macro KPI Grid (5 Compact Cards matching reference) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <!-- Card 1: TOTAL PENYINTAS -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Penyintas</span>
            <div class="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{{ kpis.totalSurvivors }}</span>
              <span class="text-xs font-semibold text-slate-500">jiwa</span>
              <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                Terpantau
              </span>
            </div>
            <span class="text-[11px] text-slate-400 block mt-1 font-medium">
              {{ kpis.totalAssessments ?? 0 }} rekam skrining aktif
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
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl lg:text-3xl font-black text-rose-600 tracking-tight">{{ kpis.countT0 }}</span>
              <span class="text-xs font-semibold text-rose-600">({{ percentage(kpis.countT0) }}%)</span>
              <span
                v-if="kpiTrends?.t0Change !== undefined"
                class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="kpiTrends.t0Change > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
              >
                {{ kpiTrends.t0Change > 0 ? `↗ +${kpiTrends.t0Change} hari ini` : (kpiTrends.t0Change < 0 ? `↘ ${kpiTrends.t0Change} hari ini` : '— stabil') }}
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Siaga PSC 119 & IGD Jiwa
            </span>
          </div>
        </div>

        <!-- Card 3: T1 HIGH RISK -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-orange-500 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-orange-500"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">T1 — High Risk</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl lg:text-3xl font-black text-orange-600 tracking-tight">{{ kpis.countT1 }}</span>
              <span class="text-xs font-semibold text-orange-600">({{ percentage(kpis.countT1) }}%)</span>
              <span
                v-if="kpiTrends?.t1Change !== undefined"
                class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="kpiTrends.t1Change > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
              >
                {{ kpiTrends.t1Change > 0 ? `↗ +${kpiTrends.t1Change} hari ini` : (kpiTrends.t1Change < 0 ? `↘ ${kpiTrends.t1Change} hari ini` : '— stabil') }}
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Risiko Tinggi · Konsultasi Faskes
            </span>
          </div>
        </div>

        <!-- Card 4: T2 MODERATE -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-amber-500 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">T2 — Moderate</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl lg:text-3xl font-black text-amber-600 tracking-tight">{{ kpis.countT2 }}</span>
              <span class="text-xs font-semibold text-amber-600">({{ percentage(kpis.countT2) }}%)</span>
              <span
                v-if="kpiTrends?.t2Change !== undefined"
                class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="kpiTrends.t2Change > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
              >
                {{ kpiTrends.t2Change > 0 ? `↗ +${kpiTrends.t2Change} hari ini` : (kpiTrends.t2Change < 0 ? `↘ ${kpiTrends.t2Change} hari ini` : '— stabil') }}
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Risiko Sedang · Pendampingan PFA
            </span>
          </div>
        </div>

        <!-- Card 5: T3 LOW RISK -->
        <div class="bg-white p-4 rounded-xl border border-slate-200/90 border-t-2 border-t-emerald-500 shadow-xs flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">T3 — Low Risk</span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">{{ kpis.countT3 }}</span>
              <span class="text-xs font-semibold text-emerald-600">({{ percentage(kpis.countT3) }}%)</span>
              <span
                v-if="kpiTrends?.t3Change !== undefined"
                class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="kpiTrends.t3Change > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
              >
                {{ kpiTrends.t3Change > 0 ? `↗ +${kpiTrends.t3Change} hari ini` : (kpiTrends.t3Change < 0 ? `↘ ${kpiTrends.t3Change} hari ini` : '— stabil') }}
              </span>
            </div>
            <span class="text-[11px] text-slate-500 block mt-1 font-medium">
              Risiko Rendah · Penguatan Komunitas
            </span>
          </div>
        </div>
      </div>

      <!-- Middle Grid: T0 Early Warning (Left ~60%) + Geospatial Map (Right ~40%) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <!-- T0 Early Warning Module (Kasus Emergensi Kritis) -->
        <div class="lg:col-span-7 bg-rose-50/40 border border-rose-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <!-- Section Header -->
            <div class="flex items-center justify-between pb-3 border-b border-rose-200/60">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 class="text-xs lg:text-sm font-bold text-slate-900 tracking-tight">
                  PERINGATAN DINI KASUS T0 — EMERGENSI KRITIS
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs">
                  {{ activeT0List.length }} Kasus Aktif
                </span>
              </div>

              <Link
                href="/admin/operations/posko"
                class="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
              >
                Lihat Posko
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <!-- T0 Emergency Cards Grid / Empty State -->
            <div v-if="activeT0List.length === 0" class="py-6 px-4 bg-white rounded-lg border border-slate-200 text-center mt-3 space-y-1">
              <span class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold inline-flex items-center justify-center text-xs">✓</span>
              <p class="text-xs font-bold text-slate-800">Tidak ada kedaruratan aktif (T0)</p>
              <p class="text-[11px] text-slate-500">Seluruh posko terpantau aman dan terkendali.</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div
                v-for="e in activeT0List"
                :key="e.id"
                class="bg-white rounded-lg p-3 border border-rose-200/90 shadow-xs flex flex-col justify-between space-y-2 hover:border-rose-400 transition"
              >
                <div>
                  <!-- Patient & Status Tag -->
                  <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-900 text-xs truncate max-w-[120px]">
                      {{ e.patient?.name || 'Penyintas' }}
                    </h4>
                    <span
                      class="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide"
                      :class="e.status === 'CONFIRMED' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'"
                    >
                      {{ e.status === 'CONFIRMED' ? 'T0-CONFIRMED' : 'T0-SUSPECT' }}
                    </span>
                  </div>

                  <!-- RM identifier -->
                  <div class="text-[11px] font-semibold text-slate-600 mt-0.5">
                    RM-{{ formatRecordId(e.assessment_id || e.id) }}
                  </div>

                  <!-- Meta: Time & Posko -->
                  <div class="flex items-center gap-2 text-[10px] text-slate-500 mt-1.5">
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ formatTime(e.created_at) }}
                    </span>
                    <span>·</span>
                    <span class="truncate max-w-[90px] flex items-center gap-0.5">
                      <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {{ e.shelter?.name || 'Posko tidak diketahui' }}
                    </span>
                  </div>

                  <!-- Red Flag Triggers -->
                  <div class="mt-2 space-y-1 text-[10px] text-slate-700 bg-rose-50/50 p-2 rounded border border-rose-100">
                    <div class="flex items-start gap-1 font-medium line-clamp-2">
                      <span class="text-rose-600 font-bold shrink-0">✓</span>
                      <span>{{ getRedFlagSummary(e) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Footer Status & CTA (RBAC correct: Admin monitors posko, does NOT clinically review) -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[9px] font-black text-rose-600 tracking-wider uppercase">
                    {{ e.status === 'CONFIRMED' ? 'TERKONFIRMASI FASKES' : 'MENUNGGU VALIDASI FASKES' }}
                  </span>
                  <Link
                    :href="e.shelter_id ? `/admin/operations/posko/${e.shelter_id}` : '/admin/operations/posko'"
                    class="text-[11px] font-bold text-slate-700 hover:text-teal-700 flex items-center gap-0.5 transition"
                  >
                    Pantau Posko →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sebaran Kasus Geospasial Module -->
        <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <!-- Module Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-xs lg:text-sm font-bold text-slate-900 tracking-tight leading-tight">
                    Sebaran Kasus Geospasial
                  </h3>
                  <span class="text-[10px] text-slate-400 block leading-tight">
                    Posko Penanggulangan Bencana
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                  {{ kpis.totalSurvivors }} Jiwa
                </span>
                <Link
                  href="/admin/map"
                  class="p-1 text-slate-400 hover:text-slate-600 transition"
                  title="Buka Peta Lengkap"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </Link>
              </div>
            </div>

            <!-- Map Viewport with Floating Legend Overlay -->
            <div class="mt-3 relative h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-slate-200">
              <div ref="mapContainer" class="w-full h-full"></div>

              <!-- Floating Map Case Filter Box (top-right overlay per reference) -->
              <div class="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-sm text-[10px] space-y-1.5 z-10">
                <span class="font-bold text-slate-500 uppercase tracking-wider block text-[9px]">
                  FILTER KASUS
                </span>
                <div class="space-y-1 font-medium text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span>T0 Emergency</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>T1 High Risk</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>T2 Moderate</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>T3 Low Risk</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Posko</span>
                  </div>
                </div>

                <div class="pt-1.5 border-t border-slate-100 space-y-1 text-[9px] text-slate-600">
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked class="rounded text-teal-700 focus:ring-0 w-3 h-3" />
                    <span>Heatmap</span>
                  </label>
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" class="rounded text-teal-700 focus:ring-0 w-3 h-3" />
                    <span>Batas Wilayah</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Row: 3 Modular Cards matching reference -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- 1. DISTRIBUSI TINGKAT TRIASE (Donut Chart) -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  DISTRIBUSI TINGKAT TRIASE
                </h3>
              </div>
              <span class="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Hari Ini ▾
              </span>
            </div>

            <!-- Donut Graphic Representation -->
            <div class="py-5 flex flex-col items-center justify-center">
              <div class="relative w-36 h-36">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <!-- Background Ring -->
                  <path
                    class="text-slate-100"
                    stroke-width="5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <!-- T3 Ring Segment -->
                  <path
                    class="text-emerald-500 transition-all duration-500"
                    stroke-width="5"
                    :stroke-dasharray="`${t3Dash}, 100`"
                    stroke-dashoffset="0"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <!-- T2 Ring Segment -->
                  <path
                    class="text-amber-500 transition-all duration-500"
                    stroke-width="5"
                    :stroke-dasharray="`${t2Dash}, 100`"
                    :stroke-dashoffset="`-${t3Dash}`"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <!-- T1 Ring Segment -->
                  <path
                    class="text-orange-500 transition-all duration-500"
                    stroke-width="5"
                    :stroke-dasharray="`${t1Dash}, 100`"
                    :stroke-dashoffset="`-${t3Dash + t2Dash}`"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <!-- T0 Ring Segment -->
                  <path
                    class="text-rose-600 transition-all duration-500"
                    stroke-width="5"
                    :stroke-dasharray="`${t0Dash}, 100`"
                    :stroke-dashoffset="`-${t3Dash + t2Dash + t1Dash}`"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <!-- Center Info -->
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span class="text-xl font-black text-slate-900 leading-none">{{ totalTriageCount }}</span>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Kasus</span>
                </div>
              </div>
            </div>

            <!-- Legend Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs font-semibold pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between p-1.5 rounded bg-rose-50/60 border border-rose-100">
                <span class="flex items-center gap-1.5 text-rose-700">
                  <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                  T0 Darurat
                </span>
                <span class="text-rose-800 font-bold">{{ kpis.countT0 }} ({{ percentage(kpis.countT0) }}%)</span>
              </div>
              <div class="flex items-center justify-between p-1.5 rounded bg-orange-50/60 border border-orange-100">
                <span class="flex items-center gap-1.5 text-orange-700">
                  <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                  T1 Berat
                </span>
                <span class="text-orange-800 font-bold">{{ kpis.countT1 }} ({{ percentage(kpis.countT1) }}%)</span>
              </div>
              <div class="flex items-center justify-between p-1.5 rounded bg-amber-50/60 border border-amber-100">
                <span class="flex items-center gap-1.5 text-amber-700">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  T2 Sedang
                </span>
                <span class="text-amber-800 font-bold">{{ kpis.countT2 }} ({{ percentage(kpis.countT2) }}%)</span>
              </div>
              <div class="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-100">
                <span class="flex items-center gap-1.5 text-emerald-700">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  T3 Stabil
                </span>
                <span class="text-emerald-800 font-bold">{{ kpis.countT3 }} ({{ percentage(kpis.countT3) }}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. BEBAN KASUS PER POSKO BENCANA (Bar Chart) -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  BEBAN KASUS PER POSKO BENCANA
                </h3>
              </div>
              <span class="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {{ shelters?.length || 4 }} Sektor Operasional ▾
              </span>
            </div>

            <!-- Legend indicator -->
            <div class="flex items-center gap-3 text-[10px] font-bold text-slate-500 pt-2 pb-1 justify-end">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-600"></span> T0</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> T1</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> T2</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> T3</span>
            </div>

            <!-- Posko Bars List (Real aggregates, no fake distribution) -->
            <div class="space-y-3.5 pt-2">
              <div v-for="s in shelterCaseloadList" :key="s.id" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-slate-800">{{ s.name }}</span>
                  <span class="text-[11px] text-slate-500 font-semibold">{{ s.total }} jiwa ({{ s.volunteers }} relawan)</span>
                </div>
                <div v-if="s.totalTriage > 0" class="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden" :title="`T0: ${s.t0} | T1: ${s.t1} | T2: ${s.t2} | T3: ${s.t3}`">
                  <div :style="{ width: `${s.t0Pct}%` }" class="bg-rose-600 h-full"></div>
                  <div :style="{ width: `${s.t1Pct}%` }" class="bg-orange-500 h-full"></div>
                  <div :style="{ width: `${s.t2Pct}%` }" class="bg-amber-500 h-full"></div>
                  <div :style="{ width: `${s.t3Pct}%` }" class="bg-emerald-500 h-full"></div>
                </div>
                <div v-else class="w-full h-3 rounded-full bg-slate-100 flex items-center px-2 text-[9px] text-slate-400 font-medium">
                  Belum ada data skrining
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. TREN KASUS 30 HARI (Line / Area Chart) -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  TREN KASUS 30 HARI
                </h3>
              </div>
              <span class="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Semua Posko ▾
              </span>
            </div>

            <!-- Legend indicator -->
            <div class="flex items-center gap-3 text-[10px] font-bold text-slate-500 pt-2 pb-1 justify-end">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-600"></span> T0</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> T1</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> T2</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> T3</span>
            </div>

            <!-- Real Dynamic Trend Line Chart Graphic bound to trendData -->
            <div class="pt-2 pb-2">
              <div class="h-44 w-full relative flex items-center justify-center">
                <div v-if="!hasTrendData" class="flex flex-col items-center justify-center text-slate-400 text-xs font-medium space-y-1">
                  <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  <span>Belum ada data tren 30 hari</span>
                  <span class="text-[10px] text-slate-400">Data terakumulasi seiring pelaksanaan skrining</span>
                </div>
                <svg v-else class="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                  <!-- Grid lines -->
                  <line x1="0" y1="30" x2="300" y2="30" stroke="#F1F5F9" stroke-width="1" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="#F1F5F9" stroke-width="1" />
                  <line x1="0" y1="90" x2="300" y2="90" stroke="#F1F5F9" stroke-width="1" />

                  <!-- Trend T3 line (green) -->
                  <path
                    :d="trendPathT3"
                    fill="none"
                    stroke="#10B981"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                  <!-- Trend T2 line (amber) -->
                  <path
                    :d="trendPathT2"
                    fill="none"
                    stroke="#F59E0B"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                  <!-- Trend T1 line (orange) -->
                  <path
                    :d="trendPathT1"
                    fill="none"
                    stroke="#F97316"
                    stroke-width="2.2"
                    stroke-linecap="round"
                  />
                  <!-- Trend T0 line (red) -->
                  <path
                    :d="trendPathT0"
                    fill="none"
                    stroke="#DC2626"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>

              <!-- Time axis -->
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                <span>30 hari lalu</span>
                <span>15 hari lalu</span>
                <span>Hari ini</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Integrated Shelter Operational Table (Status Posko Pengungsian) -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-slate-900 text-sm tracking-tight">
              Status Posko Pengungsian & Sumber Daya Lapangan
            </h3>
            <span class="text-xs text-slate-400">
              Pemantauan posko terdaftar, alokasi relawan dan daya tampung pengungsi.
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
              {{ shelters?.length || 0 }} Posko Terdaftar
            </span>
            <Link
              href="/admin/operations/posko"
              class="text-xs font-bold text-teal-700 hover:text-teal-900 transition"
            >
              Kelola Posko →
            </Link>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th class="py-3 px-5">Nama Posko</th>
                <th class="py-3 px-5">Lokasi Wilayah</th>
                <th class="py-3 px-5 text-center">Penyintas Terdata</th>
                <th class="py-3 px-5 text-center">Relawan Ditugaskan</th>
                <th class="py-3 px-5 text-center">Status Operasional</th>
                <th class="py-3 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
              <tr v-for="s in shelters" :key="s.id" class="hover:bg-slate-50/70 transition">
                <td class="py-3.5 px-5">
                  <div class="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" :class="s.is_active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                    {{ s.name }}
                  </div>
                  <span class="text-[11px] text-slate-400 font-normal block mt-0.5">
                    ID: {{ s.id }}
                  </span>
                </td>
                <td class="py-3.5 px-5 text-slate-600 text-xs">
                  {{ s.address || 'Kawasan Merapi, Sleman' }}
                </td>
                <td class="py-3.5 px-5 text-center font-bold text-slate-900 text-xs">
                  <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/60 font-black">
                    {{ s.patients_count }} jiwa
                  </span>
                </td>
                <td class="py-3.5 px-5 text-center text-xs">
                  <span class="font-semibold text-slate-700">
                    {{ s.volunteers_count }} personel
                  </span>
                </td>
                <td class="py-3.5 px-5 text-center">
                  <span
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                    :class="s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="s.is_active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                    {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3.5 px-5 text-right">
                  <Link
                    :href="`/admin/operations/posko/${s.id}`"
                    class="text-xs font-semibold text-teal-700 hover:text-teal-900 transition"
                  >
                    Buka Detail →
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Link } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface KPIProps {
  totalSurvivors: number;
  countT0: number;
  countT1: number;
  countT2: number;
  countT3: number;
  totalAssessments?: number;
}

const props = defineProps<{
  kpis: KPIProps;
  kpiTrends?: {
    t0Change?: number;
    t1Change?: number;
    t2Change?: number;
    t3Change?: number;
  };
  shelters: any[];
  mapShelters?: any[];
  t0Emergencies?: any[];
  distribution?: Record<string, number>;
  trendData?: any[];
}>();

const mapContainer = ref<HTMLElement | null>(null);

const lastUpdatedTime = computed(() => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
});

const totalTriageCount = computed(() => {
  return (props.kpis.countT0 || 0) + (props.kpis.countT1 || 0) + (props.kpis.countT2 || 0) + (props.kpis.countT3 || 0);
});

function percentage(val: number): number {
  if (!totalTriageCount.value) return 0;
  return Math.round(((val || 0) / totalTriageCount.value) * 100);
}

const t0Dash = computed(() => percentage(props.kpis.countT0));
const t1Dash = computed(() => percentage(props.kpis.countT1));
const t2Dash = computed(() => percentage(props.kpis.countT2));
const t3Dash = computed(() => percentage(props.kpis.countT3));

// Emergency T0 cards list (Strictly real data only — NO fake mock objects)
const activeT0List = computed(() => {
  return props.t0Emergencies || [];
});

function formatRecordId(id: string | number): string {
  const str = String(id || '');
  if (str.length >= 6) return str.slice(-6).toUpperCase();
  return str ? str.padStart(6, '0') : '000000';
}

function formatTime(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
  } catch {
    return '-';
  }
}

function getRedFlagSummary(e: any): string {
  if (e.notes) return e.notes;
  if (e.red_flag_type) {
    if (e.red_flag_type === 'SUICIDAL_IDEATION') return 'Ideasi Bunuh Diri (Q17)';
    if (e.red_flag_type === 'PSYCHOSIS') return 'Gejala Psikotik Akut Bencana';
    if (e.red_flag_type === 'SEVERE_AGITATION') return 'Agitasi Fisik / Perilaku Membahayakan';
    return `Red Flag: ${e.red_flag_type}`;
  }
  return 'Tanda bahaya kedaruratan jiwa lapangan';
}

// Shelter Caseload distribution calculated from actual records
const shelterCaseloadList = computed(() => {
  return (props.shelters || []).map((s: any) => {
    const t0 = Number(s.t0_count || 0);
    const t1 = Number(s.t1_count || 0);
    const t2 = Number(s.t2_count || 0);
    const t3 = Number(s.t3_count || 0);
    const totalTriage = t0 + t1 + t2 + t3;

    const t0Pct = totalTriage > 0 ? Math.round((t0 / totalTriage) * 100) : 0;
    const t1Pct = totalTriage > 0 ? Math.round((t1 / totalTriage) * 100) : 0;
    const t2Pct = totalTriage > 0 ? Math.round((t2 / totalTriage) * 100) : 0;
    const t3Pct = totalTriage > 0 ? Math.max(0, 100 - (t0Pct + t1Pct + t2Pct)) : 0;

    return {
      id: s.id,
      name: s.name,
      total: s.patients_count || 0,
      volunteers: s.volunteers_count || 0,
      totalTriage,
      t0, t1, t2, t3,
      t0Pct, t1Pct, t2Pct, t3Pct,
    };
  });
});

// Dynamic Trend Chart derived from props.trendData
const hasTrendData = computed(() => {
  if (!props.trendData || props.trendData.length === 0) return false;
  return props.trendData.some((d: any) => (d.t0 || 0) + (d.t1 || 0) + (d.t2 || 0) + (d.t3 || 0) > 0);
});

const maxTrendVal = computed(() => {
  if (!props.trendData || props.trendData.length === 0) return 1;
  let max = 1;
  for (const d of props.trendData) {
    max = Math.max(max, d.t0 || 0, d.t1 || 0, d.t2 || 0, d.t3 || 0);
  }
  return max;
});

function buildTrendPath(category: 't0' | 't1' | 't2' | 't3'): string {
  if (!props.trendData || props.trendData.length === 0) return '';
  const totalPoints = props.trendData.length;
  const max = maxTrendVal.value;

  const points = props.trendData.map((d: any, idx: number) => {
    const x = Math.round((idx / (totalPoints - 1 || 1)) * 300);
    const val = Number(d[category] || 0);
    const y = Math.round(110 - (val / max) * 85);
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}

const trendPathT0 = computed(() => buildTrendPath('t0'));
const trendPathT1 = computed(() => buildTrendPath('t1'));
const trendPathT2 = computed(() => buildTrendPath('t2'));
const trendPathT3 = computed(() => buildTrendPath('t3'));

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    const map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [110.42, -7.70], // Sleman / Merapi
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const points = props.mapShelters || props.shelters || [];
    for (const s of points) {
      // Real coordinates ONLY — NEVER Math.random() per Section 9
      const rawLng = s.longitude !== null && s.longitude !== undefined ? Number(s.longitude) : null;
      const rawLat = s.latitude !== null && s.latitude !== undefined ? Number(s.latitude) : null;

      if (rawLng === null || rawLat === null || isNaN(rawLng) || isNaN(rawLat)) {
        continue;
      }

      const el = document.createElement('div');
      el.className = 'w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black cursor-pointer';

      const hasT0 = Number(s.t0_count || 0) > 0;
      el.style.backgroundColor = hasT0 ? '#DC2626' : '#0F766E';
      el.style.color = '#FFFFFF';
      el.innerText = s.name ? s.name.charAt(0) : 'P';

      new maplibregl.Marker(el)
        .setLngLat([rawLng, rawLat])
        .addTo(map);
    }
  } catch (err) {
    console.warn('Map initialization note:', err);
  }
});
</script>
