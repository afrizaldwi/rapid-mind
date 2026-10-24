<template>
    <section
        data-healthcare-draft
        class="rounded-lg border border-slate-200 bg-white p-3 space-y-3 text-xs"
        aria-label="Respons Lapangan"
    >
        <h3 class="font-bold text-slate-900">Respons Lapangan</h3>
        <p v-if="!operations?.available" role="status" class="text-amber-800">
            Respons lapangan belum tersedia: skema Dispatch memerlukan cutover
            terpisah yang disetujui pemilik proyek.
        </p>
        <template v-else>
            <p class="text-slate-500">
                Penugasan internal tidak berarti unit telah dihubungi dan tidak
                mencadangkan kapasitas.
            </p>
            <div v-if="dispatch" class="space-y-2">
                <p>
                    <strong>{{ dispatchLabel(dispatch.status) }}</strong> •
                    {{ dispatch.response_unit?.name || "Unit tidak tersedia" }}
                </p>
                <p>
                    Ditugaskan {{ formatDateTime(dispatch.assigned_at) }} oleh
                    {{ dispatch.assigner?.name || "Tidak tercatat" }}
                </p>
                <p>
                    Tujuan tersimpan ({{ dispatch.target_source }}):
                    {{ dispatch.target_description }}
                    <span v-if="dispatch.target_latitude !== null"
                        >{{ dispatch.target_latitude }},
                        {{ dispatch.target_longitude }}</span
                    >
                </p>
                <p v-if="dispatch.referral_id">
                    Rujukan terkait:
                    {{
                        linkedReferral?.facility?.name || dispatch.referral_id
                    }}. Hubungan ini tidak dapat diganti.
                </p>
                <p v-else>Belum terhubung ke rujukan.</p>
                <label v-if="dispatch.next_statuses.length" class="block"
                    >Catatan respons (opsional)<textarea
                        v-model="notes"
                        maxlength="1000"
                        class="block w-full rounded border border-slate-300 p-2"
                    />
                </label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="status in dispatch.next_statuses"
                        :key="status"
                        type="button"
                        :disabled="busy || stale"
                        class="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
                        @click="progress(status)"
                    >
                        {{ dispatchLabel(status) }}
                    </button>
                </div>
                <form
                    v-if="
                        !dispatch.referral_id &&
                        dispatch.status !== 'COMPLETED' &&
                        operations.referrals?.length
                    "
                    class="space-y-2"
                    @submit.prevent="
                        submit(referralLink(dispatch, referralId, notes))
                    "
                >
                    <label class="block"
                        >Hubungkan rujukan<select
                            v-model="referralId"
                            class="block w-full rounded border border-slate-300 p-2"
                        >
                            <option value="">Pilih rujukan</option>
                            <option
                                v-for="referral in operations.referrals"
                                :key="referral.id"
                                :value="referral.id"
                            >
                                {{ referral.facility?.name }} —
                                {{ clinicalLabel(referral.status) }}
                            </option>
                        </select></label
                    >
                    <button
                        type="submit"
                        :disabled="busy || stale || !referralId"
                        class="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
                    >
                        Hubungkan secara permanen
                    </button>
                </form>
            </div>
            <form v-else class="space-y-3" @submit.prevent="assign">
                <p>
                    Belum ada respons ditugaskan. Rujukan dan identitas pasien
                    tidak wajib untuk penugasan.
                </p>
                <label class="block"
                    >Unit respons aktif<select
                        v-model="unitId"
                        required
                        class="block w-full rounded border border-slate-300 p-2"
                    >
                        <option :value="null">Pilih unit respons</option>
                        <option
                            v-for="unit in units"
                            :key="unit.id"
                            :value="unit.id"
                        >
                            {{ unit.name }} ({{ unit.code }})
                        </option>
                    </select></label
                >
                <p v-if="!units.length" class="text-amber-800">
                    Belum ada unit respons aktif yang dapat dipilih.
                </p>
                <label class="block"
                    >Sumber tujuan<select
                        v-model="targetSource"
                        required
                        class="block w-full rounded border border-slate-300 p-2"
                    >
                        <option value="">Pilih sumber tujuan</option>
                        <option
                            v-for="target in operations.targets"
                            :key="target.source"
                            :value="target.source"
                        >
                            {{ target.label }}
                        </option>
                    </select></label
                >
                <label v-if="targetSource === 'MANUAL'" class="block"
                    >Deskripsi lokasi tujuan<textarea
                        v-model="description"
                        required
                        maxlength="1000"
                        class="block w-full rounded border border-slate-300 p-2"
                    />
                </label>
                <p role="status" class="rounded bg-slate-50 p-2">
                    Tujuan dipilih:
                    {{
                        targetSource === "MANUAL"
                            ? description || "Isi deskripsi lokasi"
                            : selectedTarget?.label || "Belum dipilih"
                    }}
                </p>
                <label class="block"
                    >Rujukan terkait (opsional)<select
                        v-model="referralId"
                        class="block w-full rounded border border-slate-300 p-2"
                    >
                        <option value="">Tanpa rujukan</option>
                        <option
                            v-for="referral in operations.referrals"
                            :key="referral.id"
                            :value="referral.id"
                        >
                            {{ referral.facility?.name }} —
                            {{ clinicalLabel(referral.status) }}
                        </option>
                    </select></label
                >
                <label class="block"
                    >Catatan penugasan (opsional)<textarea
                        v-model="notes"
                        maxlength="1000"
                        class="block w-full rounded border border-slate-300 p-2"
                    />
                </label>
                <button
                    type="submit"
                    :disabled="
                        busy ||
                        stale ||
                        !unitId ||
                        !targetSource ||
                        (targetSource === 'MANUAL' && !description.trim())
                    "
                    class="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50"
                >
                    Simpan penugasan respons
                </button>
            </form>
            <OperationConfirmation
                v-if="confirming"
                :title-id="`dispatch-completion-${emergencyId}`"
                title="Selesaikan respons lapangan?"
                :busy="busy"
                @cancel="confirming = false"
                ><p>Rujukan dan klasifikasi klinis tidak berubah.</p>
                <button
                    type="button"
                    :disabled="busy || stale"
                    class="rounded-lg bg-teal-700 px-3 py-2 text-white"
                    @click="finish"
                >
                    Ya, selesaikan respons
                </button>
            </OperationConfirmation>
            <p
                v-for="(error, key) in errors"
                :key="key"
                role="alert"
                class="text-rose-800"
            >
                {{ error }}
            </p>
            <p v-if="message" role="status" class="text-teal-800">
                {{ message }}
            </p>
            <button
                v-if="stale"
                type="button"
                :disabled="busy"
                @click="refresh"
            >
                Muat data terbaru
            </button>
        </template>
    </section>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import OperationConfirmation from "./OperationConfirmation.vue";
