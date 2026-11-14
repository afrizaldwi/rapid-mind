import { nextTick, shallowRef, watch, type WatchStopHandle } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { resolveOfflineRoute, type OfflineRouteResult } from "./offlineRoutes";
import { offlineRelawanUrl } from "./offlineLink";
import type { RelawanRuntime } from "./runtime";
import { resolveRelawanContinuity } from "@/offline/relawanContinuity";
import {
    assertClinicalAccess,
    captureClinicalAccess,
} from "@/offline/clinicalAccessFence";
import {
    assertStorageMode,
    clinicalKeyReady,
    clinicalKeyVersion,
    encryptedMode,
    lockAllClinicalKeys,
} from "@/offline/encryptedClinicalStorage";
import {
    readUnlockedRelawan,
    type OfflineOwnerProfile,
} from "@/offline/offlineOwnerProfile";
import { syntheticLegacyFixture } from "@/offline/clinicalStorageInitialization";

type ResolvedPage = Exclude<OfflineRouteResult, { unavailable: string }>;
const generalRoute = (pathname: string) => /^\/relawan\/(home|pfa|assessment|data)\/?$/.test(pathname);
type View =
    | { status: "LOADING" | "LOCKED" | "DENIED" | "UNAVAILABLE" }
    | { status: "READY"; page: ResolvedPage; revision: number };

// The view and decrypted props live only in this document. History carries URLs,
// never page props, identity profiles, passphrases or unlocked-session material.
export function createOfflineNavigation(owner: number, mask: () => void) {
    const view = shallowRef<View>({ status: "LOADING" });
    const path = shallowRef(window.location.pathname + window.location.search);
    const profile = shallowRef<OfflineOwnerProfile>();
    let sequence = 0;
    let stopped = false;
    let requestedUrl = "";
    let installedUrl = "";
    let stopKeyWatch: WatchStopHandle | undefined;
    let continuitySubscription: Subscription | undefined;

    function clear(status: Exclude<View["status"], "READY">) {
        mask(); // Synchronous masking precedes Vue's scheduled unmount.
        view.value = { status };
        profile.value = undefined;
        installedUrl = "";
    }
    function deny() {
        ++sequence;
        if (clinicalKeyReady(owner)) lockAllClinicalKeys();
        clear("DENIED");
    }
    async function verifyOwner() {
        const continuity = await resolveRelawanContinuity();
        if (
            continuity.state !== "ELIGIBLE" ||
            continuity.context.owner_user_id !== owner
        ) {
            deny();
            throw new Error("Konteks Relawan berubah.");
        }
    }
    async function authorize() {
        await verifyOwner();
        const encrypted = await encryptedMode(owner);
        await assertStorageMode(owner, encrypted ? "ENCRYPTED" : "LEGACY");
        return encrypted;
    }
    function focusDestination(url: URL) {
        if (/^#srq-question-(?:[1-9]|1[0-9]|20)$/.test(url.hash)) {
            const question = document.getElementById(url.hash.slice(1));
            question?.scrollIntoView();
            question?.focus();
        } else if (!url.hash) window.scrollTo(0, 0);
    }
    async function navigate(href: string, push = true, preservePage = false) {
        if (stopped) return;
        const url = offlineRelawanUrl(href, window.location.href);
        if (!url) {
            window.location.assign(href);
            return;
        }
        requestedUrl = url.href;
        const request = ++sequence;
        const version = clinicalKeyVersion();
        const pageUrl = url.pathname + url.search;
        const reusePage =
            view.value.status === "READY" && installedUrl === pageUrl;
        if (!reusePage) clear("LOADING");
        const current = () =>
            !stopped &&
            request === sequence &&
            version === clinicalKeyVersion();
        try {
            const general = generalRoute(url.pathname);
            const locked = !clinicalKeyReady(owner) && !syntheticLegacyFixture();
            if (locked && !general) {
                await verifyOwner();
                if (!current()) return;
                if (push && url.href !== window.location.href)
                    window.history.pushState(null, "", url.pathname + url.search + url.hash);
                path.value = pageUrl;
                clear("LOCKED");
                return;
            }
            const ticket = locked ? null : captureClinicalAccess();
            const encrypted = locked ? await verifyOwner() : await authorize();
            if (!current()) return;
            if (ticket) assertClinicalAccess(ticket);
            const page =
                reusePage && view.value.status === "READY"
                    ? view.value.page
                    : await resolveOfflineRoute(owner, url.pathname);
            const ownerProfile = locked || syntheticLegacyFixture()
                ? undefined
                : await readUnlockedRelawan(owner);
            if (!current()) return;
            if (locked) await verifyOwner();
            else if ((await authorize()) !== encrypted) return;
            if (!current()) return;
            if (ticket) assertClinicalAccess(ticket);
            if (push && url.href !== window.location.href)
                window.history.pushState(
                    null,
                    "",
                    url.pathname + url.search + url.hash,
                );
            path.value = pageUrl;
            if ("unavailable" in page) {
                clear("UNAVAILABLE");
                return;
            }
            profile.value = ownerProfile;
            installedUrl = pageUrl;
            if (!reusePage)
                view.value = { status: "READY", page, revision: request };
            await nextTick();
            if (current() && !preservePage) focusDestination(url);
        } catch {
            if (!current()) return;
            clear(clinicalKeyReady(owner) ? "UNAVAILABLE" : "LOCKED");
            // Storage/authorization failure must not retain a usable session.
            if (clinicalKeyReady(owner)) lockAllClinicalKeys();
        }
    }
    const runtime: RelawanRuntime = {
        mode: "OFFLINE_FIELD_MODE",
        owner,
        get name() {
            return profile.value?.name ?? "Relawan";
        },
        get shelterId() {
            return profile.value?.shelterId ?? null;
        },
        get shelterName() {
            return profile.value?.shelterName ?? null;
        },
        get path() {
            return path.value;
        },
        get pageProps() {
            return view.value.status === "READY" ? view.value.page.props : {};
        },
        navigate(href) {
            void navigate(href);
        },
        reload() {},
    };
    function onHistory() {
        // Back/Forward can emit both popstate and hashchange for one entry.
        if (requestedUrl !== window.location.href)
            void navigate(window.location.href, false);
    }
    async function start() {
        let wasUnlocked = clinicalKeyReady(owner);
        stopKeyWatch = watch(
            clinicalKeyVersion,
            () => {
                ++sequence;
                const url = new URL(window.location.href);
                const unlocked = clinicalKeyReady(owner);
                const generalPageOpen = view.value.status === "READY" && generalRoute(url.pathname);
                const firstUnlock = unlocked && !wasUnlocked;
                wasUnlocked = unlocked;
                if (firstUnlock && generalPageOpen) {
                    void navigate(url.href, false, true);
                    return;
                }
                clear("LOCKED");
                if (unlocked || generalPageOpen)
                    void navigate(window.location.href, false);
            },
            { flush: "sync" },
        );
        continuitySubscription = liveQuery(resolveRelawanContinuity).subscribe({
            next(result) {
                if (
                    result.state !== "ELIGIBLE" ||
                    result.context.owner_user_id !== owner
                )
                    deny();
            },
            error: deny,
        });
        window.addEventListener("popstate", onHistory);
        window.addEventListener("hashchange", onHistory);
        await navigate(window.location.href, false);
    }
    function stop() {
        stopped = true;
        ++sequence;
        clear("DENIED");
        stopKeyWatch?.();
        continuitySubscription?.unsubscribe();
        window.removeEventListener("popstate", onHistory);
        window.removeEventListener("hashchange", onHistory);
    }
    return { runtime, view, start, stop };
}
