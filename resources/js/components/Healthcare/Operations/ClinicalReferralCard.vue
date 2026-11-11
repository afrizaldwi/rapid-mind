<template>
    <fieldset :disabled="referral.can_manage === false"
        data-healthcare-draft
        class="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs"
        :aria-label="$t('healthcare.operations.clinicalReferralAria', 'Rujukan klinis')"
    >
        <p v-if="referral.can_manage === false" class="text-slate-600" role="status">
            {{ $t('healthcare.actions.readOnlyNotice', 'Akses baca untuk kasus rujukan. Tindakan klinis tetap pada Faskes penanggung jawab.') }}
        </p>
        <div class="flex flex-wrap justify-between gap-2">
            <strong>{{ $t('healthcare.operations.referralHeading', 'Rujukan') }}</strong
            ><span>{{ clinicalLabel(referral.status, activeLocale) }}</span>
        </div>
        <p>
            {{ $t('common.destination', 'Tujuan') }}:
            <strong>{{
                referral.facility?.name || $t('healthcare.operations.facilityUnavailable', 'Faskes tidak tersedia')
            }}</strong>
        </p>
        <p class="text-slate-500">
            {{ $t('common.source', 'Sumber') }}:
            {{
                referral.source === "T0_CONFIRMED"
                    ? $t('healthcare.operations.sourceT0Confirmed', 'T0 terkonfirmasi')
                    : referral.source === "VALIDATED_ASSESSMENT"
                      ? $t('healthcare.operations.sourceValidatedAssessment', 'Asesmen tervalidasi')
                      : $t('healthcare.operations.sourceUnrecorded', 'Sumber tidak tercatat')
            }}
        </p>
        <p v-if="referral.notes" class="text-slate-600">{{ referral.notes }}</p>
        <template v-if="available && referral.status === 'ACTIVE'">
            <button
                type="button"
                :disabled="busy || stale"
                class="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50"
                @click="confirming = true"
            >
                {{ $t('healthcare.operations.completeReferralBtn', 'Selesaikan pekerjaan rujukan') }}
            </button>
            <OperationConfirmation
                v-if="confirming"
                :title-id="`referral-completion-${referral.id}`"
                :title="$t('healthcare.operations.completeReferralConfirmTitle', 'Selesaikan pekerjaan rujukan internal?')"
                :busy="busy"
                @cancel="cancel"
            >
                <p>
                    {{ $t('healthcare.operations.completeReferralConfirmBody', 'Ini tidak menyatakan pasien diterima, dirawat, atau selesai berobat di Faskes. Status respons lapangan tetap terpisah.') }}
                </p>
                <label class="block"
                    >{{ $t('healthcare.operations.completionNotesLabel', 'Catatan penyelesaian (opsional)') }}<textarea
                        v-model="notes"
                        maxlength="500"
                        class="block w-full rounded border border-slate-300 p-2"
                    />
                </label>
                <button
                    type="button"
                    :disabled="busy || stale"
                    class="rounded-lg bg-teal-700 px-3 py-2 text-white"
                    @click="complete"
                >
                    {{ $t('healthcare.operations.confirmCompleteBtn', 'Ya, selesaikan') }}
                </button>
            </OperationConfirmation>
        </template>
        <p
            v-if="!['ACTIVE', 'COMPLETED'].includes(referral.status)"
            class="text-amber-800"
        >
            {{ $t('healthcare.operations.legacyFlowNotice', 'Rekaman masih memakai alur pergerakan lama. Lanjutkan melalui daftar Rujukan; penyelesaian klinis baru belum tersedia.') }}
        </p>
        <p
            v-for="(error, key) in errors"
            :key="key"
            role="alert"
            class="text-rose-800"
        >
            {{ $loc(error) }}
        </p>
        <p v-if="message" role="status" class="text-teal-800">{{ $loc(message) }}</p>
        <button v-if="stale" type="button" :disabled="busy" @click="refresh">
            {{ $t('healthcare.operations.loadLatestData', 'Muat data terbaru') }}
        </button>
    </fieldset>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import OperationConfirmation from "./OperationConfirmation.vue";
import {
    clinicalLabel,
    clinicalCompletion,
    type ClinicalReferral,
} from "@/lib/healthcareOperations";
import { useHealthcareDraft } from "@/composables/useHealthcareDraft";
import { useHealthcareOperation } from "@/composables/useHealthcareOperation";

const activeLocale = computed(
    () =>
        (globalThis as any)?.__rapidMindLocale?.value ||
        (typeof window !== "undefined" ? (window as any)?.__rapidMindLocale?.value : null) ||
        "id",
);
function $t(key: string, fallback: string, params?: Record<string, string | number>): string {
    const fn =
        (globalThis as any)?.__rapidMindT ||
        (typeof window !== "undefined" ? (window as any)?.__rapidMindT : null);
    if (typeof fn === "function") {
        return fn(key, fallback, params);
    }
    if (!params) return fallback;
    return fallback.replace(/\{(\w+)\}/g, (match, k) => (k in params ? String(params[k]) : match));
}
function $loc(text: string): string {
    const fn =
        (globalThis as any)?.__rapidMindLocalize ||
        (typeof window !== "undefined" ? (window as any)?.__rapidMindLocalize : null);
    return typeof fn === "function" ? fn(text) : text;
}

const props = defineProps<{ referral: ClinicalReferral; available: boolean }>();
const confirming = ref(false);
const notes = ref("");
const draft = useHealthcareDraft(() => notes.value, () => props.available && props.referral.status === 'ACTIVE');
const { busy, stale, errors, message, submit, refresh } =
    useHealthcareOperation(() => draft.submitted());
function cancel() {
    confirming.value = false;
    notes.value = '';
    draft.reset();
}
function complete() {
    const command = clinicalCompletion(props.referral);
    if (command)
        submit({ ...command, data: { ...command.data, notes: notes.value } });
    confirming.value = false;
}
</script>
