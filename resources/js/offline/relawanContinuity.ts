import { db, requireOwner, initializeClinicalDatabase, prepareClinicalDatabaseForLogin, type RelawanContinuity } from "./db";
import { lockAllClinicalKeys } from "./encryptedClinicalStorage";
import { localLogoutPending, recordLocalLogoutIntent, clearLocalLogoutIntent } from "./localLogoutIntent";

export interface VerifiedRelawan {
    id: number;
    role: string;
    name: string;
    shelter_id?: number | null;
    shelter?: { name?: string } | null;
}

export type ContinuityResult =
    | { state: "ELIGIBLE"; context: RelawanContinuity }
    | {
          state:
              | "NO_VERIFIED_RELAWAN"
              | "LOGGED_OUT_LOCALLY"
              | "INVALID_CONTEXT"
              | "STORAGE_UNAVAILABLE";
      };

function valid(user: VerifiedRelawan): boolean {
    return (
        user.role === "RELAWAN" &&
        Number.isInteger(user.id) &&
        user.id > 0 &&
        typeof user.name === "string" &&
        user.name.trim().length > 0
    );
}

export async function recordVerifiedRelawan(
    user: VerifiedRelawan,
    explicitLogin = false,
): Promise<boolean> {
    if (!valid(user)) return false;
    if (!explicitLogin && localLogoutPending()) return false;
    await initializeClinicalDatabase();
    const previous = await db.relawanContinuity.get("active");
    if (!explicitLogin && previous?.logout_pending) return false;
    await prepareClinicalDatabaseForLogin(user.id);
    const recorded = await db.transaction("rw", db.relawanContinuity, async () => {
        const existing = await db.relawanContinuity.get("active");
        if (existing?.logout_pending && !explicitLogin) return false;
        if (existing && existing.owner_user_id !== user.id) lockAllClinicalKeys();
        const context: RelawanContinuity = {
            key: "active",
            owner_user_id: requireOwner(user.id),
            role: "RELAWAN",
            display_name: "Relawan",
            shelter_id: null,
            shelter_name: null,
            verified_at: new Date().toISOString(),
            logout_pending: false,
            schema_version: 2,
        };
        await db.relawanContinuity.put(context);
        return true;
    });
    if (recorded && explicitLogin) clearLocalLogoutIntent();
    return recorded;
}

export async function lockRelawanContinuity(
    user?: VerifiedRelawan,
): Promise<void> {
    try { recordLocalLogoutIntent(); } finally { lockAllClinicalKeys(); }
    await initializeClinicalDatabase();
    await db.transaction("rw", db.relawanContinuity, async () => {
        const existing = await db.relawanContinuity.get("active");
        if (existing) {
            await db.relawanContinuity.put({
                ...existing,
                logout_pending: true,
            });
        } else if (user && valid(user)) {
            await db.relawanContinuity.put({
                key: "active",
                owner_user_id: user.id,
                role: "RELAWAN",
                display_name: "Relawan",
                shelter_id: null,
                shelter_name: null,
                verified_at: new Date().toISOString(),
                logout_pending: true,
                schema_version: 2,
            });
        }
    });
}

export async function resolveRelawanContinuity(): Promise<ContinuityResult> {
    try {
        if (localLogoutPending()) return { state: "LOGGED_OUT_LOCALLY" };
        await initializeClinicalDatabase();
        const context = await db.relawanContinuity.get("active");
        if (!context) return { state: "NO_VERIFIED_RELAWAN" };
        if (context.logout_pending) return { state: "LOGGED_OUT_LOCALLY" };
        if (
            ![1, 2].includes(context.schema_version) ||
            context.role !== "RELAWAN" ||
            !Number.isInteger(context.owner_user_id) ||
            context.owner_user_id <= 0 ||
            !context.display_name?.trim() ||
            !Number.isFinite(Date.parse(context.verified_at))
        ) {
            return { state: "INVALID_CONTEXT" };
        }
        return { state: "ELIGIBLE", context };
    } catch {
        return { state: "STORAGE_UNAVAILABLE" };
    }
}
