import { createApp, h } from "vue";
import OfflineEncryptionGate from "../../resources/js/components/Relawan/OfflineEncryptionGate.vue";

export function mountOfflineGate(owner: number): void {
    const host = document.createElement("div");
    document.body.replaceChildren(host);
    createApp({
        render: () =>
            h(OfflineEncryptionGate, {
                owner,
                onUnlocked: () => host.setAttribute("data-unlocked", "true"),
            }),
    }).mount(host);
}
