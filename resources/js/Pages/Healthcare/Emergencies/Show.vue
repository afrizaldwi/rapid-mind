<template>
    <HealthcareLayout>
        <fieldset :disabled="emergency.can_manage === false" class="space-y-5 max-w-4xl">
            <p v-if="emergency.can_manage === false" role="status" class="text-slate-600">{{ $t('healthcare.actions.readOnlyNotice', 'Akses baca untuk kasus rujukan. Tindakan klinis tetap pada Faskes penanggung jawab.') }}</p>
            <!-- Back Link & Incident Header -->
            <div class="flex items-center justify-between">
                <Link
                    href="/healthcare/emergencies"
                    class="text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    <span>{{ $t('healthcare.backToQueue', 'Kembali ke Antrean Kasus') }}</span>
                </Link>
                <div
                    class="flex items-center gap-1.5 text-xs font-semibold"
                    :class="
                        emergency.status === 'PENDING'
                            ? 'text-rose-700'
                            : 'text-amber-800'
                    "
                >
                    <span
                        class="w-1.5 h-1.5 rounded-full shrink-0"
                        :class="
                            emergency.status === 'PENDING'
                                ? 'bg-rose-600'
                                : 'bg-amber-600'
                        "
                    ></span>
                    <span>{{ emergencyStatusLabel(emergency.status) }}</span>
                </div>
            </div>

            <div
                v-if="actionErrors.length"
                role="alert"
                class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900"
            >
                <p class="font-bold">{{ $t('healthcare.actionsCannotProcess', 'Tindakan belum dapat diproses:') }}</p>
                <ul class="mt-1 list-disc space-y-0.5 pl-4">
                    <li v-for="error in actionErrors" :key="error.key">
                        {{ error.message }}
                    </li>
                </ul>
            </div>

            <!-- Main Patient & Case Summary (Single Unified Clinical Surface) -->
            <div
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div
                    class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                    <div class="space-y-1">
                        <div
                            class="flex items-center gap-1.5 text-xs font-bold text-rose-700"
                        >
                            <span
                                class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"
                            ></span>
                            <span>{{
                                formatRedFlag(emergency.red_flag_type)
                            }}</span>
                        </div>
                        <h2
                            class="text-xl font-bold text-slate-900 tracking-tight"
                        >
                            {{
                                emergency.patient?.name ||
                                $t('common.unidentified', 'Penyintas Tanpa Nama')
                            }}
                        </h2>
                        <p class="text-xs text-slate-500">
                            NIK:
                            <span class="font-mono text-slate-700">{{
                                emergency.patient?.nik || $t('assessment.notRecorded', 'Tidak tercatat')
                            }}</span>
                            • {{ $t('assessment.ageLabel', 'Usia') }}: {{ emergency.patient?.age ?? "-" }} {{ $t('common.years', 'th') }} •
                            {{ formatGender(emergency.patient?.gender) }}
                        </p>
                    </div>

                    <div class="text-left sm:text-right text-xs">
                        <span
                            class="text-slate-400 block text-[10px] uppercase font-semibold"
                            >{{ $t('healthcare.sosSignalTime', 'Waktu Sinyal SOS') }}</span
                        >
                        <span class="font-bold text-slate-800">
                            {{
                                new Date(
                                    emergency.created_at,
                                ).toLocaleTimeString(locale === "en" ? "en-US" : "id-ID")
                            }}
                            WIB
                        </span>
                    </div>
                </div>

                <!-- Metadata Row: Divided info row, NO nested cards -->
                <div
                    class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs"
                >
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                            >{{ $t('common.shelter', 'Posko Lapangan') }}</span
                        >
                        <span class="font-semibold text-slate-800">{{
                            emergency.shelter?.name || $t('healthcare.patients.unrecordedShelter', 'Posko tidak diketahui')
                        }}</span>
                    </div>
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                            >{{ $t('healthcare.reportingVolunteer', 'Relawan Pelapor') }}</span
                        >
                        <span class="font-semibold text-slate-800">{{
                            emergency.user?.name || $t('common.volunteer', 'Relawan')
                        }}</span>
                    </div>
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                            >{{ $t('relawan.emergencyPage.gpsCoordinates', 'Koordinat GPS') }}</span
                        >
                        <span class="font-mono font-semibold text-slate-800">
                            {{
                                formatCoordinates(
                                    emergency.latitude,
                                    emergency.longitude,
                                )
                            }}
                        </span>
                    </div>
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                            >{{ $t('healthcare.initialTriageStatus', 'Status Triase Awal') }}</span
                        >
                        <span class="font-semibold text-rose-700"
                            >T0-Suspect</span
                        >
                    </div>
                </div>

                <!-- Volunteer Contact Section -->
                <div
                    class="pt-3 border-t border-slate-100 text-xs flex flex-wrap items-center justify-between gap-2"
                >
                    <div>
                        <span
                            class="text-slate-400 text-[10px] font-semibold uppercase block"
                            >{{ $t('healthcare.volunteerContact', 'Kontak Relawan') }}</span
                        >
                        <span class="font-semibold text-slate-800">{{
                            emergency.user?.name || $t('common.volunteer', 'Relawan')
                        }}</span>
                        <span
                            v-if="emergency.user?.phone_number"
                            class="text-slate-600 font-mono ml-2"
                        >
                            ({{ emergency.user.phone_number }})
                        </span>
                        <span v-else class="text-slate-400 text-[11px] ml-2"
                            >{{ $t('healthcare.phoneNotAvailable', 'Nomor telepon belum tersedia') }}</span
                        >
                    </div>
                    <a
                        v-if="emergency.user?.phone_number"
                        :href="`tel:${emergency.user.phone_number}`"
                        class="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition"
                    >
                        {{ $t('healthcare.callVolunteer', 'Hubungi Relawan') }}
                    </a>
                </div>

                <!-- Observation Notes -->
                <div
                    v-if="emergency.notes"
                    class="pt-3 border-t border-slate-100 text-xs"
                >
                    <span
                        class="text-slate-400 text-[10px] font-semibold uppercase block"
                        >{{ $t('healthcare.observationNotes', 'Catatan Observasi Lapangan') }}</span
                    >
                    <p class="text-slate-700 italic mt-0.5">
                        "{{ emergency.notes }}"
                    </p>
                </div>
            </div>

            <!-- Action Step 1: Acknowledge Incident -->
            <div
                v-if="emergency.status === 'PENDING'"
                class="bg-white rounded-xl border border-rose-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div class="space-y-1">
                    <div class="flex items-center gap-1.5 text-rose-700">
                        <span
                            class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"
                        ></span>
                        <h3 class="font-bold text-slate-900 text-sm">
                            {{ $t('healthcare.emergencyShow.step1Title', 'Langkah 1: Akui Kasus Darurat (Acknowledge)') }}
                        </h3>
                    </div>
                    <p class="text-xs text-slate-500 max-w-xl leading-relaxed">
                        {{ $t('healthcare.emergencyShow.step1Desc', 'Tekan tombol akui untuk memberitahu relawan di posko bahwa tim medis sedang meninjau kasus ini.') }}
                    </p>
                </div>

                <button
                    type="button"
                    :disabled="isSubmitting"
                    @click="acknowledgeCase"
                    class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shrink-0"
                >
                    {{ $t('healthcare.caseHeader.acknowledgeAction', 'Akui Kasus') }}
                </button>
            </div>

            <!-- Action Step 2: Secondary Tele-Verification -->
            <div
                v-if="emergency.status === 'ACKNOWLEDGED'"
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm">
                        {{ $t('healthcare.emergencyShow.step2Title', 'Langkah 2: Verifikasi Sekunder Tenaga Medis') }}
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        {{ $t('healthcare.emergencyShow.step2Desc', 'Lakukan tele-konsultasi dengan relawan di tempat atau dokter jaga posko.') }}
                    </p>
                </div>

                <form
                    @submit.prevent="submitVerification"
                    class="space-y-4 text-xs"
                >
                    <div>
                        <label
                            class="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                            {{ $t('healthcare.actions.verificationMethod', 'Metode Verifikasi') }}
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                @click="verificationForm.method = 'PHONE'"
                                class="p-2.5 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-2"
                                :class="
                                    verificationForm.method === 'PHONE'
                                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                "
                            >
                                <svg
                                    class="w-4 h-4 shrink-0 text-slate-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                </svg>
                                <span>{{ $t('healthcare.verificationMethods.phoneCall', 'Panggilan Telepon') }}</span>
                            </button>
                            <button
                                type="button"
                                @click="verificationForm.method = 'VIDEO'"
                                class="p-2.5 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-2"
                                :class="
                                    verificationForm.method === 'VIDEO'
                                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                "
                            >
                                <svg
                                    class="w-4 h-4 shrink-0 text-slate-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                <span>{{ $t('healthcare.verificationMethods.VIDEO', 'Video Call') }}</span>
                            </button>
                            <button
                                type="button"
                                @click="verificationForm.method = 'FIELD_TEAM'"
                                class="p-2.5 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-2"
                                :class="
                                    verificationForm.method === 'FIELD_TEAM'
                                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                "
                            >
                                <svg
                                    class="w-4 h-4 shrink-0 text-slate-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                <span>{{ $t('healthcare.verificationMethods.FIELD_TEAM', 'Tim Lapangan') }}</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label
                            class="block text-xs font-semibold text-slate-700 mb-1"
                        >
                            {{ $t('healthcare.emergencyShow.verificationNotesLabel', 'Catatan Hasil Verifikasi Klinis') }}
                        </label>
                        <textarea
                            v-model="verificationForm.notes"
                            rows="2"
                            :placeholder="$t('healthcare.emergencyShow.verificationNotesPlaceholder', 'Catatan observasi atau konfirmasi kondisi penyintas...')"
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        {{ $t('healthcare.emergencyShow.saveSecondaryVerification', 'Simpan Verifikasi Sekunder') }}
                    </button>
                </form>
            </div>

            <!-- Action Step 3: Clinical Decision Gate -->
            <div
                v-if="emergency.status === 'REVIEWING'"
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm">
                        {{ $t('healthcare.emergencyShow.step3Title', 'Langkah 3: Keputusan Klasifikasi Klinis Dokter') }}
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        {{ $t('healthcare.emergencyShow.step3Desc', 'Konfirmasi T0 atau turunkan (downgrade) ke T1 / T2 / T3 sesuai kondisi klinis riil.') }}
                    </p>
                </div>

                <form
                    @submit.prevent="submitClassification"
                    class="space-y-4 text-xs"
                >
                    <div
                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
                    >
                        <button
                            type="button"
                            @click="
                                decisionForm.clinical_result = 'T0_CONFIRMED'
                            "
                            class="p-3 rounded-lg border text-left transition"
                            :class="
                                decisionForm.clinical_result === 'T0_CONFIRMED'
                                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-xs font-bold text-rose-700 uppercase"
                                    >{{ $t('healthcare.emergencyShow.confirmT0Title', 'T0 Terkonfirmasi') }}</span
                                >
                                <span
                                    v-if="
                                        decisionForm.clinical_result ===
                                        'T0_CONFIRMED'
                                    "
                                    >✓</span
                                >
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                {{ $t('healthcare.emergencyShow.confirmT0Desc', 'Krisis akut. Butuh rujukan segera.') }}
                            </p>
                        </button>

                        <button
                            type="button"
                            @click="decisionForm.clinical_result = 'T1'"
                            class="p-3 rounded-lg border text-left transition"
                            :class="
                                decisionForm.clinical_result === 'T1'
                                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-xs font-bold text-orange-700 uppercase"
                                    >{{ $t('healthcare.emergencyShow.downgradeT1Title', 'Diturunkan ke T1') }}</span
                                >
                                <span
                                    v-if="decisionForm.clinical_result === 'T1'"
                                    >✓</span
                                >
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                {{ $t('healthcare.emergencyShow.downgradeT1Desc', 'Bukan ancaman nyawa, rawat jalan posko.') }}
                            </p>
                        </button>

                        <button
                            type="button"
                            @click="decisionForm.clinical_result = 'T2'"
                            class="p-3 rounded-lg border text-left transition"
                            :class="
                                decisionForm.clinical_result === 'T2'
                                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-xs font-bold text-amber-700 uppercase"
                                    >{{ $t('healthcare.emergencyShow.downgradeT2Title', 'Diturunkan ke T2') }}</span
                                >
                                <span
                                    v-if="decisionForm.clinical_result === 'T2'"
                                    >✓</span
                                >
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                {{ $t('healthcare.emergencyShow.downgradeT2Desc', 'Distres sedang, konseling posko.') }}
                            </p>
                        </button>

                        <button
                            type="button"
                            @click="decisionForm.clinical_result = 'T3'"
                            class="p-3 rounded-lg border text-left transition"
                            :class="
                                decisionForm.clinical_result === 'T3'
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-xs font-bold text-emerald-700 uppercase"
                                    >{{ $t('healthcare.emergencyShow.downgradeT3Title', 'Diturunkan ke T3') }}</span
                                >
                                <span
                                    v-if="decisionForm.clinical_result === 'T3'"
                                    >✓</span
                                >
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                {{ $t('healthcare.emergencyShow.downgradeT3Desc', 'Kondisi stabil, dukungan dasar.') }}
                            </p>
                        </button>
                    </div>

                    <div>
                        <label
                            class="block text-xs font-semibold text-slate-700 mb-1"
                        >
                            {{ $t('healthcare.emergencyShow.justificationLabel', 'Catatan Justifikasi Klinis') }}
                        </label>
                        <textarea
                            v-model="decisionForm.notes"
                            rows="2"
                            :placeholder="$t('healthcare.emergencyShow.justificationPlaceholder', 'Alasan klinis penegakan diagnosis atau dasar penurunan kategori...')"
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        {{ $t('healthcare.actions.submitDecision', 'Simpan Keputusan Klinis') }}
                    </button>
                </form>
            </div>

            <!-- Action Step 4: Medical Referral -->
            <div
                v-if="['CONFIRMED', 'RESOLVED'].includes(emergency.status)"
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm">
                        {{ $t('healthcare.emergencyShow.step4Title', 'Langkah 4: Rujukan Medis') }}
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        {{ $t('healthcare.emergencyShow.step4Desc', 'T0 telah dikonfirmasi. Buat tiket rujukan ke fasilitas kesehatan lanjutan jika diperlukan.') }}
                    </p>
                </div>

                <template v-if="emergency.referrals?.length">
                    <ClinicalReferralCard
                        v-for="referral in emergency.operations?.referrals ||
                        []"
                        :key="referral.id"
                        :referral="referral"
                        :available="!!emergency.operations?.available"
                    />
                    <p v-if="!emergency.operations?.available">
                        {{ $t('healthcare.emergencyShow.referralCompatNote', 'Rujukan tercatat. Lihat daftar Rujukan untuk alur kompatibilitas.') }}
                    </p>
                </template>

                <form
                    v-else
                    @submit.prevent="submitReferral"
                    class="space-y-3 text-xs"
                >
                    <div>
                        <label
                            class="mb-1 block text-xs font-semibold text-slate-700"
                        >
                            {{ $t('healthcare.actions.targetFacility', 'Fasilitas Kesehatan Tujuan Rujukan') }}
                        </label>
                        <select
                            v-model="referralForm.facility_id"
                            required
                            class="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        >
                            <option :value="null" disabled>
                                {{ $t('healthcare.emergencyShow.selectActiveFacility', 'Pilih Fasilitas Kesehatan Aktif') }}
                            </option>
                            <option
                                v-for="f in facilities"
                                :key="f.id"
                                :value="f.id"
                            >
                                {{ f.name }} ({{ f.type }})
                            </option>
                        </select>
                    </div>
                    <div>
                        <label
                            class="mb-1 block text-xs font-semibold text-slate-700"
                        >
                            {{ $t('healthcare.emergencyShow.referralNotesLabel', 'Catatan Rujukan (Opsional)') }}
                        </label>
                        <textarea
                            v-model="referralForm.notes"
                            rows="2"
                            :placeholder="$t('healthcare.emergencyShow.referralNotesPlaceholder', 'Catatan alasan rujukan atau instruksi khusus...')"
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        :disabled="
                            isSubmitting ||
                            !emergency.patient_id ||
                            !referralForm.facility_id
                        "
                        class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        {{ $t('healthcare.actions.submitReferralButton', 'Terbitkan Rujukan Medis') }}
                    </button>
                </form>
            </div>

            <DispatchPanel
                v-if="emergency.status === 'CONFIRMED'"
                :emergency-id="emergency.id"
                :operations="emergency.operations"
                :units="responseUnits || []"
            />
            <OperationsTimeline :operations="emergency.operations" />
            <details class="rounded-xl border border-slate-200 bg-white p-4">
                <summary
                    class="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                    {{ $t('healthcare.assessmentContext.title', 'Konteks Asesmen Lapangan') }}
                </summary>
                <EmergencyAssessmentTab :item="assessmentItem" />
            </details>

            <!-- Verification History & Audit Trail -->
            <div
                v-if="
                    emergency.verifications &&
                    emergency.verifications.length > 0
                "
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3"
            >
                <h3
                    class="font-bold text-slate-900 text-xs uppercase tracking-wider"
                >
                    {{ $t('healthcare.emergencyShow.auditTrailTitle', 'Riwayat Verifikasi & Audit Tim Medis') }}
                </h3>
                <div class="divide-y divide-slate-100 text-xs">
                    <div
                        v-for="v in emergency.verifications"
                        :key="v.id"
                        class="py-2.5 flex items-start justify-between gap-3"
                    >
                        <div class="space-y-0.5">
                            <span class="font-semibold text-slate-800">
                                {{ v.verifier?.name || $t('healthcare.emergencyShow.dutyPhysician', 'Dokter Jaga') }}
                            </span>
                            <span class="text-slate-400 text-[11px] ml-1.5">
                                ({{ v.method ? $t(`healthcare.verificationMethods.${v.method}`, v.method) : $t('healthcare.overview.stepVerification', 'Verifikasi') }})
                            </span>
                            <p
                                v-if="v.notes"
                                class="text-slate-600 text-[11px]"
                            >
                                "{{ v.notes }}"
                            </p>
                        </div>
                        <span class="text-slate-400 text-[11px] shrink-0">
                            {{
                                new Date(v.created_at).toLocaleTimeString(
                                    locale === "en" ? "en-US" : "id-ID",
                                )
                            }}
                            WIB
                        </span>
                    </div>
                </div>
            </div>
        </fieldset>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { t as $t, useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";
import EmergencyAssessmentTab from "@/components/Healthcare/Emergencies/EmergencyAssessmentTab.vue";
import { normalizeQueueItem } from "@/lib/healthcareEmergency";
import { useHealthcareDraft } from "@/composables/useHealthcareDraft";
import ClinicalReferralCard from "@/components/Healthcare/Operations/ClinicalReferralCard.vue";
import DispatchPanel from "@/components/Healthcare/Operations/DispatchPanel.vue";
import OperationsTimeline from "@/components/Healthcare/Operations/OperationsTimeline.vue";
import type { ResponseUnit } from "@/lib/healthcareOperations";
import { computed, ref } from "vue";
import { Link, router, usePage } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";

const props = defineProps<{
    emergency: any;
    facilities?: any[];
    responseUnits?: ResponseUnit[];
}>();

const { locale } = useI18n();
const isSubmitting = ref(false);
const page = usePage();
const assessmentItem = computed(() =>
    normalizeQueueItem(props.emergency, true, locale.value),
);
const actionErrors = computed(() =>
    Object.entries(page.props.errors ?? {}).map(([key, message]) => ({
        key,
        message: localizeMessage(String(message), locale.value),
    })),
);

const verificationForm = ref({
    method: "PHONE",
    notes: "",
});

const decisionForm = ref({
    clinical_result: "T0_CONFIRMED",
    notes: "",
});

const referralForm = ref({
    facility_id: props.facilities?.[0]?.id ?? null,
    notes: "",
});

const verificationDraft = useHealthcareDraft(
    () => verificationForm.value,
    () => ["PENDING", "ACKNOWLEDGED"].includes(props.emergency.status),
);
const decisionDraft = useHealthcareDraft(
    () => decisionForm.value,
    () => props.emergency.status === "REVIEWING",
);
const referralDraft = useHealthcareDraft(
    () => referralForm.value,
    () =>
        props.emergency.status === "CONFIRMED" &&
        !props.emergency.referrals?.length,
);

function acknowledgeCase() {
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/acknowledge`,
        {},
        {
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function submitVerification() {
    const saved = verificationDraft.submitted();
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/verify`,
        verificationForm.value,
        {
            onSuccess: saved,
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function submitClassification() {
    const saved = decisionDraft.submitted();
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/classify`,
        decisionForm.value,
        {
            onSuccess: saved,
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function submitReferral() {
    const saved = referralDraft.submitted();
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/referrals`,
        referralForm.value,
        {
            onSuccess: saved,
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function emergencyStatusLabel(status?: string): string {
    if (!status) return "-";
    return $t(`healthcare.emergencyStatus.${status}`, status);
}

function formatGender(gender?: string): string {
    if (!gender) return "-";
    if (gender === "Laki-laki") return $t("assessment.male", "Laki-laki");
    if (gender === "Perempuan") return $t("assessment.female", "Perempuan");
    return gender;
}

function formatRedFlag(rf?: string) {
    switch (rf) {
        case "SUICIDAL_IDEATION":
            return $t("relawan.emergencyPage.suicide", "Ideasi / Risiko Bunuh Diri");
        case "PSYCHOSIS":
            return $t("relawan.emergencyPage.psychosis", "Psikosis Akut / Disosiasi Berat");
        case "SEVERE_AGITATION":
            return $t("relawan.emergencyPage.agitation", "Agitasi / Perilaku Berbahaya");
        default:
            return $t("relawan.emergencyPage.medical", "Kegawatdaruratan Medis & Somatik");
    }
}

function formatCoordinates(latitude: unknown, longitude: unknown): string {
    const latitudeNumber = parseCoordinate(latitude);
    const longitudeNumber = parseCoordinate(longitude);

    if (latitudeNumber === null || longitudeNumber === null) {
        return $t("healthcare.emergencyShow.perShelterLocation", "Sesuai Posko");
    }

    return `${latitudeNumber.toFixed(4)}, ${longitudeNumber.toFixed(4)}`;
}

function parseCoordinate(value: unknown): number | null {
    if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "")
    ) {
        return null;
    }

    const numberValue = typeof value === "number" ? value : Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}
</script>
