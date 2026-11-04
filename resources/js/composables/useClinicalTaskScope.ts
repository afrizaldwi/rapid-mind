import { onUnmounted, watch } from "vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import { clinicalKeyVersion } from "@/offline/encryptedClinicalStorage";
import { createClinicalTaskScope } from "@/lib/clinicalTaskScope";

export function useClinicalTaskScope(onInvalidate: () => void) {
    const runtime = useRelawanRuntime();
    const identity = () => {
        try {
            return `${runtime.owner}:${runtime.path}:${clinicalKeyVersion()}`;
        } catch {
            return "unavailable";
        }
    };
    const scope = createClinicalTaskScope(identity);
    function invalidate() {
        scope.invalidate();
        onInvalidate();
    }
    watch(identity, invalidate, { flush: "sync" });
    onUnmounted(() => {
        scope.dispose();
        onInvalidate();
    });
    return { capture: scope.capture, invalidate };
}
