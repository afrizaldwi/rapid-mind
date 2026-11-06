import { reactive } from "vue";
import { resolveRelawanContinuity } from "./relawanContinuity";
import { probeRelawanSession } from "./sessionProbe";

export type RelawanRecoveryState =
    | "IDLE"
    | "CHECKING"
    | "SERVER_UNAVAILABLE"
    | "REAUTHENTICATION_REQUIRED"
    | "WRONG_IDENTITY"
    | "ACCOUNT_INACTIVE"
    | "SERVER_REJECTED"
    | "RESTORING_ONLINE_RUNTIME";

export const relawanSessionRecovery = reactive<{
    state: RelawanRecoveryState;
}>({ state: "IDLE" });

let activeOwner: number | null = null;
let probe: Promise<void> | null = null;

async function checkServerSession(): Promise<void> {
    const owner = activeOwner;
    if (!owner || probe) return probe ?? Promise.resolve();

    probe = (async () => {
        const continuity = await resolveRelawanContinuity();
        if (
            continuity.state !== "ELIGIBLE" ||
            continuity.context.owner_user_id !== owner
        ) {
            relawanSessionRecovery.state = "IDLE";
            return;
        }

        relawanSessionRecovery.state = "CHECKING";
        const { response, payload } = await probeRelawanSession();
        const current = await resolveRelawanContinuity();
        if (current.state !== "ELIGIBLE" || current.context.owner_user_id !== owner) {
            relawanSessionRecovery.state = "IDLE";
            return;
        }

        if (response.status >= 500) {
            relawanSessionRecovery.state = "SERVER_UNAVAILABLE";
            return;
        }

        if (
            response.ok &&
            payload.state === "AUTHENTICATED" &&
            payload.user?.role === "RELAWAN" &&
            Number(payload.user.id) === owner
        ) {
            relawanSessionRecovery.state = "RESTORING_ONLINE_RUNTIME";
            window.location.assign("/relawan/data");
            return;
        }
        if (
            response.ok &&
            payload.state === "AUTHENTICATED" &&
            payload.user?.role === "RELAWAN"
        ) {
            relawanSessionRecovery.state = "WRONG_IDENTITY";
            return;
        }
        if (
            response.status === 401 ||
            payload.state === "REAUTHENTICATION_REQUIRED"
        ) {
            relawanSessionRecovery.state = "REAUTHENTICATION_REQUIRED";
            return;
        }
        if (payload.state === "ACCOUNT_INACTIVE") {
            relawanSessionRecovery.state = "ACCOUNT_INACTIVE";
            return;
        }
        if (payload.state === "WRONG_ROLE") {
            relawanSessionRecovery.state = "WRONG_IDENTITY";
            return;
        }
        relawanSessionRecovery.state = "SERVER_REJECTED";
    })()
        .catch(() => {
            relawanSessionRecovery.state = "SERVER_UNAVAILABLE";
        })
        .finally(() => {
            probe = null;
        });

    return probe;
}

function onVisible(): void {
    if (document.visibilityState === "visible") void checkServerSession();
}

export function startRelawanSessionRecovery(owner: number): void {
    if (activeOwner !== null) return;
    activeOwner = owner;
    window.addEventListener("online", checkServerSession);
    document.addEventListener("visibilitychange", onVisible);
    window.setInterval(() => void checkServerSession(), 15_000);
    void checkServerSession();
}

export function openRelawanLogin(): void {
    window.location.assign("/login?reauth=1");
}
