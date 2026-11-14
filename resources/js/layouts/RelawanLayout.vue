<template>
    <OfflineReadinessNotice v-if="loggedOutLocally || checkingContinuity" />
    <div
        v-if="loggedOutLocally || checkingContinuity"
        class="min-h-screen bg-slate-100 p-6 text-slate-900"
    >
        <div class="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow">
            <h1 class="text-lg font-bold">
                {{
                    checkingContinuity
                        ? (isEn ? "Checking device access…" : "Memeriksa akses perangkat…")
                        : (isEn ? "Local access locked" : "Akses lokal dikunci")
                }}
            </h1>
            <p v-if="!checkingContinuity" class="mt-3">
                {{
                    isEn
                        ? "Data remains stored on device. Sign in again to access it."
                        : "Data di perangkat tetap tersimpan. Masuk kembali untuk mengaksesnya."
                }}
            </p>
            <p v-if="logoutError" class="mt-3 text-sm text-amber-800">
                {{ logoutError }}
            </p>
            <button
                v-if="!checkingContinuity && runtime.mode === 'ONLINE_SERVER'"
                type="button"
                class="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-white"
                @click="retryServerLogout"
            >
                {{ isEn ? "Complete sign out" : "Selesaikan keluar" }}
            </button>
        </div>
    </div>
    <div
        v-else-if="currentOwner"
        class="rm-app h-dvh overflow-hidden bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-teal-500 selection:text-white"
    >
        <a href="#relawan-main" class="rm-skip-link">Langsung ke konten utama</a>
        <OfflineReadinessNotice />
        <!-- Top Application Bar -->
        <header
            class="relawan-app-header shrink-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2"
            :class="{ 'relawan-identity-header': !!$slots.greeting }"
        >
            <div class="flex min-w-0 basis-full sm:basis-auto sm:flex-1 items-center space-x-2 sm:space-x-3">
                <img
                    src="/logo.png?v=3"
                    alt="RAPID-MIND Logo"
                    class="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                />
                <div class="min-w-0">
                    <p
                        class="break-words text-xs sm:text-sm text-slate-700 font-semibold leading-tight"
                    >
                        {{ $slots.greeting ? shelterIdentity.name : user?.shelter?.name || (isEn ? "Volunteer Shelter" : "Posko Relawan") }}
                    </p>
                    <p v-if="$slots.greeting && shelterIdentity.location" class="mt-0.5 text-xs text-slate-600 break-words">{{ shelterIdentity.location }}</p>
                </div>
            </div>

            <div class="relawan-header-controls flex w-full sm:w-auto sm:max-w-[65%] items-center gap-2">
                <LanguageSwitcher compact />
                <StatusIndicator
                    v-if="!$slots.greeting"
                    class="relawan-header-status"
                    :kind="status.kind.value"
                    :label="compactStatusLabel"
                    @open="showStatusSheet = true"
                />
                <button
                    type="button"
                    @click="logout"
                    :title="isEn ? 'Volunteer Logout' : 'Logout Relawan'"
                    :aria-label="isEn ? 'Volunteer Logout' : 'Logout Relawan'"
                    class="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                    <LogOut class="w-4 h-4" />
                </button>
            </div>
        </header>

        <!-- Main Content Area -->
        <main
            id="relawan-main" tabindex="-1" class="rm-field-content flex-1 min-h-0"
            :class="[hasAssessmentActionBar ? 'flex flex-col overflow-hidden' : 'rm-field-scroll overflow-y-auto px-3.5 py-4 sm:px-6 sm:pt-6', { 'relawan-identity-main': !!$slots.greeting }]"
        >
            <slot name="greeting" :status-kind="status.kind.value" :status-label="compactStatusLabel" :open-status="() => showStatusSheet = true" />
            <p v-if="requiresClinicalKey && ownerStorageMode === 'CHECKING'" role="status">Memeriksa akses penyimpanan terenkripsi…</p>
            <LockedEmergencyGuidance v-if="!clinicalViewAvailable && !requiresClinicalKey" />
            <OfflineEncryptionGate v-if="requiresClinicalKey && !clinicalViewAvailable && ownerStorageMode !== 'CHECKING'" :key="encryptionGateKey" :owner="currentOwner!" @unlocked="onClinicalUnlocked" />
            <p v-if="onlineAssessmentAvailable" role="status" class="m-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{{ isEn ? 'Online assessment. Partial answers awaiting server save remain on this page. If the connection fails, stay here and retry.' : 'Asesmen online. Jawaban parsial yang belum tersimpan di server tetap berada di halaman ini. Jika koneksi terputus, tetap di halaman ini dan coba simpan kembali.' }}</p>
            <p
                v-if="logoutError"
                role="alert"
                class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                :class="hasAssessmentActionBar ? 'mx-3.5 mt-3 sm:mx-6 shrink-0' : 'mb-4'"
            >
                {{ logoutError }}
            </p>
            <div v-if="!requiresClinicalKey || clinicalViewAvailable" ref="clinicalViewRoot" :key="clinicalViewKey" :class="hasAssessmentActionBar ? 'flex min-h-0 flex-1 flex-col' : ''">
            <section
                v-if="recoveryMessage"
                role="status"
                class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
                :class="hasAssessmentActionBar ? 'mx-3.5 mt-3 sm:mx-6 shrink-0' : 'mb-4'"
            >
                <p class="font-bold">{{ recoveryMessage.title }}</p>
                <p class="mt-1">{{ recoveryMessage.detail }}</p>
                <button
                    v-if="recoveryMessage.login"
                    type="button"
                    class="mt-3 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
                    @click="openRelawanLogin"
                >
                    {{ isEn ? "Sign in again" : "Masuk kembali" }}
                </button>
            </section>
            <LocalEmergencyActive
                v-if="
                    runtime.mode === 'ONLINE_SERVER' &&
                    activeLocalId &&
                    currentOwner &&
                    !isDataRoute
                "
                :key="String(currentOwner) + activeLocalId"
                :owner="currentOwner"
                :id="activeLocalId"
                @close="activeLocalId = null"
            />
            <slot v-else />
            </div>
        </main>

        <!-- Persistent Floating Red Flag Button -->
        <T0Button
            :focused="isFocusedAssessment"
            :has-bottom-nav="!isFocusedAssessment"
            @trigger="openEmergencyModal"
        />

        <!-- T0 Verification Task Sheet Modal -->
        <T0Verification
            :show="showEmergencyModal"
            :patient-id="t0AssessmentContext?.patientId"
            :patient-name="t0AssessmentContext?.patientName"
            :assessment-id="t0AssessmentContext?.assessmentId"
            @close="showEmergencyModal = false"
        />

        <RelawanStatusDataSheet
            :show="showStatusSheet"
            :kind="status.kind.value"
            :label="status.label.value"
            :ready="status.ready.value"
            :online="status.online.value"
            :pending-count="status.pendingCount.value"
            :failed-count="status.failedCount.value"
            :unfinished-count="status.unfinishedCount.value"
            :unqueued-completed-count="status.unqueuedCompletedCount.value"
            :is-syncing="status.isSyncing.value"
            :can-retry="status.canRetry.value"
            :action-error="status.actionError.value"
            @close="showStatusSheet = false"
            @retry="status.retry"
        />

        <!-- Bottom Navigation Bar (4 items) -->
        <nav
            v-if="!isFocusedAssessment"
            class="rm-field-content shrink-0 z-30 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
        >
            <div class="grid grid-cols-4 h-16">
                <RelawanLink
                    href="/relawan/home"
                    class="flex flex-col items-center justify-center text-xs font-semibold transition"
                    :class="
                        isRoute('/relawan/home')
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                    "
                >
                    <House class="mb-1 h-5 w-5" aria-hidden="true" />
                    <span>{{ $t('nav.home') }}</span>
                </RelawanLink>

                <RelawanLink
                    href="/relawan/pfa"
                    class="flex flex-col items-center justify-center text-xs font-semibold transition"
                    :class="
                        isRoute('/relawan/pfa')
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                    "
                >
                    <BookOpen class="mb-1 h-5 w-5" aria-hidden="true" />
                    <span>{{ $t('nav.pfa') }}</span>
                </RelawanLink>

                <RelawanLink
                    href="/relawan/assessment"
                    class="flex flex-col items-center justify-center text-xs font-semibold transition"
                    :class="
                        isRoute('/relawan/assessment')
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                    "
                >
                    <ClipboardList class="mb-1 h-5 w-5" aria-hidden="true" />
                    <span>{{ $t('nav.assessment') }}</span>
                </RelawanLink>

                <RelawanLink
                    href="/relawan/data"
                    class="flex flex-col items-center justify-center text-xs font-semibold transition relative"
                    :class="
                        isRoute('/relawan/data')
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                    "
                >
                    <FolderOpen class="mb-1 h-5 w-5" aria-hidden="true" />
                    <span>{{ $t('nav.data') }}</span>
                    <span
                        v-if="status.pendingCount.value > 0"
                        class="absolute top-2 right-6 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs"
                    >
                        {{ status.pendingCount.value }}
                    </span>
                </RelawanLink>
            </div>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import {
    BookOpen,
    ClipboardList,
    FolderOpen,
    House,
    LogOut,
} from "lucide-vue-next";
import { liveQuery, type Subscription } from "dexie";
import { router } from "@inertiajs/vue3";
import { useRelawanRuntime } from "@/relawan/runtime";
import RelawanLink from "@/relawan/RelawanLink.vue";
import StatusIndicator from "@/components/ui/StatusIndicator.vue";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher.vue";
import { useI18n } from "@/i18n";

