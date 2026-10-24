<template>
    <section
        data-healthcare-draft
        class="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs"
        aria-label="Rujukan klinis"
    >
        <div class="flex flex-wrap justify-between gap-2">
            <strong>Rujukan</strong
            ><span>{{ clinicalLabel(referral.status) }}</span>
        </div>
        <p>
            Tujuan:
            <strong>{{
                referral.facility?.name || "Faskes tidak tersedia"
            }}</strong>
        </p>
        <p class="text-slate-500">
            Sumber:
            {{
                referral.source === "T0_CONFIRMED"
                    ? "T0 terkonfirmasi"
                    : referral.source === "VALIDATED_ASSESSMENT"
                      ? "Asesmen tervalidasi"
                      : "Sumber tidak tercatat"
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
                Selesaikan pekerjaan rujukan
            </button>
            <OperationConfirmation
                v-if="confirming"
                :title-id="`referral-completion-${referral.id}`"
                title="Selesaikan pekerjaan rujukan internal?"
                :busy="busy"
                @cancel="cancel"
            >
                <p>
                    Ini tidak menyatakan pasien diterima, dirawat, atau selesai
                    berobat di Faskes. Status respons lapangan tetap terpisah.
                </p>
                <label class="block"
                    >Catatan penyelesaian (opsional)<textarea
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
                    Ya, selesaikan
                </button>
            </OperationConfirmation>
        </template>
        <p
            v-if="!['ACTIVE', 'COMPLETED'].includes(referral.status)"
            class="text-amber-800"
        >
            Rekaman masih memakai alur pergerakan lama. Lanjutkan melalui daftar
            Rujukan; penyelesaian klinis baru belum tersedia.
        </p>
        <p
            v-for="(error, key) in errors"
            :key="key"
            role="alert"
            class="text-rose-800"
        >
            {{ error }}
        </p>
        <p v-if="message" role="status" class="text-teal-800">{{ message }}</p>
        <button v-if="stale" type="button" :disabled="busy" @click="refresh">
            Muat data terbaru
        </button>
    </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import OperationConfirmation from "./OperationConfirmation.vue";
import {
    clinicalLabel,
    clinicalCompletion,
    type ClinicalReferral,
} from "@/lib/healthcareOperations";
import { useHealthcareDraft } from "@/composables/useHealthcareDraft";
import { useHealthcareOperation } from "@/composables/useHealthcareOperation";
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
