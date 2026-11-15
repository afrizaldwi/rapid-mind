import { reactive } from "vue";
import { resolveRelawanContinuity } from "./relawanContinuity";
import { probeRelawanSession } from "./sessionProbe";
import { captureClinicalAccess, assertClinicalAccess } from "./clinicalAccessFence";
import { installCsrfToken } from "./csrfToken";

export type RelawanRecoveryState = "IDLE" | "CHECKING" | "READY" | "SERVER_UNAVAILABLE" |
    "REAUTHENTICATION_REQUIRED" | "WRONG_IDENTITY" | "ACCOUNT_INACTIVE" | "SERVER_REJECTED";
export const relawanSessionRecovery = reactive<{ state: RelawanRecoveryState }>({ state: "IDLE" });
const probes = new Map<number, Promise<boolean>>();

export function recoverRelawanSession(owner: number): Promise<boolean> {
    const existing = probes.get(owner);
    if (existing) return existing;
    const operation = (async () => {
        if (!navigator.onLine) { relawanSessionRecovery.state = "SERVER_UNAVAILABLE"; return false; }
        const access = captureClinicalAccess();
        const eligible = async () => {
            const current = await resolveRelawanContinuity();
            assertClinicalAccess(access);
            return current.state === "ELIGIBLE" && current.context.owner_user_id === owner;
        };
        if (!await eligible()) { relawanSessionRecovery.state = "IDLE"; return false; }
        relawanSessionRecovery.state = "CHECKING";
        const { response, payload } = await probeRelawanSession();
        if (!await eligible()) { relawanSessionRecovery.state = "IDLE"; return false; }
        if (response.status >= 500) { relawanSessionRecovery.state = "SERVER_UNAVAILABLE"; return false; }
        if (response.ok && payload.state === "AUTHENTICATED" && payload.user?.role === "RELAWAN") {
            if (Number(payload.user.id) !== owner) { relawanSessionRecovery.state = "WRONG_IDENTITY"; return false; }
            if (!installCsrfToken(payload.csrf_token)) { relawanSessionRecovery.state = "SERVER_REJECTED"; return false; }
            relawanSessionRecovery.state = "READY";
            return true;
        }
        relawanSessionRecovery.state = response.status === 401 || payload.state === "REAUTHENTICATION_REQUIRED"
            ? "REAUTHENTICATION_REQUIRED" : payload.state === "ACCOUNT_INACTIVE"
            ? "ACCOUNT_INACTIVE" : payload.state === "WRONG_ROLE" ? "WRONG_IDENTITY" : "SERVER_REJECTED";
        return false;
    })().catch(() => { relawanSessionRecovery.state = "SERVER_UNAVAILABLE"; return false; });
    probes.set(owner, operation);
    void operation.finally(() => { if (probes.get(owner) === operation) probes.delete(owner); });
    return operation;
}

export function startRelawanSessionRecovery(owner: number, ready: () => void = () => {}): () => void {
    let active = true;
    const check = () => { void recoverRelawanSession(owner).then(ok => { if (active && ok) ready(); }); };
    const visible = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", visible);
    const interval = window.setInterval(visible, 15_000);
    check();
    return () => {
        active = false;
        window.clearInterval(interval);
        window.removeEventListener("online", check);
        document.removeEventListener("visibilitychange", visible);
    };
}

export function openRelawanLogin(): void {
    window.location.assign("/login?reauth=1");
}
