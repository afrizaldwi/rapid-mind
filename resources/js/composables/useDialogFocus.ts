import { nextTick, onUnmounted, watch, type Ref } from "vue";

export function useDialogFocus(
    element: Ref<HTMLElement | null>,
    show: () => boolean,
    close: () => void,
) {
    let previous: HTMLElement | null = null;
    watch(
        show,
        async (visible) => {
            if (!visible) {
                // Mask synchronously, including before Vue removes the dialog DOM.
                if (element.value) element.value.style.display = "none";
                if (previous?.isConnected && previous.getClientRects().length)
                    previous.focus();
                return;
            }
            previous = document.activeElement as HTMLElement | null;
            await nextTick();
            if (show() && element.value) {
                element.value.style.display = "";
                element.value.focus();
            }
        },
        { flush: "sync", immediate: true },
    );
    function keydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        }
        if (event.key !== "Tab" || !element.value) return;
        const controls = [
            ...element.value.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]",
            ),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
            event.preventDefault();
            return;
        }
        if (
            event.shiftKey &&
            (document.activeElement === first ||
                document.activeElement === element.value)
        ) {
            event.preventDefault();
            last?.focus();
        } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
                document.activeElement === element.value)
        ) {
            event.preventDefault();
            first.focus();
        }
    }
    onUnmounted(() => {
        if (element.value) element.value.style.display = "none";
    });
    return { keydown };
}
