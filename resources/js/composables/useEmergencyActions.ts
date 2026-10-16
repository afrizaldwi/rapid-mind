import { ref } from "vue";
import { router } from "@inertiajs/vue3";

export type VerificationForm = { method: string; notes: string };
export type DecisionForm = { clinical_result: string; notes: string };
export type ReferralForm = { facility_id: number | null; notes: string };
type ActionFeedback = { type: "success" | "error"; message: string };

export function useEmergencyActions() {
    const isSubmitting = ref(false);

    // Forms
    const verificationForm = ref<VerificationForm>({
        method: "FIELD_TEAM",
        notes: "",
    });

    const decisionForm = ref<DecisionForm>({
        clinical_result: "T0_CONFIRMED",
        notes: "",
    });

    const referralForm = ref<ReferralForm>({
        facility_id: null,
        notes: "",
    });

    // Action Feedback State
    const actionFeedback = ref<ActionFeedback | null>(null);

    function resetActions() {
        verificationForm.value = { method: "FIELD_TEAM", notes: "" };
        decisionForm.value = { clinical_result: "T0_CONFIRMED", notes: "" };
        referralForm.value = { facility_id: null, notes: "" };
        actionFeedback.value = null;
    }

    // ACTION DISPATCH HANDLERS
    function acknowledgeCase(item: any) {
        if (!item.emergencyId) return;
        isSubmitting.value = true;
        actionFeedback.value = null;
        router.post(
            `/healthcare/emergencies/${item.emergencyId}/acknowledge`,
            {},
            {
                onSuccess: () => {
                    actionFeedback.value = {
                        type: "success",
                        message: "Kasus darurat berhasil diakui.",
                    };
                },
                onError: (errors) => {
                    actionFeedback.value = {
                        type: "error",
                        message:
                            (Object.values(errors)[0] as string) ||
                            "Gagal mengakui kasus.",
                    };
                },
                onFinish: () => {
                    isSubmitting.value = false;
                },
            },
        );
    }

    function submitVerification(item: any) {
        if (!item.emergencyId) return;
        isSubmitting.value = true;
        actionFeedback.value = null;
        router.post(
            `/healthcare/emergencies/${item.emergencyId}/verify`,
            verificationForm.value,
            {
                onSuccess: () => {
                    actionFeedback.value = {
                        type: "success",
                        message: "Verifikasi medis berhasil disimpan.",
                    };
                },
                onError: (errors) => {
                    actionFeedback.value = {
                        type: "error",
                        message:
                            (Object.values(errors)[0] as string) ||
                            "Gagal menyimpan verifikasi.",
                    };
                },
                onFinish: () => {
                    isSubmitting.value = false;
                },
            },
        );
    }

    function submitClassification(item: any) {
        if (!item.emergencyId) return;
        isSubmitting.value = true;
        actionFeedback.value = null;
        router.post(
            `/healthcare/emergencies/${item.emergencyId}/classify`,
            decisionForm.value,
            {
                onSuccess: () => {
                    actionFeedback.value = {
                        type: "success",
                        message: "Klasifikasi triase berhasil ditetapkan.",
                    };
                },
                onError: (errors) => {
                    actionFeedback.value = {
                        type: "error",
                        message:
                            (Object.values(errors)[0] as string) ||
                            "Gagal menetapkan klasifikasi.",
                    };
                },
                onFinish: () => {
                    isSubmitting.value = false;
                },
            },
        );
    }

    function submitReferral(item: any) {
        if (!item.emergencyId) return;
        isSubmitting.value = true;
        actionFeedback.value = null;
        router.post(
            `/healthcare/emergencies/${item.emergencyId}/referrals`,
            referralForm.value,
            {
                onSuccess: () => {
                    actionFeedback.value = {
                        type: "success",
                        message: "Rujukan medis berhasil diterbitkan.",
                    };
                },
                onError: (errors) => {
                    actionFeedback.value = {
                        type: "error",
                        message:
                            (Object.values(errors)[0] as string) ||
                            "Gagal menerbitkan rujukan.",
                    };
                },
                onFinish: () => {
                    isSubmitting.value = false;
                },
            },
        );
    }

    return {
        isSubmitting,
        verificationForm,
        decisionForm,
        referralForm,
        actionFeedback,
        resetActions,
        acknowledgeCase,
        submitVerification,
        submitClassification,
        submitReferral,
    };
}
