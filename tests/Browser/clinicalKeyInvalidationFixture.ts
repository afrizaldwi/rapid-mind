import { createApp, h } from "vue";
import RelawanLayout from "../../resources/js/layouts/RelawanLayout.vue";
import { relawanRuntimeKey } from "../../resources/js/relawan/runtime";
import { recordVerifiedRelawan } from "../../resources/js/offline/relawanContinuity";

// Called only by the isolated acceptance runner on a fresh browser origin.
export async function mountClinicalKeyInvalidationFixture(): Promise<void> {
    await recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Relawan Sintetis" }, true);
    const host = document.createElement("div");
    document.body.replaceChildren(host);
    const app = createApp({
        render: () => h(RelawanLayout, {}, {
            default: () => h("p", { "data-clinical-fixture": "true" }, "Konten klinis sintetis"),
        }),
    });
    app.provide(relawanRuntimeKey, {
        mode: "OFFLINE_FIELD_MODE", owner: 101, name: "Relawan Sintetis",
        shelterId: null, shelterName: null, path: "/relawan/home", pageProps: {},
        navigate() {}, reload() {},
    });
    app.mount(host);
}
