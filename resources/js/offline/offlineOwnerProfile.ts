import { encryptedGet, encryptedMutate } from "./encryptedClinicalStorage";
import type { VerifiedRelawan } from "./relawanContinuity";

export type OfflineOwnerProfile = {
    name: string;
    shelterId: number | null;
    shelterName: string | null;
};
export function rememberUnlockedRelawan(user: VerifiedRelawan): Promise<void> {
    return encryptedMutate<OfflineOwnerProfile>(
        user.id,
        "ownerProfiles",
        String(user.id),
        () => ({
            name: user.name,
            shelterId: user.shelter_id ?? null,
            shelterName: user.shelter?.name ?? null,
        }),
    );
}
export function readUnlockedRelawan(
    owner: number,
): Promise<OfflineOwnerProfile | undefined> {
    return encryptedGet(owner, "ownerProfiles", String(owner));
}
