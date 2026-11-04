<template>
    <section
        class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
    >
        <h3 class="font-bold">Konteks Asesmen Lapangan</h3>
        <p class="font-semibold">
            {{ context.statusLabel }} · {{ context.modeLabel }}
        </p>
        <p v-if="!context.hasAssessment">
            Konteks asesmen dapat menyusul setelah pengiriman darurat. Pengakuan
            dan penanganan darurat tetap tersedia.
        </p>
        <p v-else-if="!context.srqComplete">
            {{ context.definitiveCount }}/20 jawaban definitif;
            {{ context.unresolvedCount }} jawaban perlu diklarifikasi atau belum
            tercatat. Skor SRQ definitif belum tersedia.
        </p>
        <p v-if="context.invalid" role="alert">
            Data jawaban SRQ tidak valid. Muat ulang konteks asesmen sebelum
            menggunakan skor.
        </p>
        <p
            v-if="
                context.hasAssessment &&
                context.answersComplete &&
                !context.scoringEvidenceValid
            "
            role="alert"
        >
            Bukti skor atau rekomendasi tersimpan belum tersedia, tidak valid,
            atau tidak konsisten. Tinjau bukti jawaban di bawah dan muat ulang
            konteks asesmen setelah data diperbaiki. Validasi berbasis skor
            belum tersedia; tindakan darurat tetap independen.
        </p>
        <h4 class="font-semibold">Observasi Komunikasi Non-Verbal</h4>
        <p v-if="context.observationError" role="alert">
            {{ context.observationError }}
        </p>
        <template v-else>
            <ul
                v-if="context.observations.non_verbal_reasons?.length"
                class="list-disc space-y-1 pl-5"
            >
                <li
                    v-for="code in context.observations.non_verbal_reasons"
                    :key="code"
                >
                    {{ observationLabels[code] }}
                </li>
            </ul>
            <p v-else>Belum ada observasi komunikasi yang tercatat.</p>
            <p
                v-if="context.observations.non_verbal_other_note != null"
                class="whitespace-pre-wrap break-words"
            >
                Catatan lainnya:
                {{ context.observations.non_verbal_other_note }}
            </p>
        </template>
        <p class="text-slate-600">
            Observasi lapangan bukan diagnosis klinis dan tidak menentukan skor
            atau pengiriman T0.
        </p>
    </section>
</template>
<script setup lang="ts">
import { observationLabels } from "@/domain/assessment/observationPresentation";
import type { HealthcareAssessmentPresentation } from "@/lib/healthcareAssessmentPresentation";
defineProps<{ context: HealthcareAssessmentPresentation }>();
</script>
