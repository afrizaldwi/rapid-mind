import { ref } from "vue";
import { router } from "@inertiajs/vue3";

type OperationCommand = { url: string; data: Record<string, string | number | null> };
export function useHealthcareOperation(onSubmitted: (command: OperationCommand) => (() => void) = () => () => {}) {
    const busy = ref(false);
    const stale = ref(false);
    const errors = ref<Record<string, string>>({});
    const message = ref("");
    function refresh() {
        if (busy.value) return;
        busy.value = true;
        router.reload({
            onSuccess: () => {
                stale.value = false;
            },
            onFinish: () => {
                busy.value = false;
            },
        });
    }
    function submit(
        command: {
            url: string;
            data: Record<string, string | number | null>;
        } | null,
    ) {
        if (!command || busy.value || stale.value) return;
        busy.value = true;
        errors.value = {};
        message.value = "";
        let conflict = false;
        const saved = onSubmitted(command);
        router.post(command.url, command.data, {
            preserveScroll: true,
            onSuccess: () => {
                saved();
                message.value = "Perubahan tersimpan di sistem.";
            },
            onError: (result) => {
                errors.value = result;
                conflict = !!result.conflict;
                stale.value = conflict;
            },
            onNetworkError: () => {
                stale.value = true;
                errors.value = {
                    form: "Hasil penyimpanan belum dapat dipastikan karena jaringan terputus. Muat status terbaru sebelum mencoba lagi.",
                };
                return false;
            },
            onFinish: () => {
                busy.value = false;
                if (conflict) refresh();
            },
        });
    }
    return { busy, stale, errors, message, submit, refresh };
}