import {
    dispatchLabel,
    clinicalLabel,
    dispatchTransition,
    dispatchAssignment,
    referralLink,
    type Operations,
    type ResponseUnit,
    type DispatchStatus,
} from "@/lib/healthcareOperations";
import { formatDateTime } from "@/lib/healthcareEmergency";
import { useHealthcareDraft } from "@/composables/useHealthcareDraft";
import { useHealthcareOperation } from "@/composables/useHealthcareOperation";
const props = defineProps<{
    emergencyId: string;
    operations?: Operations;
    units: ResponseUnit[];
}>();
const dispatch = computed(() => props.operations?.dispatch);
const linkedReferral = computed(() =>
    props.operations?.referrals?.find(
        (referral) => referral.id === dispatch.value?.referral_id,
    ),
);
const unitId = ref<number | null>(null);
const targetSource = ref("");
const description = ref("");
const referralId = ref("");
const notes = ref("");
const confirming = ref(false);
const selectedTarget = computed(() =>
    props.operations?.targets?.find(
        (target) => target.source === targetSource.value,
    ),
);
const assignmentDraft = useHealthcareDraft(() => ({
    unit: unitId.value, source: targetSource.value,
    description: targetSource.value === 'MANUAL' ? description.value : '',
    referral_id: referralId.value, notes: notes.value,
}), () => !!props.operations?.available && !dispatch.value);
const responseDraft = useHealthcareDraft(() => notes.value,
    () => !!dispatch.value && dispatch.value.status !== 'COMPLETED');
const linkDraft = useHealthcareDraft(() => referralId.value,
    () => !!dispatch.value && !dispatch.value.referral_id && dispatch.value.status !== 'COMPLETED');
const { busy, stale, errors, message, submit, refresh } =
    useHealthcareOperation(command => {
        const submittedDrafts = command.url.endsWith('/status') ? [responseDraft]
            : command.url.endsWith('/referral') ? [responseDraft, linkDraft]
            : [assignmentDraft, responseDraft, linkDraft];
        const saved = submittedDrafts.map(draft => draft.submitted());
        return () => saved.forEach(acknowledge => acknowledge());
    });
function assign() {
    if (
        !unitId.value ||
        !selectedTarget.value ||
        (targetSource.value === "MANUAL" && !description.value.trim())
    )
        return;
    submit(
        dispatchAssignment(
            props.emergencyId,
            props.operations,
            {
                response_unit_id: unitId.value,
                referral_id: referralId.value,
                target_source: targetSource.value,
                target_description: description.value,
                notes: notes.value,
            },
            props.units,
        ),
    );
}
function progress(status: DispatchStatus) {
    if (status === "COMPLETED") confirming.value = true;
    else if (dispatch.value)
        submit(dispatchTransition(dispatch.value, status, notes.value));
}
function finish() {
    if (dispatch.value)
        submit(dispatchTransition(dispatch.value, "COMPLETED", notes.value));
    confirming.value = false;
}
</script>
