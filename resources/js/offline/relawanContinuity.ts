import { db, requireOwner, type RelawanContinuity } from "./db";

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
    return await db.transaction("rw", db.relawanContinuity, async () => {
        const existing = await db.relawanContinuity.get("active");
        if (existing?.logout_pending && !explicitLogin) return false;
        const context: RelawanContinuity = {
            key: "active",
            owner_user_id: requireOwner(user.id),
            role: "RELAWAN",
            display_name: user.name.trim(),
            shelter_id:
                Number.isInteger(user.shelter_id) && (user.shelter_id ?? 0) > 0
                    ? user.shelter_id!
                    : null,
            shelter_name:
                typeof user.shelter?.name === "string"
                    ? user.shelter.name
                    : null,
            verified_at: new Date().toISOString(),
            logout_pending: false,
            schema_version: 1,
        };
        await db.relawanContinuity.put(context);
        return true;
    });
}

export async function lockRelawanContinuity(
    user?: VerifiedRelawan,
): Promise<void> {
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
                display_name: user.name.trim(),
                shelter_id: user.shelter_id ?? null,
                shelter_name: user.shelter?.name ?? null,
                verified_at: new Date().toISOString(),
                logout_pending: true,
                schema_version: 1,
            });
        }
    });
}

export async function resolveRelawanContinuity(): Promise<ContinuityResult> {
    try {
        const context = await db.relawanContinuity.get("active");
        if (!context) return { state: "NO_VERIFIED_RELAWAN" };
        if (context.logout_pending) return { state: "LOGGED_OUT_LOCALLY" };
        if (
            context.schema_version !== 1 ||
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
