<template>
    <HealthcareLayout>
        <div class="space-y-5 max-w-4xl">
            <!-- Back Navigation -->
            <div>
                <Link
                    href="/healthcare/patients"
                    class="text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Kembali ke Daftar Pasien</span>
                </Link>
            </div>

            <!-- Patient Header Surface (Single Unified Surface) -->
            <div class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Rekam Pasien</span>
                </div>
                <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                    {{ patient.name }}
                </h1>
                <div class="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>NIK: <strong class="font-mono text-slate-700">{{ patient.nik || "Tidak terdata" }}</strong></span>
                    <span>•</span>
                    <span>Usia: {{ patient.age !== null && patient.age !== undefined ? `${patient.age} tahun` : "-" }}</span>
                    <span>•</span>
                    <span>{{ patient.gender || "-" }}</span>
                    <span>•</span>
                    <span>Posko: <strong class="text-slate-700">{{ patient.shelter?.name || "Posko tidak diketahui" }}</strong></span>
                </div>
            </div>

            <!-- Navigation Tabs (Clean text with bottom border indicator) -->
            <nav class="flex items-center space-x-6 border-b border-slate-200 px-1 text-xs" aria-label="Bagian rekam pasien">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    type="button"
                    class="transition -mb-px pb-2.5 font-semibold"
                    :class="
                        activeTab === tab.key
                            ? 'text-teal-800 border-b-2 border-teal-600'
                            : 'text-slate-500 hover:text-slate-800'
                    "
                    @click="activeTab = tab.key"
                >
                    {{ tab.label }}
                </button>
            </nav>

            <!-- TAB 1: RINGKASAN KLINIS (Unified 4-column strip) -->
            <div v-if="activeTab === 'summary'" class="bg-white rounded-xl border border-slate-200/80 p-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
                    <!-- Col 1: Status Aktif T0 -->
                    <div class="space-y-1">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Status Darurat T0</span>
                        <p class="font-bold text-sm text-slate-900">
                            {{ activeEmergency ? emergencyStatus(activeEmergency.status) : "Tidak ada T0 aktif" }}
                        </p>
                        <p v-if="activeEmergency" class="text-[11px] text-rose-600 font-semibold">
                            {{ redFlagLabel(activeEmergency.red_flag_type) }}
                        </p>
                    </div>

                    <!-- Col 2: Asesmen Terakhir -->
                    <div class="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Asesmen Terakhir</span>
                        <div class="flex items-center gap-1.5 text-xs font-bold" v-if="latestAssessment?.triage_result?.system_recommendation" :class="triageTextColor(latestAssessment.triage_result.system_recommendation)">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="triageDotColor(latestAssessment.triage_result.system_recommendation)"></span>
                            <span>{{ latestAssessment.triage_result.system_recommendation }}</span>
                        </div>
                        <span v-else class="font-bold text-sm text-slate-900">Belum ada asesmen</span>
                        <p v-if="latestAssessment" class="text-[11px] text-slate-400">
                            {{ formatDate(assessmentDate(latestAssessment)) }}
                        </p>
                    </div>

                    <!-- Col 3: Validasi Terakhir -->
                    <div class="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Validasi Terakhir</span>
                        <p class="font-bold text-sm text-slate-900">
                            {{ validationItems[0]?.result || "Belum divalidasi" }}
                        </p>
                        <p v-if="validationItems[0]" class="text-[11px] text-slate-400">
                            {{ validationItems[0].validator }} • {{ formatDate(validationItems[0].createdAt) }}
                        </p>
                    </div>

                    <!-- Col 4: Rujukan Aktif -->
                    <div class="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Rujukan Aktif</span>
                        <p class="font-bold text-sm text-slate-900 truncate">
                            {{ activeReferral?.facility?.name || "Tidak ada rujukan" }}
                        </p>
                        <p v-if="activeReferral" class="text-[11px] text-teal-800 font-semibold">
                            Status: {{ formatReferralStatus(activeReferral.status) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- TAB 2: RIWAYAT ASESMEN -->
            <div v-else-if="activeTab === 'assessments'" class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Riwayat Asesmen
                    </h2>
                    <span class="text-xs text-slate-400">
                        {{ patient.assessments?.length || 0 }} sesi
                    </span>
                </div>

                <div v-if="patient.assessments && patient.assessments.length > 0" class="divide-y divide-slate-100">
                    <div
                        v-for="assessment in patient.assessments"
                        :key="assessment.id"
                        class="p-4 sm:p-5 space-y-2 text-xs"
                    >
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span
                                    class="inline-flex items-center gap-1.5 text-xs font-bold"
                                    :class="triageTextColor(assessment.triage_result?.system_recommendation)"
                                >
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shrink-0"
                                        :class="triageDotColor(assessment.triage_result?.system_recommendation)"
                                    ></span>
                                    {{ assessment.triage_result?.system_recommendation || "Tanpa Hasil" }}
                                </span>
                                <span class="text-slate-500 text-[11px]">
                                    {{ formatDate(assessmentDate(assessment)) }}
                                </span>
                                <span v-if="assessment.user?.name" class="text-slate-400 text-[11px]">
                                    • Relawan: {{ assessment.user.name }}
                                </span>
                            </div>

                            <Link
                                v-if="assessment.clinical_validation"
                                :href="`/healthcare/validations/${assessment.id}`"
                                class="text-teal-800 font-semibold hover:underline text-[11px]"
                            >
                                Lihat Validasi ({{ assessment.clinical_validation.clinical_result }}) →
                            </Link>
                        </div>

                        <!-- 4 Scores in a single row without nested boxes -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                            <div class="text-slate-600">
                                SRQ-20: <strong class="text-slate-900">{{ score(assessment.triage_result?.srq_score, 20) }}</strong>
                            </div>
                            <div class="text-slate-600">
                                Faktor Risiko: <strong class="text-slate-900">{{ score(assessment.triage_result?.risk_score, 8) }}</strong>
                            </div>
                            <div class="text-slate-600">
                                Fungsi: <strong class="text-slate-900">{{ score(assessment.triage_result?.function_score, 9) }}</strong>
                            </div>
                            <div class="text-slate-600">
                                Total: <strong class="text-slate-900">{{ score(assessment.triage_result?.total_score, 37) }}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 text-center text-xs text-slate-400">
                    Belum ada riwayat asesmen tercatat untuk pasien ini.
                </div>
            </div>

            <!-- TAB 3: RIWAYAT KEDARURATAN (EMERGENCIES) -->
            <div v-else-if="activeTab === 'emergencies'" class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Riwayat Kedaruratan T0
                    </h2>
                    <span class="text-xs text-slate-400">
                        {{ patient.emergency_events?.length || 0 }} insiden
                    </span>
                </div>

                <div v-if="patient.emergency_events && patient.emergency_events.length > 0" class="divide-y divide-slate-100">
                    <div
                        v-for="emergency in patient.emergency_events"
                        :key="emergency.id"
                        class="p-4 sm:p-5 space-y-2 text-xs"
                    >
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-xs">
                                <span class="inline-flex items-center gap-1.5 font-bold text-rose-700">
                                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                                    {{ redFlagLabel(emergency.red_flag_type) }}
                                </span>
                                <span class="text-slate-300">·</span>
                                <span class="font-medium text-slate-600">
                                    {{ emergencyStatus(emergency.status) }}
                                </span>
                            </div>
                            <span class="text-slate-400 text-[11px]">
                                {{ formatDate(emergency.created_at) }}
                            </span>
                        </div>

                        <p v-if="emergency.notes" class="text-slate-600 text-[11px] italic">
                            "{{ emergency.notes }}"
                        </p>

                        <div v-if="emergencyDecision(emergency)" class="text-[11px] text-slate-500 pt-1">
                            Keputusan: <strong class="text-slate-800">{{ emergencyDecision(emergency).clinical_result }}</strong>
                            <span v-if="emergencyDecision(emergency).notes"> — {{ emergencyDecision(emergency).notes }}</span>
                        </div>

                        <div class="pt-1">
                            <Link
                                :href="`/healthcare/emergencies/${emergency.id}`"
                                class="text-xs font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1"
                            >
                                <span>Buka detail insiden</span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 text-center text-xs text-slate-400">
                    Belum ada catatan insiden darurat T0 untuk pasien ini.
                </div>
            </div>

            <!-- TAB 4: RIWAYAT VALIDASI KLINIS -->
            <div v-else-if="activeTab === 'validations'" class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Riwayat Validasi Klinis
                    </h2>
                    <span class="text-xs text-slate-400">
                        {{ validationItems.length }} validasi
                    </span>
                </div>

                <div v-if="validationItems.length > 0" class="divide-y divide-slate-100">
                    <div
                        v-for="item in validationItems"
                        :key="item.key"
                        class="p-4 sm:p-5 space-y-1.5 text-xs"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-xs">
                                <span
                                    class="inline-flex items-center gap-1.5 font-bold"
                                    :class="triageTextColor(item.result)"
                                >
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shrink-0"
                                        :class="triageDotColor(item.result)"
                                    ></span>
                                    Hasil: {{ item.result }}
                                </span>
                                <span class="text-slate-300">·</span>
                                <span class="text-slate-600 font-medium text-[11px]">
                                    Sumber: {{ item.source }}
                                </span>
                            </div>
                            <span class="text-slate-400 text-[11px]">
                                {{ formatDate(item.createdAt) }}
                            </span>
                        </div>

                        <p class="text-slate-500 text-[11px]">
                            Oleh: <strong class="text-slate-700">{{ item.validator }}</strong>
                        </p>

                        <p v-if="item.notes" class="text-slate-700 text-[11px]">
                            Catatan: {{ item.notes }}
                        </p>
                    </div>
                </div>

                <div v-else class="p-8 text-center text-xs text-slate-400">
                    Belum ada riwayat validasi klinis untuk pasien ini.
                </div>
            </div>

            <!-- TAB 5: RIWAYAT RUJUKAN -->
            <div v-else-if="activeTab === 'referrals'" class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Riwayat Rujukan Medis
                    </h2>
                    <span class="text-xs text-slate-400">
                        {{ patient.referrals?.length || 0 }} rujukan
                    </span>
                </div>

                <div v-if="patient.referrals && patient.referrals.length > 0" class="divide-y divide-slate-100">
                    <div
                        v-for="referral in patient.referrals"
                        :key="referral.id"
                        class="p-4 sm:p-5 space-y-2 text-xs"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-xs">
                                <span
                                    class="inline-flex items-center gap-1.5 font-semibold"
                                    :class="referral.status === 'COMPLETED' ? 'text-teal-800' : 'text-amber-800'"
                                >
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shrink-0"
                                        :class="referral.status === 'COMPLETED' ? 'bg-teal-600' : 'bg-amber-500'"
                                    ></span>
                                    {{ formatReferralStatus(referral.status) }}
                                </span>
                                <span class="text-slate-300">·</span>
                                <span class="font-bold text-slate-800">
                                    {{ referral.facility?.name || "Faskes tidak tersedia" }}
                                </span>
                            </div>
                            <span class="text-slate-400 text-[11px]">
                                {{ formatDate(referral.created_at) }}
                            </span>
                        </div>

                        <p class="text-slate-500 text-[11px]">
                            Asal: {{ referralSource(referral) }} • Perujuk: {{ referral.referrer?.name || "Tidak tercatat" }}
                        </p>

                        <p v-if="referral.notes" class="text-slate-600 text-[11px] italic">
                            "{{ referral.notes }}"
                        </p>

                        <div v-if="referral.status_history?.length" class="pt-1 space-y-0.5 border-t border-slate-50 text-[11px] text-slate-400">
                            <span class="font-semibold text-slate-500 block">Jejak Status:</span>
                            <div
                                v-for="history in referral.status_history"
                                :key="history.id"
                            >
                                {{ formatDate(history.created_at) }} — {{ formatReferralStatus(history.status) }} ({{ history.changer?.name || "Tidak tercatat" }})
                                <span v-if="history.notes"> • {{ history.notes }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 text-center text-xs text-slate-400">
                    Belum ada riwayat rujukan medis untuk pasien ini.
                </div>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import { formatReferralStatus } from "@/lib/referralStatus";

const props = defineProps<{ patient: any }>();
const patient = computed(() => props.patient);

type TabKey =
    | "summary"
    | "assessments"
    | "emergencies"
    | "validations"
    | "referrals";

const activeTab = ref<TabKey>("summary");

const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "summary", label: "Ringkasan" },
    { key: "assessments", label: "Asesmen" },
    { key: "emergencies", label: "Darurat" },
    { key: "validations", label: "Validasi" },
    { key: "referrals", label: "Rujukan" },
];

const latestAssessment = computed(() => patient.value.assessments?.[0] ?? null);

const activeEmergency = computed(
    () =>
        patient.value.emergency_events?.find((emergency: any) =>
            isEmergencyActive(emergency),
        ) ?? null,
);

const activeReferral = computed(
    () =>
        patient.value.referrals?.find(
            (referral: any) => referral.status !== "COMPLETED",
        ) ?? null,
);

const validationItems = computed(() => {
    const items: any[] = [];
    for (const assessment of patient.value.assessments ?? []) {
        const validation = assessment.clinical_validation;
        if (validation?.clinical_result) {
            items.push({
                key: `assessment-${validation.id}`,
                result: validation.clinical_result,
                source: `Asesmen ${assessment.triage_result?.system_recommendation || "tanpa hasil"}`,
                createdAt: validation.created_at,
                validator: validation.validator?.name || "Tidak tercatat",
                notes: validation.diagnosis_notes,
            });
        }
    }
    for (const emergency of patient.value.emergency_events ?? []) {
        for (const verification of emergency.verifications ?? []) {
            if (verification.clinical_result) {
                items.push({
                    key: `emergency-${verification.id}`,
                    result: verification.clinical_result,
                    source: "T0-Suspect",
                    createdAt: verification.created_at,
                    validator: verification.verifier?.name || "Tidak tercatat",
                    notes: verification.notes,
                });
            }
        }
    }
    return items.sort(
        (left, right) =>
            new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime() ||
            String(right.key).localeCompare(String(left.key)),
    );
});

function assessmentDate(assessment: any): string {
    return assessment.completed_at || assessment.created_at;
}

function formatDate(value?: string): string {
    if (!value) return "Waktu tidak tersedia";
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    }).format(new Date(value));
}