const { isEn, t: $t } = useI18n();
import T0Button from "@/components/Relawan/T0Button.vue";
import T0Verification from "@/components/Relawan/T0Verification.vue";
import LocalEmergencyActive from "@/components/Relawan/LocalEmergencyActive.vue";
import { emergencyRepository } from "@/offline/emergencyRepository";
import { assessmentRepository } from "@/offline/assessmentRepository";
import { patientRepository } from "@/offline/patientRepository";
import RelawanStatusDataSheet from "@/components/Relawan/RelawanStatusDataSheet.vue";
import LockedEmergencyGuidance from "@/components/Relawan/LockedEmergencyGuidance.vue";
import OfflineEncryptionGate from "@/components/Relawan/OfflineEncryptionGate.vue";
import {
    clinicalKeyReady,
    clinicalKeyVersion,
    encryptedMode,
    lockAllClinicalKeys,
} from "@/offline/encryptedClinicalStorage";
import {
    inspectClinicalInitialization,
    syntheticLegacyFixture,
    type InitializationState,
} from "@/offline/clinicalStorageInitialization";
import { prepareLocalEnrollment } from "@/offline/localEnrollmentAuthorization";
import { rememberUnlockedRelawan } from "@/offline/offlineOwnerProfile";
import { isolatedEncryptionFixture } from "@/offline/offlineKeyWorkflow";
import { syncManager } from "@/offline/syncManager";
import { useRelawanOperationalStatus } from "@/composables/useRelawanOperationalStatus";
import {
    lockRelawanContinuity,
    recordVerifiedRelawan,
    resolveRelawanContinuity,
} from "@/offline/relawanContinuity";
import { registerRelawanServiceWorker } from "@/pwa/register";
import OfflineReadinessNotice from "@/components/Relawan/OfflineReadinessNotice.vue";
import {
    openRelawanLogin,
    relawanSessionRecovery,
} from "@/offline/sessionRecovery";

