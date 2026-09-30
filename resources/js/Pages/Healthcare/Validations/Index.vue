<template>
    <HealthcareLayout>
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-black text-slate-900">
                    Validasi Asesmen
                </h2>
                <p class="text-sm text-slate-500 mt-1">
                    Asesmen T1 dan T2 untuk ditinjau Healthcare. Rekomendasi
                    Sistem bukan diagnosis.
                </p>
            </div>
            <section class="space-y-3">
                <h3 class="font-bold text-slate-900">
                    Perlu Divalidasi ({{ pendingAssessments.length }})
                </h3>
                <p class="text-xs text-slate-500">
                    T1 didahulukan, lalu T2. Dalam setiap prioritas, asesmen
                    terlama ditampilkan lebih dulu.
                </p>
                <article
                    v-for="a in pendingAssessments"
                    :key="a.id"
                    class="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                >
                    <div>
                        <p class="font-bold text-slate-900">
                            {{ a.patient?.name || "Pasien tidak tercatat" }}
                            <Badge
                                :variant="
                                    a.triage_result?.system_recommendation ===
                                    'T1'
                                        ? 't1'
                                        : 't2'
                                "
                                >{{
                                    a.triage_result?.system_recommendation
                                }}</Badge
                            >
                        </p>
                        <p class="text-xs text-slate-500">
                            {{
                                a.user?.shelter?.name || "Posko tidak tercatat"
                            }}
                            • SRQ {{ a.triage_result?.srq_score }}/20 •
                            {{ formatDate(a.completed_at) }}
                        </p>
                    </div>
                    <Link
                        :href="`/healthcare/validations/${a.id}`"
                        class="rounded-xl bg-teal-800 px-4 py-2 text-sm font-bold text-white"
                        >Tinjau Asesmen →</Link
                    >
                </article>
                <p
                    v-if="!pendingAssessments.length"
                    class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
                >
                    Tidak ada asesmen T1/T2 yang menunggu validasi.
                </p>
            </section>
            <section class="space-y-3">
                <h3 class="font-bold text-slate-900">
                    Selesai ({{ completedAssessments.length }})
                </h3>
                <article
                    v-for="a in completedAssessments"
                    :key="a.id"
                    class="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                >
                    <div>
                        <p class="font-bold text-slate-900">
                            {{ a.patient?.name || "Pasien tidak tercatat" }} •
                            Rekomendasi Sistem
                            {{ a.triage_result?.system_recommendation }}
                        </p>
                        <p class="text-xs text-slate-500">
                            Hasil Validasi Healthcare:
                            {{ a.clinical_validation?.clinical_result }} •
                            {{ formatDate(a.completed_at) }}
                        </p>
                    </div>
                    <Link
                        :href="`/healthcare/validations/${a.id}`"
                        class="text-sm font-bold text-teal-800"
                        >Lihat Validasi →</Link
                    >
                </article>
                <p
                    v-if="!completedAssessments.length"
                    class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
                >
                    Belum ada validasi T1/T2 yang selesai.
                </p>
            </section>
        </div>
    </HealthcareLayout>
</template>
<script setup lang="ts">
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import Badge from "@/components/ui/Badge.vue";
interface Item {
    id: string;
    completed_at: string;
    patient?: { name: string } | null;
    user?: { shelter?: { name: string } | null } | null;
    triage_result?: { system_recommendation: string; srq_score: number } | null;
    clinical_validation?: { clinical_result: string } | null;
}
defineProps<{ pendingAssessments: Item[]; completedAssessments: Item[] }>();
function formatDate(value: string) {
    return value
        ? new Date(value).toLocaleString("id-ID")
        : "Waktu tidak tercatat";
}
</script>
