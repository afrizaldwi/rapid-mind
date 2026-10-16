<template>
    <div
        class="space-y-5"
    >
        <!-- Section A: Tele-Verification Form -->
        <div
            v-if="
                ['PENDING', 'ACKNOWLEDGED'].includes(
                    item.status,
                )
            "
        >
            <div
                class="pb-2.5 border-b border-slate-100 flex items-center justify-between"
            >
                <h3
                    class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                >
                    Verifikasi Medis Sekunder
                    (Tele-Verifikasi)
                </h3>
                <span
                    class="text-[10px] font-semibold text-slate-400"
                    >Tahap 1</span
                >
            </div>

            <form
                @submit.prevent="
                    emit('submit:verify')
                "
                class="pt-3 space-y-3 text-xs"
            >
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                    <div>
                        <label
                            class="text-[11px] font-semibold text-slate-700 block mb-1"
                        >
                            Metode Verifikasi
                        </label>
                        <input
                            type="text"
                            value="Tim Lapangan/ Pemeriksaan Langsung"
                            readonly
                            aria-readonly="true"
                            class="w-full cursor-default rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs text-slate-800"
                        />
                    </div>
                    <div>
                        <label
                            class="text-[11px] font-semibold text-slate-700 block mb-1"
                        >
                            Pelapor Lapangan
                        </label>
                        <div
                            class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold truncate"
                        >
                            {{
                                item.volunteerName
                            }}
                        </div>
                    </div>
                </div>

                <div>
                    <label
                        class="text-[11px] font-semibold text-slate-700 block mb-1"
                    >
                        Catatan Hasil Verifikasi
                        Sekunder Nakes
                    </label>
                    <textarea
                        v-model="verificationNotes"
                        rows="2"
                        placeholder="Konfirmasi kondisi kesadaran, kontak mata, orientasi, serta potensi melukai diri..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                    ></textarea>
                </div>

                <div class="flex justify-end pt-1">
                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                    >
                        Simpan Verifikasi
                    </button>
                </div>
            </form>
        </div>

        <!-- Section B: Triage Classification Form -->
        <div v-if="item.status === 'REVIEWING'">
            <div
                class="pb-2.5 border-b border-slate-100 flex items-center justify-between"
            >
                <h3
                    class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                >
                    Penetapan Klasifikasi Triase Klinis
                    Nakes
                </h3>
                <span
                    class="text-[10px] font-semibold text-slate-400"
                    >Tahap 2</span
                >
            </div>

            <form
                @submit.prevent="
                    emit('submit:classify')
                "
                class="pt-3 space-y-3 text-xs"
            >
                <div>
                    <label
                        class="text-[11px] font-semibold text-slate-700 block mb-1"
                    >
                        Keputusan Klasifikasi
                    </label>
                    <select
                        v-model="clinicalResult"
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    >
                        <option value="T0_CONFIRMED">
                            Konfirmasi T0 (Kedaruratan
                            Nyata — Evakuasi/Rujukan)
                        </option>
                        <option value="T1">
                            Turunkan ke T1 (Mendesak —
                            Pos Medis Lapangan)
                        </option>
                        <option value="T2">
                            Turunkan ke T2 (Terjadwal —
                            Pendampingan Psikososial)
                        </option>
                        <option value="T3">
                            Turunkan ke T3 (Pemantauan —
                            Dukungan Dasar)
                        </option>
                    </select>
                </div>

                <div>
                    <label
                        class="text-[11px] font-semibold text-slate-700 block mb-1"
                    >
                        Pertimbangan Klinis Keputusan
                    </label>
                    <textarea
                        v-model="decisionNotes"
                        rows="2"
                        placeholder="Alasan klinis penegakan atau penurunan triase..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                    ></textarea>
                </div>

                <div class="flex justify-end pt-1">
                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                    >
                        Tetapkan Klasifikasi Triase
                    </button>
                </div>
            </form>
        </div>

        <!-- Section C: Referral Dispatch Form -->
        <div
            v-if="
                item.status === 'CONFIRMED' &&
                !item.hasReferral
            "
        >
            <div
                class="pb-2.5 border-b border-slate-100 flex items-center justify-between"
            >
                <h3
                    class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                >
                    Terbitkan Rujukan Medis Darurat
                </h3>
                <span
                    class="text-[10px] text-teal-700 font-semibold"
                    >Rujukan</span
                >
            </div>

            <form
                @submit.prevent="
                    emit('submit:referral')
                "
                class="pt-3 space-y-3 text-xs"
            >
                <div>
                    <label
                        class="text-[11px] font-semibold text-slate-700 block mb-1"
                    >
                        Fasilitas Kesehatan Tujuan
                        Rujukan
                    </label>
                    <select
                        v-model="facilityId"
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    >
                        <option :value="null">
                            -- Pilih Fasilitas Kesehatan
                            Rujukan --
                        </option>
                        <option
                            v-for="f in facilities ||
                            []"
                            :key="f.id"
                            :value="f.id"
                        >
                            {{ f.name }} — {{ f.type }}
                        </option>
                    </select>
                </div>

                <div>
                    <label
                        class="text-[11px] font-semibold text-slate-700 block mb-1"
                    >
                        Instruksi Medis untuk Tim
                        Transport / Faskes
                    </label>
                    <textarea
                        v-model="referralNotes"
                        rows="2"
                        placeholder="Instruksi medis saat transport / penanganan awal di faskes..."
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    ></textarea>
                </div>

                <div class="flex justify-end pt-1">
                    <button
                        type="submit"
                        :disabled="
                            isSubmitting ||
                            !referralForm.facility_id
                        "
                        class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition"
                    >
                        Terbitkan Rujukan Medis
                    </button>
                </div>
            </form>
        </div>

        <!-- Section D: If Referral already issued -->
        <div
            v-if="item.hasReferral"
            class="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-1.5"
        >
            <div
                class="flex items-center justify-between"
            >
                <span class="font-bold text-teal-900"
                    >Rujukan Medis Diterbitkan</span
                >
                <span
                    class="text-xs font-semibold text-teal-800 flex items-center gap-1.5"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                    {{
                        formatReferralStatus(
                            item.referrals[0]
                                ?.status,
                        )
                    }}
                </span>
            </div>
            <p class="text-slate-600">
                Faskes Tujuan:
                <strong>{{
                    item.referrals[0]?.facility
                        ?.name || "Faskes Rujukan"
                }}</strong>
            </p>
            <p
                v-if="item.referrals[0]?.notes"
                class="text-slate-500 italic"
            >
                "{{ item.referrals[0].notes }}"
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { HealthcareEmergencyQueueItem } from "@/lib/healthcareEmergency";
import { formatReferralStatus } from "@/lib/referralStatus";
import type {
    VerificationForm,
    DecisionForm,
    ReferralForm,
} from "@/composables/useEmergencyActions";