function score(value: unknown, maximum = 37): string {
    return value !== null && value !== undefined
        ? `${value} / ${maximum}`
        : "-";
}

function triageTextColor(value?: string): string {
    if (value?.startsWith("T0")) return "text-rose-700";
    if (value === "T1") return "text-orange-700";
    if (value === "T2") return "text-amber-700";
    if (value === "T3") return "text-emerald-700";
    return "text-slate-600";
}

function triageDotColor(value?: string): string {
    if (value?.startsWith("T0")) return "bg-rose-600";
    if (value === "T1") return "bg-orange-600";
    if (value === "T2") return "bg-amber-600";
    if (value === "T3") return "bg-emerald-600";
    return "bg-slate-400";
}

function isEmergencyActive(emergency: any): boolean {
    if (["PENDING", "ACKNOWLEDGED", "REVIEWING"].includes(emergency.status))
        return true;
    if (emergency.status !== "CONFIRMED") return false;
    return (
        !emergency.referrals?.length ||
        emergency.referrals.some(
            (referral: any) => referral.status !== "COMPLETED",
        )
    );
}

function emergencyStatus(status: string): string {
    return (
        (
            {
                PENDING: "Perlu respons",
                ACKNOWLEDGED: "Sudah diakui",
                REVIEWING: "Sedang ditinjau",
                CONFIRMED: "T0 terkonfirmasi",
                DOWNGRADED: "Diturunkan",
                RESOLVED: "Selesai",
            } as Record<string, string>
        )[status] || status
    );
}

function emergencyDecision(emergency: any): any {
    return (
        emergency.verifications?.find(
            (verification: any) => verification.clinical_result,
        ) ?? null
    );
}

function redFlagLabel(type?: string): string {
    return (
        (
            {
                SUICIDAL_IDEATION: "Ideasi / Risiko Bunuh Diri",
                PSYCHOSIS: "Gejala Psikosis Akut",
                SEVERE_AGITATION: "Agitasi / Perilaku Berbahaya",
                MEDICAL_CRISIS: "Krisis Medis Akut",
            } as Record<string, string>
        )[type || ""] || "Tanda bahaya lapangan"
    );
}

function referralSource(referral: any): string {
    if (referral.emergency_event_id) return "Darurat T0";
    if (referral.clinical_validation_id) {
        const recommendation =
            referral.clinical_validation?.assessment?.triage_result
                ?.system_recommendation;
        return recommendation
            ? `Validasi Asesmen (${recommendation})`
            : "Validasi Asesmen";
    }
    return "Sumber tidak tercatat";
}
</script>
