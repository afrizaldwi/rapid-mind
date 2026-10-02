import { inject, type InjectionKey } from "vue";
import { router, usePage } from "@inertiajs/vue3";
import { requireOwner } from "@/offline/db";

export type RelawanRuntime = {
    mode: "ONLINE_SERVER" | "OFFLINE_FIELD_MODE";
    readonly owner: number;
    readonly name: string;
    readonly shelterId: number | null;
    readonly shelterName: string | null;
    readonly path: string;
    readonly pageProps: Record<string, unknown>;
    navigate: (path: string) => void;
    reload: (only: string[]) => void;
};
export const relawanRuntimeKey: InjectionKey<RelawanRuntime> =
    Symbol("relawan-runtime");

export function useRelawanRuntime(): RelawanRuntime {
    const local = inject(relawanRuntimeKey, null);
    if (local) return local;
    const page = usePage();
    const user = () =>
        (
            page.props.auth as
                | {
                      user?: {
                          id?: number;
                          role?: string;
                          name?: string;
                          shelter_id?: number | null;
                          shelter?: { name?: string } | null;
                      };
                  }
                | undefined
        )?.user;
    return {
        mode: "ONLINE_SERVER",
        get owner() {
            return requireOwner(
                user()?.role === "RELAWAN" ? Number(user()?.id) : NaN,
            );
        },
        get name() {
            return user()?.name || "Relawan";
        },
        get shelterId() {
            return user()?.shelter_id ?? null;
        },
        get shelterName() {
            return user()?.shelter?.name ?? null;
        },
        get path() {
            return page.url;
        },
        get pageProps() {
            return page.props as Record<string, unknown>;
        },
        navigate(path) {
            router.visit(path);
        },
        reload(only) {
            router.reload({ only });
        },
    };
}
