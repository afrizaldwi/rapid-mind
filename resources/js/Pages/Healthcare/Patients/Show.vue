<template>
    <HealthcareLayout>
        <div class="space-y-6 max-w-5xl">
            <Link
                href="/healthcare/patients"
                class="text-xs font-bold text-teal-800 hover:text-teal-950"
                >← Kembali ke Daftar Pasien</Link
            >
            <header
                class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200"
            >
                <span
                    class="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md"
                    >Rekam Pasien</span
                >
                <h2 class="text-2xl font-black text-slate-900 mt-2">
                    {{ patient.name }}
                </h2>
                <p class="text-xs text-slate-500 mt-1">
                    NIK: {{ patient.nik || "Tidak terdata" }} • Usia:
                    {{ patient.age ?? "-" }} tahun • {{ patient.gender || "-" }}
                </p>
                <p class="text-xs text-slate-500 mt-1">
                    Posko:
                    <strong class="text-slate-700">{{
                        patient.shelter?.name || "Posko tidak diketahui"
                    }}</strong>
                </p>
            </header>

            <nav
                class="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5"
                aria-label="Bagian rekam pasien"
            >
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    type="button"
                    class="shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition"
                    :class="
                        activeTab === tab.key
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                    "
                    @click="activeTab = tab.key"
                >
                    {{ tab.label }}
                </button>
            </nav>

            <section
                v-if="activeTab === 'summary'"
                class="grid gap-4 sm:grid-cols-2"
            >
                <SummaryCard
                    label="Status aktif T0"
                    :value="
                        activeEmergency
                            ? emergencyStatus(activeEmergency.status)
                            : 'Tidak ada T0 aktif'
                    "
                />
                <SummaryCard
                    label="Asesmen terakhir"
                    :value="
                        latestAssessment?.triage_result
                            ?.system_recommendation || 'Belum ada hasil triase'
                    "
                    :detail="
                        latestAssessment
                            ? formatDate(assessmentDate(latestAssessment))
                            : 'Belum ada asesmen'
                    "
                />
                <SummaryCard
                    label="Validasi terakhir"
                    :value="
                        validationItems[0]?.result ||
                        'Belum ada validasi Healthcare'
                    "
                    :detail="
                        validationItems[0]
                            ? `${validationItems[0].source} • ${formatDate(validationItems[0].createdAt)}`
                            : undefined
                    "
                />
                <SummaryCard
                    label="Rujukan aktif"
                    :value="
                        activeReferral?.facility?.name ||
                        'Tidak ada rujukan aktif'
                    "
                    :detail="
                        activeReferral
                            ? formatReferralStatus(activeReferral.status)
                            : undefined
                    "
                />
            </section>

            <section v-else-if="activeTab === 'assessments'" class="space-y-3">
                <h3 class="font-extrabold text-slate-900 text-sm">
                    Riwayat Asesmen ({{ patient.assessments?.length || 0 }})
                </h3>
                <article
                    v-for="assessment in patient.assessments"
                    :key="assessment.id"
                    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                    <div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div class="flex flex-wrap items-center gap-2">
                            <Badge
                                :variant="
                                    badgeVariant(
                                        assessment.triage_result
                                            ?.system_recommendation,
                                    )
                                "
                                >{{
                                    assessment.triage_result
                                        ?.system_recommendation ||
                                    "Belum ada hasil triase"
                                }}</Badge
                            >
                            <span class="text-xs text-slate-500"
                                >Total Skor:
                                <strong>{{
                                    score(assessment.triage_result?.total_score)
                                }}</strong></span
                            >
                        </div>
                        <span class="text-xs text-slate-400">{{
                            formatDate(assessmentDate(assessment))
                        }}</span>
                    </div>
                    <dl class="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <ScoreItem
                            label="SRQ"
                            :value="
                                score(assessment.triage_result?.srq_score, 20)
                            "
                        />
                        <ScoreItem
                            label="Risiko"
                            :value="
                                score(assessment.triage_result?.risk_score, 8)
                            "
                        />
                        <ScoreItem
                            label="Fungsi"
                            :value="
                                score(
                                    assessment.triage_result?.function_score,
                                    9,
                                )
                            "
                        />
                        <ScoreItem
                            label="Relawan"
                            :value="assessment.user?.name || 'Tidak tercatat'"
                        />
                    </dl>
                    <div
                        v-if="assessment.clinical_validation"
                        class="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-1"
                    >
                        <p>
                            <strong>Keputusan Healthcare:</strong>
                            {{ assessment.clinical_validation.clinical_result }}
                        </p>
                        <p>
                            <strong>Catatan:</strong>
                            {{
                                assessment.clinical_validation
                                    .diagnosis_notes || "Tidak ada catatan"
                            }}
                        </p>
                    </div>
                </article>
                <EmptyState
                    v-if="!patient.assessments?.length"
                    text="Belum ada riwayat asesmen terstruktur."
                />
            </section>

            <section v-else-if="activeTab === 'emergencies'" class="space-y-3">
                <h3 class="font-extrabold text-slate-900 text-sm">
                    Riwayat Darurat ({{
                        patient.emergency_events?.length || 0
                    }})
                </h3>
                <article
                    v-for="emergency in patient.emergency_events"
                    :key="emergency.id"
                    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                    <div
                        class="flex flex-wrap items-start justify-between gap-3"
                    >
                        <div>
                            <Badge variant="t0">T0-SUSPECT</Badge>
                            <p class="mt-2 font-bold text-slate-900">
                                {{ redFlagLabel(emergency.red_flag_type) }}
                            </p>
                            <p class="text-xs text-slate-500">
                                {{ formatDate(emergency.created_at) }} •
                                {{
                                    emergency.user?.name ||
                                    "Relawan tidak tercatat"
                                }}
                            </p>
                        </div>
                        <Link
                            :href="`/healthcare/emergencies/${emergency.id}`"
                            class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                            >Lihat Kejadian →</Link
                        >
                    </div>
                    <div class="grid gap-3 text-xs sm:grid-cols-2">
                        <div class="rounded-xl bg-slate-50 p-3">
                            <span class="text-slate-500"
                                >Status penanganan</span
                            >
                            <p class="font-bold text-slate-900">
                                {{ emergencyStatus(emergency.status) }}
                            </p>
                        </div>
                        <div class="rounded-xl bg-slate-50 p-3">
                            <span class="text-slate-500"
                                >Keputusan Healthcare</span
                            >
                            <p class="font-bold text-slate-900">
                                {{
                                    emergencyDecision(emergency)
                                        ?.clinical_result ||
                                    "Belum ada keputusan klinis"
                                }}
                            </p>
                        </div>
                    </div>
                    <p
                        v-if="emergency.referrals?.length"
                        class="text-xs text-slate-600"
                    >
                        Rujukan:
                        {{
                            emergency.referrals
                                .map(
                                    (referral: any) =>
                                        referral.facility?.name ||
                                        "Faskes tidak tersedia",
                                )
                                .join(", ")
                        }}
                    </p>
                </article>
                <EmptyState
                    v-if="!patient.emergency_events?.length"
                    text="Belum ada riwayat insiden T0."
                />
            </section>

            <section v-else-if="activeTab === 'validations'" class="space-y-3">
                <h3 class="font-extrabold text-slate-900 text-sm">
                    Riwayat Validasi Healthcare ({{ validationItems.length }})
                </h3>
                <article
                    v-for="item in validationItems"
                    :key="item.key"
                    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2"
                >
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="font-bold text-slate-900">
                                Hasil: {{ item.result }}
                            </p>
                            <p class="text-xs text-slate-500">
                                Sumber: {{ item.source }}
                            </p>
                        </div>
                        <span class="text-xs text-slate-400">{{
                            formatDate(item.createdAt)
                        }}</span>
                    </div>
                    <p class="text-xs text-slate-600">
                        Validator: {{ item.validator }}
                    </p>
                    <p class="text-xs text-slate-600">
                        Catatan: {{ item.notes || "Tidak ada catatan" }}
                    </p>
                </article>
                <EmptyState
                    v-if="validationItems.length === 0"
                    text="Belum ada keputusan validasi Healthcare."
                />
            </section>

            <section v-else class="space-y-3">
                <h3 class="font-extrabold text-slate-900 text-sm">
                    Riwayat Rujukan ({{ patient.referrals?.length || 0 }})
                </h3>
                <article
                    v-for="referral in patient.referrals"
                    :key="referral.id"
                    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-sm space-y-2"
                >
                    <p class="font-bold text-slate-900">
                        {{ referral.facility?.name || "Faskes tidak tersedia" }}
                        <span
                            v-if="
                                referral.facility &&
                                !referral.facility.is_active
                            "
                            class="text-amber-800 text-xs"
                            >(Nonaktif saat ini)</span
                        >
                    </p>
                    <p class="text-slate-600">
                        Status: {{ formatReferralStatus(referral.status) }} •
                        Dibuat: {{ formatDate(referral.created_at) }}
                    </p>
                    <p class="text-slate-600">
                        Sumber: {{ referralSource(referral) }}
                    </p>
                    <p class="text-slate-600">
                        Diterbitkan oleh:
                        {{ referral.referrer?.name || "Tidak tercatat" }}
                    </p>
                    <div
                        v-if="referral.status_history?.length"
                        class="border-t border-slate-100 pt-2 space-y-1"
                    >
                        <p class="font-bold text-slate-800">Riwayat Status</p>
                        <p
                            v-for="history in referral.status_history"
                            :key="history.id"
                            class="text-xs text-slate-600"
                        >
                            {{ formatDate(history.created_at) }} •
                            {{ formatReferralStatus(history.status) }} •
                            {{ history.changer?.name || "Tidak tercatat"
                            }}<span v-if="history.notes">
                                — {{ history.notes }}</span
                            >
                        </p>
                    </div>
                </article>
                <EmptyState
                    v-if="!patient.referrals?.length"
                    text="Belum ada riwayat rujukan."
                />
            </section>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from "vue";
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import Badge from "@/components/ui/Badge.vue";
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
const SummaryCard = defineComponent({
    props: {
        label: { type: String, required: true },
        value: { type: String, required: true },
        detail: String,
    },
    setup(p) {
        return () =>
            h(
                "article",
                {
                    class: "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs",
                },
                [
                    h(
                        "p",
                        {
                            class: "text-xs font-bold uppercase tracking-wider text-slate-500",
                        },
                        p.label,
                    ),
                    h(
                        "p",
                        { class: "mt-2 text-base font-black text-slate-900" },
                        p.value,
                    ),
                    p.detail
                        ? h(
                              "p",
                              { class: "mt-1 text-xs text-slate-500" },
                              p.detail,
                          )
                        : null,
                ],
            );
    },
});
const ScoreItem = defineComponent({
    props: {
        label: { type: String, required: true },
        value: { type: String, required: true },
    },
    setup(p) {
        return () =>
            h("div", { class: "rounded-xl bg-slate-50 p-3" }, [
                h("dt", { class: "text-slate-500" }, p.label),
                h("dd", { class: "font-bold text-slate-900" }, p.value),
            ]);
    },
});
const EmptyState = defineComponent({
    props: { text: { type: String, required: true } },
    setup(p) {
        return () =>
            h(
                "p",
                {
                    class: "rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500",
                },
                p.text,
            );
    },
});

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
        if (validation)
            items.push({
                key: `assessment-${validation.id}`,
                result: validation.clinical_result,
                source: `Asesmen ${assessment.triage_result?.system_recommendation || "tanpa hasil sistem"}`,
                createdAt: validation.created_at,
                validator: validation.validator?.name || "Tidak tercatat",
                notes: validation.diagnosis_notes,
            });
    }
    for (const emergency of patient.value.emergency_events ?? [])
        for (const verification of emergency.verifications ?? []) {
            if (verification.clinical_result)
                items.push({
                    key: `emergency-${verification.id}`,
                    result: verification.clinical_result,
                    source: "T0-Suspect",
                    createdAt: verification.created_at,
                    validator: verification.verifier?.name || "Tidak tercatat",
                    notes: verification.notes,
                });
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
function badgeVariant(
    category?: string,
): "t0" | "t1" | "t2" | "t3" | "neutral" {
    if (category?.startsWith("T0")) return "t0";
    if (category === "T1") return "t1";
    if (category === "T2") return "t2";
    if (category === "T3") return "t3";
    return "neutral";
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
            ? `Validasi Asesmen (Rekomendasi Sistem ${recommendation})`
            : "Validasi Asesmen";
    }
    return "Sumber historis tidak tercatat";
}
</script>
