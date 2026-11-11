import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { assessmentRepository } from "@/offline/assessmentRepository";
import { emergencyRepository } from "@/offline/emergencyRepository";
import { outboxRepository } from "@/offline/outboxRepository";
import { patientRepository } from "@/offline/patientRepository";
import {
    resumeStage,
    type ServerAssessment,
    type ServerPatient,
} from "@/offline/assessmentWorkflow";
import { normalizeTriage, type DisplayTriage } from "@/offline/triageDisplay";
import {
    clinicalKeyReady,
    clinicalKeyVersion,
    encryptedMode,
} from "@/offline/encryptedClinicalStorage";
import { syntheticLegacyFixture } from "@/offline/clinicalStorageInitialization";
import type {
    LocalAssessment,
    LocalEmergency,
    LocalPatient,
    OutboxItem,
} from "@/offline/db";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

export type ServerDataAssessment = ServerAssessment & {
    resume_url?: string;
    resume_label?: string;
};
export type ServerDataEmergency = {
    id: string;
    user_id: number;
    patient?: ServerPatient | null;
    red_flag_type: string;
    notes?: string | null;
    created_at: string;
    updated_at?: string;
};
type OwnedRecords = {
    assessments: LocalAssessment[];
    emergencies: LocalEmergency[];
    patients: LocalPatient[];
    outbox: OutboxItem[];
};
export type WorkspaceRow = {
    key: string;
    id: string;
    type: "ASSESSMENT" | "EMERGENCY";
    patientName: string;
    date: string;
    label: string;
    source: "local" | "server";
    resumeUrl?: string;
    resultUrl?: string;
    emergencyUrl?: string;
    triage: DisplayTriage | null;
    status?: string;
    redFlagType?: string;
    notes?: string | null;
    unqueued?: boolean;
    retryable?: boolean;
};

const key = (type: WorkspaceRow["type"], id: string) => `${type}:${id}`;
const byNewest = (a: WorkspaceRow, b: WorkspaceRow) =>
    b.date.localeCompare(a.date);
const byPriority = (a: WorkspaceRow, b: WorkspaceRow) =>
    Number(b.type === "EMERGENCY") - Number(a.type === "EMERGENCY") ||
    byNewest(a, b);

export function useOwnedLocalRecords(owner: Ref<number | null>) {
    const { isEn } = useI18n();
    const records = ref<OwnedRecords>({
        assessments: [],
        emergencies: [],
        patients: [],
        outbox: [],
    });
    const ready = ref(false);
    const readFailed = ref(false);
    const error = computed(() =>
        readFailed.value
            ? isEn.value
                ? "Device data cannot be read yet."
                : "Data di perangkat belum dapat dibaca."
            : "",
    );
    let subscription: Subscription | undefined;
    let generation = 0;
    const stop = watch(
        [owner, clinicalKeyVersion],
        ([next]) => {
            generation++;
            subscription?.unsubscribe();
            subscription = undefined;
            records.value = {
                assessments: [],
                emergencies: [],
                patients: [],
                outbox: [],
            };
            ready.value = false;
            readFailed.value = false;
            if (!next) return;
            if (!syntheticLegacyFixture() && !clinicalKeyReady(next)) return;
            const current = generation;
            subscription = liveQuery(async (): Promise<OwnedRecords> => {
                if ((await encryptedMode(next)) && !clinicalKeyReady(next)) {
                    return {
                        assessments: [],
                        emergencies: [],
                        patients: [],
                        outbox: [],
                    };
                }
                const [assessments, emergencies, patients, outbox] =
                    await Promise.all([
                        assessmentRepository.list(next),
                        emergencyRepository.list(next),
                        patientRepository.list(next),
                        outboxRepository.list(next),
                    ]);
                return { assessments, emergencies, patients, outbox };
            }).subscribe({
                next: (value) => {
                    if (current !== generation) return;
                    records.value = value;
                    ready.value = true;
                    readFailed.value = false;
                },
                error: () => {
                    if (current !== generation) return;
                    if (!syntheticLegacyFixture() && !clinicalKeyReady(next))
                        return;
                    ready.value = false;
                    readFailed.value = true;
                },
            });
        },
        { immediate: true },
    );
    onUnmounted(() => {
        stop();
        generation++;
        subscription?.unsubscribe();
    });
    return { records, ready, error };
}