type HealthcareFacility = { id: number; name: string; type: string };

const props = defineProps<{
    item: HealthcareEmergencyQueueItem;
    facilities?: HealthcareFacility[];
    isSubmitting: boolean;
    verificationForm: VerificationForm;
    decisionForm: DecisionForm;
    referralForm: ReferralForm;
}>();

const emit = defineEmits<{
    "update:verificationForm": [patch: Partial<VerificationForm>];
    "update:decisionForm": [patch: Partial<DecisionForm>];
    "update:referralForm": [patch: Partial<ReferralForm>];
    "submit:verify": [];
    "submit:classify": [];
    "submit:referral": [];
}>();

const verificationNotes = computed({
    get: () => props.verificationForm.notes,
    set: (notes: string) => emit("update:verificationForm", { notes }),
});
const clinicalResult = computed({
    get: () => props.decisionForm.clinical_result,
    set: (clinical_result: string) => emit("update:decisionForm", { clinical_result }),
});
const decisionNotes = computed({
    get: () => props.decisionForm.notes,
    set: (notes: string) => emit("update:decisionForm", { notes }),
});
const facilityId = computed({
    get: () => props.referralForm.facility_id,
    set: (facility_id: number | null) => emit("update:referralForm", { facility_id }),
});
const referralNotes = computed({
    get: () => props.referralForm.notes,
    set: (notes: string) => emit("update:referralForm", { notes }),
});
</script>