const layoutProps = defineProps<{ clinicalAccessRequested?: boolean; identityShelter?: string | null }>();
const emit = defineEmits<{
    "clinical-lock": [];
    "clinical-ready": [];
    "emergency-interrupt": [];
}>();
const runtime = useRelawanRuntime();
const user = computed(() => ({
    id: runtime.owner,
    role: "RELAWAN",
    name: runtime.name,
    shelter_id: runtime.shelterId,
    shelter: { name: runtime.shelterName ?? undefined },
}));
const currentOwner = computed(() =>
    !loggedOutLocally.value &&
    !checkingContinuity.value &&
    user.value?.role === "RELAWAN"
        ? Number(user.value.id) || null
        : null,
);
const clinicalViewRoot = ref<HTMLElement | null>(null);
type OwnerStorageState =
    | InitializationState
    | "CHECKING"
    | "LEGACY"
    | "ENCRYPTED";
const ownerStorageMode = ref<OwnerStorageState>("CHECKING");
let storageModeSubscription: Subscription | undefined;
// Recheck the gate when blocked storage recovers, without remounting a
// legitimate FRESH → ENROLLMENT_PENDING → confirmed enrollment.
const encryptionGateKey = computed(
    () =>
        `${currentOwner.value}:${[
            "INCONSISTENT",
            "INACCESSIBLE",
            "LEGACY_BLOCKED",
            "ACTIVATION_DISABLED",
        ].includes(ownerStorageMode.value)}`,
);
const clinicalUnlocked = computed(() =>
    currentOwner.value ? clinicalKeyReady(currentOwner.value) : false,
);
const clinicalViewKey = computed(
    () => onlineAssessmentAvailable.value || onlineAssessmentListAvailable.value
        ? `${currentOwner.value}:server:${runtime.path}`
        : `${currentOwner.value}:${clinicalKeyVersion()}`,
);
function maskClinicalView() {
    emit("clinical-lock");
    if (clinicalViewRoot.value) {
        clinicalViewRoot.value.style.display = "none";
        clinicalViewRoot.value.setAttribute("aria-hidden", "true");
    }
}
let storageModeCheck = 0;
const activeLocalId = ref<string | null>(null);
const showStatusSheet = ref(false);
const loggedOutLocally = ref(false);
const checkingContinuity = ref(runtime.mode === "ONLINE_SERVER");
const rawLogoutError = ref<{ id: string; en: string } | string>("");
const logoutError = computed(() =>
    typeof rawLogoutError.value === "string"
        ? rawLogoutError.value
        : isEn.value
          ? rawLogoutError.value.en
          : rawLogoutError.value.id,
);
let continuityCheck = 0;
let offlineContinuitySubscription: Subscription | undefined;
function refreshOwnerStorageMode(owner: number | null) {
    const check = ++storageModeCheck;
    storageModeSubscription?.unsubscribe();
    storageModeSubscription = undefined;
    ownerStorageMode.value = "CHECKING";
    if (!owner) return;
    const apply = (state: OwnerStorageState) => {
        if (check !== storageModeCheck || owner !== currentOwner.value) return;
        ownerStorageMode.value = state;
        const trusted =
            state === "ENCRYPTED_LOCKED" ||
            (syntheticLegacyFixture() &&
                (state === "ENCRYPTED" || state === "LEGACY"));
        // Only installed clinical keys are revoked. Fresh/pending enrollment
        // has no installed key, so repeated inspections cannot cancel it.
        if (!trusted && clinicalKeyReady(owner)) lockAllClinicalKeys();
    };
    if (syntheticLegacyFixture()) {
        void encryptedMode(owner)
            .then((encrypted) => apply(encrypted ? "ENCRYPTED" : "LEGACY"))
            .catch(() => apply("INACCESSIBLE"));
        return;
    }
    void prepareLocalEnrollment(owner).then(() => {
        if (check !== storageModeCheck || owner !== currentOwner.value) return;
        storageModeSubscription = liveQuery(() => inspectClinicalInitialization(owner)).subscribe({
            next: apply,
            error: () => apply("INACCESSIBLE"),
        });
    }).catch(() => apply("INACCESSIBLE"));
}
watch(currentOwner, refreshOwnerStorageMode, {
    immediate: true,
    flush: "sync",
});
const onlineAssessmentAvailable = computed(() => {
    const assessment = runtime.pageProps.assessment as { id?: string; user_id?: number; patient_id?: string } | undefined;
    const match = runtime.path.split(/[?#]/)[0].match(/^\/relawan\/assessment\/([^/]+)\/(identity|srq|risk|function|review|result)$/);
    return runtime.mode === "ONLINE_SERVER" && !!match && assessment?.id === match[1] &&
        assessment?.user_id === currentOwner.value && !!assessment?.patient_id;
});
const onlineAssessmentListAvailable = computed(() => runtime.mode === "ONLINE_SERVER" &&
    runtime.path.split(/[?#]/)[0] === "/relawan/assessment/drafts" && Array.isArray(runtime.pageProps.inProgressAssessments));
const requiresClinicalKey = computed(() => layoutProps.clinicalAccessRequested || (!onlineAssessmentAvailable.value && !onlineAssessmentListAvailable.value && !/^\/relawan\/(home|pfa|assessment)\/?$/.test(runtime.path.split(/[?#]/)[0]) && !(runtime.mode === "ONLINE_SERVER" && /^\/relawan\/emergencies\//.test(runtime.path) && !!runtime.pageProps.emergency)));
const clinicalViewAvailable = computed(
    () =>
        !!currentOwner.value &&
        (ownerStorageMode.value === "LEGACY" ||
            ((ownerStorageMode.value === "ENCRYPTED_LOCKED" ||
                ownerStorageMode.value === "ENCRYPTED") &&
                clinicalUnlocked.value)),
);
const status = useRelawanOperationalStatus(
    computed(() => (clinicalViewAvailable.value ? currentOwner.value : null)),
    computed(() => runtime.mode === "ONLINE_SERVER"),
);
watch(
    clinicalViewAvailable,
    (available) => {
        if (!available && requiresClinicalKey.value) maskClinicalView();
    },
    { flush: "sync" },
);
watch(
    [clinicalViewAvailable, clinicalViewKey],
    ([available]) => {
        if (available || !requiresClinicalKey.value) {
            clinicalViewRoot.value?.style.removeProperty("display");
            clinicalViewRoot.value?.removeAttribute("aria-hidden");
            if (available && !onlineAssessmentAvailable.value) emit("clinical-ready");
            if (available && !syntheticLegacyFixture() && runtime.mode === "ONLINE_SERVER")
                void rememberUnlockedRelawan(user.value).catch(() => {});
        }
    },
    { immediate: true, flush: "post" },
);

function onClinicalUnlocked() {
    status.refresh();
    if (runtime.mode === "ONLINE_SERVER" && currentOwner.value)
        void syncManager.sync(currentOwner.value).catch(() => {});
}
const shelterIdentity = computed(() => {
    const name = layoutProps.identityShelter || user.value?.shelter?.name || (isEn.value ? "Volunteer Shelter" : "Posko Relawan");
    const parts = name.match(/^(.*?)\s+(Kel\.\s+.+)$/);
    return { name: parts?.[1] || name, location: parts?.[2] || "" };
});

const compactStatusLabel = computed(() => {
    switch (status.kind.value) {
        case "local-failure":
            return isEn.value ? "Not saved" : "Belum tersimpan";
        case "unavailable":
            return isEn.value ? "Status unavailable" : "Status belum siap";
        case "recovering-session":
            return isEn.value ? "Recovering…" : "Memulihkan…";
        case "reauthentication-required":
            return isEn.value ? "Sign in required" : "Perlu masuk";
        case "syncing":
            return status.pendingCount.value > 0
                ? (isEn.value ? `Syncing ${status.pendingCount.value}` : `Sinkron ${status.pendingCount.value}`)
                : (isEn.value ? "Syncing…" : "Sinkron…");
        case "offline":
            if (status.pendingCount.value > 0) {
                return isEn.value
                    ? `Offline • ${status.pendingCount.value} pending`
                    : `Offline • ${status.pendingCount.value} tertunda`;
            }

            if (status.unfinishedCount.value > 0) {
                return isEn.value ? "Offline • saved" : "Offline • tersimpan";
            }

            return "Offline";
        case "failed":
            return isEn.value ? "Sync failed" : "Sinkron gagal";
        case "pending":
            return isEn.value ? `${status.pendingCount.value} pending` : `${status.pendingCount.value} tertunda`;
        case "unqueued":
            return isEn.value ? "Not ready" : "Belum siap";
        case "local-only":
            return isEn.value ? "Saved locally" : "Tersimpan lokal";
        case "synced":
            return isEn.value ? "Synced" : "Tersinkron";
        default:
            return "Status";
    }
});
const isDataRoute = computed(
    () => runtime.path.split("?")[0] === "/relawan/data",
);
const isFocusedAssessment = computed(
    () =>
        runtime.path.split("?")[0] !== "/relawan/assessment/drafts" &&
        /^\/relawan\/assessment\/[^/]+(?:\/|$)/.test(
            runtime.path.split("?")[0],
        ),
);
const hasAssessmentActionBar = computed(() =>
    /^\/relawan\/assessment\/[^/]+\/(srq|risk|function|review)\/?$/.test(
        runtime.path.split("?")[0],
    ),
);
const recoveryMessage = computed(() => {
    if (runtime.mode === "ONLINE_SERVER") {
        if (status.sessionState.value === "RECOVERING_SESSION")
            return {
                title: isEn.value ? "Recovering session…" : "Memulihkan sesi…",
                detail: isEn.value
                    ? "Data remains safe on device. Synchronization will continue after server context is restored."
                    : "Data tetap aman di perangkat. Sinkronisasi akan dilanjutkan setelah konteks server dipulihkan.",
                login: false,
            };
        if (status.sessionState.value === "REAUTHENTICATION_REQUIRED")
            return {
                title: isEn.value
                    ? "Sign in again to synchronize."
                    : "Perlu masuk kembali untuk sinkronisasi.",
                detail: isEn.value ? "Data remains safe on device." : "Data tetap aman di perangkat.",
                login: true,
            };
        return null;
    }
    switch (relawanSessionRecovery.state) {
        case "CHECKING":
            return {
                title: isEn.value ? "Recovering session…" : "Memulihkan sesi…",
                detail: isEn.value
                    ? "Checking server availability without transmitting local data."
                    : "Memeriksa ketersediaan server tanpa mengirim data lokal.",
                login: false,
            };
        case "RESTORING_ONLINE_RUNTIME":
            return {
                title: isEn.value ? "Recovering session…" : "Memulihkan sesi…",
                detail: isEn.value
                    ? "Reopening server application before starting synchronization."
                    : "Membuka kembali aplikasi server sebelum sinkronisasi dimulai.",
                login: false,
            };
        case "REAUTHENTICATION_REQUIRED":
            return {
                title: isEn.value
                    ? "Sign in again to synchronize."
                    : "Perlu masuk kembali untuk sinkronisasi.",
                detail: isEn.value ? "Data remains safe on device." : "Data tetap aman di perangkat.",
                login: true,
            };
        case "WRONG_IDENTITY":
            return {
                title: isEn.value ? "Server account mismatch." : "Akun server tidak sesuai.",
                detail: isEn.value
                    ? "This Volunteer's data remains safe and will not sync through another account. Sign out of the active server account and sign in with the correct one."
                    : "Data akun Relawan ini tetap aman dan tidak akan disinkronkan melalui akun lain. Keluar dari akun server yang aktif, lalu masuk dengan akun yang benar.",
                login: true,
            };
        case "ACCOUNT_INACTIVE":
            return {
                title: isEn.value ? "Synchronization not allowed." : "Sinkronisasi tidak diizinkan.",
                detail: isEn.value
                    ? "Account needs activation by Admin. Data remains safe on device."
                    : "Akun perlu diaktifkan oleh Admin. Data tetap aman di perangkat.",
                login: true,
            };
        case "SERVER_REJECTED":
            return {
                title: isEn.value
                    ? "Synchronization cannot continue yet."
                    : "Sinkronisasi belum dapat dilanjutkan.",
                detail: isEn.value
                    ? "Server rejected session recovery. Data remains safe on device."
                    : "Server menolak pemulihan sesi. Data tetap aman di perangkat.",
                login: true,
            };
        default:
            return null;
    }
});

const assessmentRoute = computed(() =>
    runtime.path
        .split("?")[0]
        .match(
            /^\/relawan\/assessment\/([^/]+)\/(?:identity|srq|risk|function|review|result)\/?$/,
        ),
);
const serverAssessmentContext = computed(() => {
    const route = assessmentRoute.value;
    const assessment = runtime.pageProps.assessment as
        | { id?: unknown; patient_id?: unknown; user_id?: unknown }
        | undefined;
    const patient = runtime.pageProps.patient as
        | { id?: unknown; name?: unknown }
        | undefined;

    if (
        !route ||
        assessment?.user_id !== currentOwner.value ||
        typeof assessment?.id !== "string" ||
        assessment.id !== route[1] ||
        typeof patient?.id !== "string" ||
        assessment.patient_id !== patient.id
    ) {
        return null;
    }

    return {
        assessmentId: assessment.id,
        patientId: patient.id,
        patientName:
            typeof patient.name === "string" ? patient.name : undefined,
    };
});

type T0AssessmentContext = NonNullable<typeof serverAssessmentContext.value>;
const t0AssessmentContext = ref<T0AssessmentContext | null>(null);
const showEmergencyModal = ref(false);
let emergencyOpenCheck = 0;
async function openEmergencyModal() {
    emit("emergency-interrupt");
    const check = ++emergencyOpenCheck;
    const keyVersion = clinicalKeyVersion();
    const path = runtime.path;
    const owner = currentOwner.value;
    t0AssessmentContext.value = null;
    if (!owner) return;

    const route = assessmentRoute.value;
    let context: T0AssessmentContext | null = null;
    if (route) {
        if (serverAssessmentContext.value) {
            context = serverAssessmentContext.value;
        } else if (clinicalViewAvailable.value) {
            try {
                const assessment = await assessmentRepository.get(
                    owner,
                    decodeURIComponent(route[1]),
                );
                const patient = assessment
                    ? await patientRepository.get(owner, assessment.patient_id)
                    : null;
                if (assessment && patient) {
                    context = {
                        assessmentId: assessment.id,
                        patientId: patient.id,
                        patientName: patient.name,
                    };
                }
            } catch {
                // Emergency access remains available if local context cannot be read.
            }
        }
    }
    if (
        check !== emergencyOpenCheck ||
        keyVersion !== clinicalKeyVersion() ||
        path !== runtime.path ||
        owner !== currentOwner.value
    ) {
        return;
    }
    t0AssessmentContext.value = context;
    showEmergencyModal.value = true;
}
watch([() => runtime.path, currentOwner], () => {
    ++emergencyOpenCheck;
    showEmergencyModal.value = false;
    t0AssessmentContext.value = null;
});
let emergencyKeyWasReady = clinicalKeyReady(currentOwner.value ?? 0);
watch(
    clinicalKeyVersion,
    () => {
        const keyReady = !!currentOwner.value && clinicalKeyReady(currentOwner.value);
        const unlocking = !emergencyKeyWasReady && keyReady;
        emergencyKeyWasReady = keyReady;
        // Hide synchronously; Vue then unmounts the old view on its next render.
        if (requiresClinicalKey.value) maskClinicalView();
        refreshOwnerStorageMode(currentOwner.value);
        ++emergencyOpenCheck;
        if (!unlocking) {
            showEmergencyModal.value = false;
            t0AssessmentContext.value = null;
        }
        activeLocalId.value = null;
        showStatusSheet.value = false;
    },
    { flush: "sync" },
);
watch(
    currentOwner,
    (owner, prior) => {
        if (prior && owner !== prior) {
            maskClinicalView();
            lockAllClinicalKeys();
        }
    },
    { flush: "sync" },
);
function isRoute(path: string) {
    return runtime.path.startsWith(path);
}

function retryServerLogout() {
    if (!navigator.onLine) {
        rawLogoutError.value = {
            id: "Hubungkan perangkat untuk menyelesaikan logout server.",
            en: "Connect device to complete server sign-out.",
        };
        return;
    }
    const failed = () => {
        rawLogoutError.value = {
            id: "Logout server belum berhasil. Akses lokal tetap dikunci.",
            en: "Server sign-out did not succeed. Local access remains locked.",
        };
        return false;
    };
    router.post(
        "/logout",
        {},
        {
            onError: failed,
            onNetworkError: failed,
            onHttpException: failed,
        },
    );
}

async function logout() {
    const check = ++continuityCheck;
    checkingContinuity.value = true;
    try {
        await lockRelawanContinuity(user.value);
    } catch {
        if (check === continuityCheck) {
            checkingContinuity.value = false;
            rawLogoutError.value = {
                id: "Perangkat belum dapat mencatat permintaan keluar. Coba lagi.",
                en: "Device could not record sign-out request yet. Please try again.",
            };
        }
        return;
    }
    loggedOutLocally.value = true;
    checkingContinuity.value = false;
    if (navigator.onLine && runtime.mode === "ONLINE_SERVER") {
        retryServerLogout();
    } else {
        rawLogoutError.value = {
            id: "Logout server tertunda hingga perangkat terhubung kembali.",
            en: "Server sign-out is deferred until device reconnects.",
        };
    }
}

function onEmergencyCreated(event: Event) {
    const detail = (event as CustomEvent<{ owner: number; id: string }>).detail;
    if (detail.owner !== currentOwner.value) return;
    emit("emergency-interrupt");
    if (runtime.mode === "OFFLINE_FIELD_MODE")
        runtime.navigate(`/relawan/emergencies/${detail.id}`);
    else activeLocalId.value = detail.id;
}

watch(
    currentOwner,
    (owner) => {
        const keyVersion = clinicalKeyVersion();
        activeLocalId.value = null;
        showStatusSheet.value = false;
        if (!owner || /^\/relawan\/emergencies\//.test(runtime.path)) return;
        void emergencyRepository
            .list(owner)
            .then((items) => {
                if (
                    owner !== currentOwner.value ||
                    keyVersion !== clinicalKeyVersion() ||
                    activeLocalId.value
                )
                    return;
                const pending = items.filter(
                    (item) =>
                        item.status === "PENDING" &&
                        item.sync_state !== "SYNCED",
                );
                pending.sort((a, b) =>
                    b.created_at.localeCompare(a.created_at),
                );
                activeLocalId.value = pending[0]?.id ?? null;
            })
            .catch(() => {
                /* T0 submission surfaces local storage failures. */
            });
    },
    { immediate: true },
);
async function checkContinuity() {
    const check = ++continuityCheck;
    try {
        // The server-authenticated owner refreshes continuity before this layout reads it.
        // recordVerifiedRelawan() leaves logout_pending intact outside explicit login.
        if (user.value?.role === "RELAWAN")
            await recordVerifiedRelawan(user.value);
        const result = await resolveRelawanContinuity();
        if (check !== continuityCheck) return;
        loggedOutLocally.value =
            result.state !== "ELIGIBLE" ||
            result.context.owner_user_id !== Number(user.value?.id);
        if (result.state === "STORAGE_UNAVAILABLE") {
            rawLogoutError.value = {
                id: "Akses perangkat belum dapat diperiksa. Coba lagi saat penyimpanan tersedia.",
                en: "Device access cannot be verified yet. Retry when storage is available.",
            };
        }
    } catch {
        if (check !== continuityCheck) return;
        // If the local store cannot be checked, a previous logout intent is unknown.
        loggedOutLocally.value = true;
        rawLogoutError.value = {
            id: "Akses perangkat belum dapat diperiksa. Coba lagi saat penyimpanan tersedia.",
            en: "Device access cannot be verified yet. Retry when storage is available.",
        };
    } finally {
        if (check === continuityCheck) checkingContinuity.value = false;
    }
}
function onVerifiedLogin() {
    void checkContinuity();
}
onMounted(() => {
    if (runtime.mode === "ONLINE_SERVER") void checkContinuity();
    else
        offlineContinuitySubscription = liveQuery(
            resolveRelawanContinuity,
        ).subscribe({
            next: (result) => {
                if (
                    result.state !== "ELIGIBLE" ||
                    result.context.owner_user_id !== runtime.owner
                )
                    loggedOutLocally.value = true;
            },
            error: () => {
                loggedOutLocally.value = true;
            },
        });
    registerRelawanServiceWorker();
    window.addEventListener("rapid-mind:verified-login", onVerifiedLogin);
    window.addEventListener("rapid-mind:emergency-created", onEmergencyCreated);
});
onUnmounted(() => {
    ++storageModeCheck;
    storageModeSubscription?.unsubscribe();
    offlineContinuitySubscription?.unsubscribe();
    window.removeEventListener(
        "rapid-mind:emergency-created",
        onEmergencyCreated,
    );
    window.removeEventListener("rapid-mind:verified-login", onVerifiedLogin);
});
</script>

<style scoped>
.relawan-header-controls { min-width: 0; }
.relawan-header-status { flex: 1; min-width: 0; max-inline-size: none; }
.relawan-header-status :deep(.truncate) { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
.relawan-header-controls > button:last-child { flex-shrink: 0; }
.relawan-identity-header { flex-wrap: nowrap; padding: 1rem; gap: .75rem; }
.relawan-identity-header > div:first-child { flex: 1; flex-basis: auto; }
.relawan-identity-header .relawan-header-controls { width: auto; max-width: none; flex-shrink: 0; }
.relawan-identity-header > div:first-child p:first-child { font-size: 1rem; font-weight: 700; color: #0f172a; }
.relawan-identity-main { padding-top: 0; }
@media (max-width: 359px) {
    .relawan-identity-header { flex-wrap: wrap; }
    .relawan-identity-header > div:first-child { flex-basis: 100%; }
    .relawan-identity-header .relawan-header-controls { width: 100%; justify-content: space-between; }
}
</style>