export function useRelawanDataWorkspace(
    owner: Ref<number | null>,
    serverInProgress: Ref<ServerDataAssessment[]>,
    serverCompleted: Ref<ServerDataAssessment[]>,
    serverEmergencies: Ref<ServerDataEmergency[]>,
) {
    const { isEn } = useI18n();
    const local = useOwnedLocalRecords(owner);
    const stageLabels = computed<Record<string, string>>(() =>
        isEn.value
            ? {
                  srq: "Continue SRQ-20",
                  risk: "Continue Risk Factors",
                  function: "Continue Daily Function",
                  review: "Review Assessment",
              }
            : {
                  srq: "Lanjutkan SRQ-20",
                  risk: "Lanjutkan Faktor Risiko",
                  function: "Lanjutkan Fungsi Harian",
                  review: "Tinjau Asesmen",
              },
    );
    const projected = computed(() => {
        const en = isEn.value;
        const defaultSurvivor = en ? "Survivor" : "Penyintas";
        const defaultUnidentified = en ? "Unidentified Survivor" : "Penyintas Tanpa Nama";
        const syncedLabel = en ? "Synchronized" : "Tersinkron";
        const serverAcceptedLabel = en ? "Accepted by server" : "Diterima server";
        const savedOnDeviceLabel = en ? "Saved on device" : "Tersimpan di perangkat";
        const failedSyncLabel = en ? "Synchronization unsuccessful" : "Sinkronisasi belum berhasil";
        const syncingLabel = en ? "Synchronizing" : "Menyinkronkan";
        const pendingSyncLabel = en ? "Awaiting synchronization" : "Menunggu sinkronisasi";
        const unqueuedLabel = en ? "Not yet queued for synchronization" : "Belum masuk antrean sinkronisasi";

        const { assessments, emergencies, patients, outbox } =
            local.records.value;
        const patientById = new Map(patients.map((item) => [item.id, item]));
        const queueByKey = new Map(
            outbox.map((item) => [key(item.type, item.entity_id), item]),
        );
        const localIds = new Set(assessments.map((item) => item.id));
        const inProgress: WorkspaceRow[] = [];
        const pending: WorkspaceRow[] = [];
        const synchronized = new Map<string, WorkspaceRow>();

        for (const item of serverCompleted.value) {
            if (item.user_id !== owner.value) continue;
            synchronized.set(key("ASSESSMENT", item.id), {
                key: key("ASSESSMENT", item.id),
                id: item.id,
                type: "ASSESSMENT",
                patientName: item.patient?.name || defaultSurvivor,
                date: item.completed_at || item.updated_at || "",
                label: syncedLabel,
                source: "server",
                resultUrl: `/relawan/assessment/${item.id}/result`,
                triage: normalizeTriage(item.triage_result),
            });
        }
        for (const item of serverEmergencies.value) {
            if (item.user_id !== owner.value) continue;
            synchronized.set(key("EMERGENCY", item.id), {
                key: key("EMERGENCY", item.id),
                id: item.id,
                type: "EMERGENCY",
                patientName: item.patient?.name || defaultUnidentified,
                date: item.created_at,
                label: serverAcceptedLabel,
                source: "server",
                emergencyUrl: `/relawan/emergencies/${item.id}`,
                triage: null,
                redFlagType: item.red_flag_type,
                notes: item.notes,
            });
        }

        for (const item of assessments) {
            const itemKey = key("ASSESSMENT", item.id);
            const queue = queueByKey.get(itemKey);
            const patient = patientById.get(item.patient_id);
            const base: WorkspaceRow = {
                key: itemKey,
                id: item.id,
                type: "ASSESSMENT",
                patientName: patient?.name || defaultSurvivor,
                date: item.completed_at || item.updated_at,
                label: savedOnDeviceLabel,
                source: "local",
                triage: normalizeTriage(item.triage_result),
            };
            if (item.status === "IN_PROGRESS") {
                const stage = resumeStage(item);
                inProgress.push({
                    ...base,
                    date: item.updated_at,
                    label: savedOnDeviceLabel,
                    resumeUrl: `/relawan/assessment/${item.id}/${stage}`,
                    status: stageLabels.value[stage],
                });
                synchronized.delete(itemKey);
                continue;
            }
            if (queue || item.sync_state !== "SYNCED") {
                pending.push({
                    ...base,
                    label:
                        queue?.status === "FAILED" ||
                        item.sync_state === "SYNC_FAILED"
                            ? failedSyncLabel
                            : queue?.status === "SYNCING"
                              ? syncingLabel
                              : queue
                                ? pendingSyncLabel
                                : unqueuedLabel,
                    resultUrl: `/relawan/assessment/${item.id}/result`,
                    unqueued: !queue,
                    retryable:
                        !!queue &&
                        (queue.status !== "FAILED" ||
                            queue.last_http_status === undefined ||
                            [401, 408, 419, 429].includes(
                                queue.last_http_status,
                            ) ||
                            queue.last_http_status >= 500),
                });
                synchronized.delete(itemKey);
            } else {
                const server = synchronized.get(itemKey);
                synchronized.set(itemKey, {
                    ...base,
                    ...server,
                    patientName:
                        !server?.patientName ||
                        server.patientName === "Penyintas" ||
                        server.patientName === "Survivor"
                            ? base.patientName
                            : server.patientName,
                    triage: server?.triage ?? base.triage,
                    label: syncedLabel,
                    resultUrl: `/relawan/assessment/${item.id}/result`,
                });
            }
        }
        for (const item of serverInProgress.value) {
            if (item.user_id !== owner.value || localIds.has(item.id)) continue;
            inProgress.push({
                key: key("ASSESSMENT", item.id),
                id: item.id,
                type: "ASSESSMENT",
                patientName: item.patient?.name || defaultSurvivor,
                date: item.updated_at || item.started_at || "",
                label: local.ready.value
                    ? (en ? "Only available on server" : "Hanya tersedia di server")
                    : (en ? "Device status cannot be confirmed yet" : "Status di perangkat belum dapat dipastikan"),
                source: "server",
                resumeUrl:
                    item.resume_url || `/relawan/assessment/${item.id}/srq`,
                status: item.resume_label
                    ? localizeMessage(item.resume_label, en ? "en" : "id")
                    : (en ? "Continue" : "Lanjutkan"),
                triage: null,
            });
        }
        for (const item of emergencies) {
            const itemKey = key("EMERGENCY", item.id);
            const queue = queueByKey.get(itemKey);
            const patient = item.patient_id
                ? patientById.get(item.patient_id)
                : undefined;
            const base: WorkspaceRow = {
                key: itemKey,
                id: item.id,
                type: "EMERGENCY",
                patientName:
                    item.patient_name ||
                    patient?.name ||
                    defaultUnidentified,
                date: item.created_at,
                label: savedOnDeviceLabel,
                source: "local",
                triage: null,
                redFlagType: item.red_flag_type,
                notes: item.notes,
                emergencyUrl: `/relawan/emergencies/${item.id}`,
            };
            if (queue || item.sync_state !== "SYNCED") {
                pending.push({
                    ...base,
                    label:
                        queue?.status === "FAILED" ||
                        item.sync_state === "SYNC_FAILED"
                            ? failedSyncLabel
                            : queue?.status === "SYNCING"
                              ? syncingLabel
                              : queue
                                ? pendingSyncLabel
                                : savedOnDeviceLabel,
                    retryable:
                        !!queue &&
                        (queue.status !== "FAILED" ||
                            queue.last_http_status === undefined ||
                            [401, 408, 419, 429].includes(
                                queue.last_http_status,
                            ) ||
                            queue.last_http_status >= 500),
                });
                synchronized.delete(itemKey);
            } else {
                const server = synchronized.get(itemKey);
                synchronized.set(itemKey, {
                    ...base,
                    ...server,
                    patientName:
                        !server?.patientName ||
                        server.patientName === "Penyintas Tanpa Nama" ||
                        server.patientName === "Unidentified Survivor"
                            ? base.patientName
                            : server.patientName,
                    label: serverAcceptedLabel,
                    emergencyUrl: `/relawan/emergencies/${item.id}`,
                });
            }
        }
        return {
            inProgress: inProgress.sort(byNewest),
            pending: pending.sort(byPriority),
            synchronized: [...synchronized.values()].sort(byPriority),
        };
    });
    return { ...local, groups: projected };
}
