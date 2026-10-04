<template>
    <HealthcareLayout>
        <div class="space-y-5 max-w-4xl">
            <!-- Back Link & Incident Header -->
            <div class="flex items-center justify-between">
                <Link
                    href="/healthcare/emergencies"
                    class="text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Kembali ke Antrean Kasus</span>
                </Link>
                <div class="flex items-center gap-1.5 text-xs font-semibold" :class="emergency.status === 'PENDING' ? 'text-rose-700' : 'text-amber-800'">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="emergency.status === 'PENDING' ? 'bg-rose-600' : 'bg-amber-600'"></span>
                    <span>{{ emergency.status === 'PENDING' ? 'Menunggu Validasi' : emergency.status }}</span>
                </div>
            </div>

            <div
                v-if="actionErrors.length"
                role="alert"
                class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900"
            >
                <p class="font-bold">Tindakan belum dapat diproses:</p>
                <ul class="mt-1 list-disc space-y-0.5 pl-4">
                    <li v-for="error in actionErrors" :key="error.key">
                        {{ error.message }}
                    </li>
                </ul>
            </div>

            <!-- Main Patient & Case Summary (Single Unified Clinical Surface) -->
            <div class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div class="space-y-1">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                            <span>{{ formatRedFlag(emergency.red_flag_type) }}</span>
                        </div>
                        <h2 class="text-xl font-bold text-slate-900 tracking-tight">
                            {{ emergency.patient?.name || "Penyintas Tanpa Nama" }}
                        </h2>
                        <p class="text-xs text-slate-500">
                            NIK: <span class="font-mono text-slate-700">{{ emergency.patient?.nik || "Tidak tercatat" }}</span>
                            • Usia: {{ emergency.patient?.age ?? "-" }} th
                            • {{ emergency.patient?.gender || "-" }}
                        </p>
                    </div>

                    <div class="text-left sm:text-right text-xs">
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Waktu Sinyal SOS</span>
                        <span class="font-bold text-slate-800">
                            {{ new Date(emergency.created_at).toLocaleTimeString("id-ID") }} WIB
                        </span>
                    </div>
                </div>

                <!-- Metadata Row: Divided info row, NO nested cards -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                        <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Posko Lapangan</span>
                        <span class="font-semibold text-slate-800">{{ emergency.shelter?.name || "Posko tidak diketahui" }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Relawan Pelapor</span>
                        <span class="font-semibold text-slate-800">{{ emergency.user?.name || "Relawan" }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Koordinat GPS</span>
                        <span class="font-mono font-semibold text-slate-800">
                            {{ formatCoordinates(emergency.latitude, emergency.longitude) }}
                        </span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Status Triase Awal</span>
                        <span class="font-semibold text-rose-700">T0-Suspect</span>
                    </div>
                </div>

                <!-- Volunteer Contact Section -->
                <div class="pt-3 border-t border-slate-100 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-slate-400 text-[10px] font-semibold uppercase block">Kontak Relawan</span>
                        <span class="font-semibold text-slate-800">{{ emergency.user?.name || "Relawan" }}</span>
                        <span v-if="emergency.user?.phone_number" class="text-slate-600 font-mono ml-2">
                            ({{ emergency.user.phone_number }})
                        </span>
                        <span v-else class="text-slate-400 text-[11px] ml-2">Nomor telepon belum tersedia</span>
                    </div>
                    <a
                        v-if="emergency.user?.phone_number"
                        :href="`tel:${emergency.user.phone_number}`"
                        class="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition"
                    >
                        Hubungi Relawan
                    </a>
                </div>

                <!-- Observation Notes -->
                <div v-if="emergency.notes" class="pt-3 border-t border-slate-100 text-xs">
                    <span class="text-slate-400 text-[10px] font-semibold uppercase block">Catatan Observasi Lapangan</span>
                    <p class="text-slate-700 italic mt-0.5">"{{ emergency.notes }}"</p>
                </div>
            </div>

            <!-- Action Step 1: Acknowledge Incident -->
            <div
                v-if="emergency.status === 'PENDING'"
                class="bg-white rounded-xl border border-rose-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div class="space-y-1">
                    <div class="flex items-center gap-1.5 text-rose-700">
                        <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                        <h3 class="font-bold text-slate-900 text-sm">
                            Langkah 1: Akui Kasus Darurat (Acknowledge)
                        </h3>
                    </div>
                    <p class="text-xs text-slate-500 max-w-xl leading-relaxed">
                        Tekan tombol akui untuk memberitahu relawan di posko bahwa tim medis sedang meninjau kasus ini.
                    </p>
                </div>

                <button
                    type="button"
                    :disabled="isSubmitting"
                    @click="acknowledgeCase"
                    class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shrink-0"
                >
                    Akui Kasus
                </button>
            </div>

            <!-- Action Step 2: Secondary Tele-Verification -->
            <div
                v-if="emergency.status === 'ACKNOWLEDGED'"
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div class="border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-sm">
                        Langkah 2: Verifikasi Sekunder Tenaga Medis
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Lakukan tele-konsultasi dengan relawan di tempat atau dokter jaga posko.
                    </p>
                </div>

                <form @submit.prevent="submitVerification" class="space-y-4 text-xs">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Metode Verifikasi
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
                                <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>Panggilan Telepon</span>
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
                                <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Video Call</span>
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
                                <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Tim Lapangan</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            Catatan Hasil Verifikasi Klinis
                        </label>
                        <textarea
                            v-model="verificationForm.notes"
                            rows="2"
                            placeholder="Catatan observasi atau konfirmasi kondisi penyintas..."
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        Simpan Verifikasi Sekunder
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
                        Langkah 3: Keputusan Klasifikasi Klinis Dokter
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Konfirmasi T0 atau turunkan (downgrade) ke T1 / T2 / T3 sesuai kondisi klinis riil.
                    </p>
                </div>

                <form @submit.prevent="submitClassification" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <button
                            type="button"
                            @click="decisionForm.clinical_result = 'T0_CONFIRMED'"
                            class="p-3 rounded-lg border text-left transition"
                            :class="
                                decisionForm.clinical_result === 'T0_CONFIRMED'
                                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            "
                        >
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-rose-700 uppercase">T0 Terkonfirmasi</span>
                                <span v-if="decisionForm.clinical_result === 'T0_CONFIRMED'">✓</span>
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                Krisis akut. Butuh rujukan segera.
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
                                <span class="text-xs font-bold text-orange-700 uppercase">Diturunkan ke T1</span>
                                <span v-if="decisionForm.clinical_result === 'T1'">✓</span>
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                Bukan ancaman nyawa, rawat jalan posko.
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
                                <span class="text-xs font-bold text-amber-700 uppercase">Diturunkan ke T2</span>
                                <span v-if="decisionForm.clinical_result === 'T2'">✓</span>
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                Distres sedang, konseling posko.
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
                                <span class="text-xs font-bold text-emerald-700 uppercase">Diturunkan ke T3</span>
                                <span v-if="decisionForm.clinical_result === 'T3'">✓</span>
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">
                                Kondisi stabil, dukungan dasar.
                            </p>
                        </button>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            Catatan Justifikasi Klinis
                        </label>
                        <textarea
                            v-model="decisionForm.notes"
                            rows="2"
                            placeholder="Alasan klinis penegakan diagnosis atau dasar penurunan kategori..."
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        Simpan Keputusan Klinis
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
                        Langkah 4: Rujukan Medis
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        T0 telah dikonfirmasi. Buat tiket rujukan ke fasilitas kesehatan lanjutan jika diperlukan.
                    </p>
                </div>

                <template v-if="emergency.referrals?.length">
                    <div class="rounded-lg border border-teal-200/80 bg-teal-50/60 p-3.5 text-xs">
                        <p class="font-semibold text-teal-900">
                            Rujukan telah diterbitkan
                        </p>
                        <p class="mt-1 text-slate-700">
                            Faskes Tujuan: <strong class="text-slate-900">{{ emergency.referrals[0].facility?.name || "Faskes tidak tersedia" }}</strong>
                        </p>
                        <p class="mt-0.5 text-slate-600">
                            Status Rujukan: <span class="font-semibold text-teal-800">{{ formatReferralStatus(emergency.referrals[0].status) }}</span>
                        </p>
                    </div>
                </template>

                <form v-else @submit.prevent="submitReferral" class="space-y-3 text-xs">
                    <div>
                        <label class="mb-1 block text-xs font-semibold text-slate-700">
                            Fasilitas Kesehatan Tujuan Rujukan
                        </label>
                        <select
                            v-model="referralForm.facility_id"
                            required
                            class="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        >
                            <option :value="null" disabled>
                                Pilih Fasilitas Kesehatan Aktif
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
                        <label class="mb-1 block text-xs font-semibold text-slate-700">
                            Catatan Rujukan (Opsional)
                        </label>
                        <textarea
                            v-model="referralForm.notes"
                            rows="2"
                            placeholder="Catatan alasan rujukan atau instruksi khusus..."
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        :disabled="isSubmitting || !referralForm.facility_id"
                        class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                    >
                        Terbitkan Rujukan Medis
                    </button>
                </form>
            </div>

            <!-- Verification History & Audit Trail -->
            <div
                v-if="emergency.verifications && emergency.verifications.length > 0"
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3"
            >
                <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Riwayat Verifikasi & Audit Tim Medis
                </h3>
                <div class="divide-y divide-slate-100 text-xs">
                    <div
                        v-for="v in emergency.verifications"
                        :key="v.id"
                        class="py-2.5 flex items-start justify-between gap-3"
                    >
                        <div class="space-y-0.5">
                            <span class="font-semibold text-slate-800">
                                {{ v.verifier?.name || "Dokter Jaga" }}
                            </span>
                            <span class="text-slate-400 text-[11px] ml-1.5">
                                ({{ v.method || "Verifikasi" }})
                            </span>
                            <p v-if="v.notes" class="text-slate-600 text-[11px]">
                                "{{ v.notes }}"
                            </p>
                        </div>
                        <span class="text-slate-400 text-[11px] shrink-0">
                            {{ new Date(v.created_at).toLocaleTimeString("id-ID") }} WIB
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Link, router, usePage } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import { formatReferralStatus } from "@/lib/referralStatus";

const props = defineProps<{
    emergency: any;
    facilities?: any[];
}>();

const isSubmitting = ref(false);
const page = usePage();
const actionErrors = computed(() =>
    Object.entries(page.props.errors ?? {}).map(([key, message]) => ({
        key,
        message: String(message),
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
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/verify`,
        verificationForm.value,
        {
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function submitClassification() {
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/classify`,
        decisionForm.value,
        {
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function submitReferral() {
    isSubmitting.value = true;
    router.post(
        `/healthcare/emergencies/${props.emergency.id}/referrals`,
        referralForm.value,
        {
            onFinish: () => (isSubmitting.value = false),
        },
    );
}

function formatRedFlag(rf?: string) {
    switch (rf) {
        case "SUICIDAL_IDEATION":
            return "Ideasi / Risiko Bunuh Diri";
        case "PSYCHOSIS":
            return "Psikosis Akut / Disosiasi Berat";
        case "SEVERE_AGITATION":
            return "Agitasi / Perilaku Berbahaya";
        default:
            return "Kegawatdaruratan Medis & Somatik";
    }
}

function formatCoordinates(latitude: unknown, longitude: unknown): string {
    const latitudeNumber = parseCoordinate(latitude);
    const longitudeNumber = parseCoordinate(longitude);

    if (latitudeNumber === null || longitudeNumber === null) {
        return "Sesuai Posko";
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
