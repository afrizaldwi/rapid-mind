import { useRelawanRuntime } from "@/relawan/runtime";
import { assessmentRepository } from "./assessmentRepository";
import { patientRepository } from "./patientRepository";
import { requireOwner, type LocalAssessment, type LocalPatient } from "./db";
import { mergeAssessmentDraft } from "./assessmentDraft";
import { exactAssessmentAnswers } from "./assessmentContract";
import {
    hasDefinitiveSrqAnswers,
    srqAnswerFromRow,
} from "../domain/srq/srqAnswer";
import { mergeObservations } from "../domain/assessment/nonVerbalObservations";
import { queueAssessmentSnapshot } from "./assessmentSync";
export { exactAssessmentAnswers } from "./assessmentContract";
import { TriageCalculator } from "@/domain/triage/triageCalculator";
import { syncManager } from "./syncManager";
import { localPersistenceHealth } from "./localPersistenceHealth";

export type ServerPatient = Partial<LocalPatient> & {
    id: string;
    name: string;
};
export type ServerAssessment = Omit<
    Partial<LocalAssessment>,
    "non_verbal_reasons"
> & {
    non_verbal_reasons?: LocalAssessment["non_verbal_reasons"] | null;
    id: string;
    user_id: number;
    patient_id?: string | null;
    patient?: ServerPatient | null;
    srq_responses?: Array<{
        question_number: number;
        answer: unknown;
        answer_state?: unknown;
    }>;
    risk_assessment?: Array<{ indicator: string; answer: boolean }>;
    function_assessment?: Array<{ domain: string; level: number }>;
};

export function relawanOwner(): number {
    return requireOwner(useRelawanRuntime().owner);
}

export async function startLocalAssessment(
    owner: number,
    patientInput: Omit<LocalPatient, "id" | "owner_user_id" | "sync_state"> & {
        id?: string;
        serverKnown?: boolean;
    },
    mode: LocalAssessment["mode"],
) {
    const { serverKnown, ...input } = patientInput;
    const existingLocal =
        input.id && !serverKnown
            ? await patientRepository.get(owner, input.id)
            : null;
    const patientId =
        existingLocal?.id ??
        (await localPersistenceHealth.recordWrite(owner, () =>
            serverKnown
                ? patientRepository.saveServerSnapshot(
                      owner,
                      input as ServerPatient,
                  )
                : patientRepository.save(owner, input),
        ));
    const id = await localPersistenceHealth.recordWrite(owner, () =>
        assessmentRepository.save(owner, {
            patient_id: patientId,
            mode,
            status: "IN_PROGRESS",
            started_at: new Date().toISOString(),
            sync_state: "LOCAL_SAVED",
        }),
    );
    return id;
}

export async function loadAssessmentContext(
    owner: number,
    server: ServerAssessment,
    patientSnapshot?: ServerPatient | null,
    localOnly = false,
) {
    requireOwner(owner);
    if (server.user_id !== owner)
        throw new Error("Asesmen tidak tersedia untuk Relawan ini.");
    if (localOnly) {
        const assessment = await assessmentRepository.get(owner, server.id);
        if (!assessment)
            throw new Error("Asesmen ini belum tersedia di perangkat.");
        const patient = await patientRepository.get(
            owner,
            assessment.patient_id,
        );
        if (!patient)
            throw new Error("Data penyintas belum tersedia di perangkat.");
        return { assessment, patient };
    }
    let local = await assessmentRepository.get(owner, server.id);
    if (!local) {
        if (!server.patient_id)
            throw new Error(
                "Asesmen lokal tidak ditemukan pada perangkat ini.",
            );
        const patient = patientSnapshot ?? server.patient;
        if (!patient || patient.id !== server.patient_id)
            throw new Error("Data penyintas tidak tersedia.");
        await patientRepository.saveServerSnapshot(owner, patient);
        const srq = Object.fromEntries(
            (server.srq_responses ?? []).map((row) => [
                row.question_number,
                srqAnswerFromRow(row),
            ]),
        );
        const risk = Object.fromEntries(
            (server.risk_assessment ?? []).map((row) => [
                row.indicator,
                row.answer,
            ]),
        );
        const functions = Object.fromEntries(
            (server.function_assessment ?? []).map((row) => [
                row.domain,
                row.level,
            ]),
        );
        await assessmentRepository.save(
            owner,
            {
                id: server.id,
                patient_id: server.patient_id,
                status:
                    server.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
                mode: server.mode === "NON_VERBAL" ? "NON_VERBAL" : "VERBAL",
                started_at: server.started_at,
                completed_at: server.completed_at,
                server_version: server.server_version,
                ...mergeObservations(serverObservations(server), {}),
                srq_answers: mergeAssessmentDraft("srq_answers", srq, {}),
                risk_indicators: mergeAssessmentDraft(
                    "risk_indicators",
                    risk,
                    {},
                ),
                function_domains: mergeAssessmentDraft(
                    "function_domains",
                    functions,
                    {},
                ),
                triage_result: server.triage_result,
                sync_state: "SYNCED",
            },
            true,
        );
        local = await assessmentRepository.get(owner, server.id);
    }
    if (local && server.patient_id) {
        const patient = patientSnapshot ?? server.patient;
        if (patient && patient.id === server.patient_id) {
            await patientRepository.saveServerSnapshot(owner, patient);
        }
        const srq = Object.fromEntries(
            (server.srq_responses ?? []).map((row) => [
                row.question_number,
                srqAnswerFromRow(row),
            ]),
        );
        const risk = Object.fromEntries(
            (server.risk_assessment ?? []).map((row) => [
                row.indicator,
                row.answer,
            ]),
        );
        const functions = Object.fromEntries(
            (server.function_assessment ?? []).map((row) => [
                row.domain,
                row.level,
            ]),
        );
        // The repository transform reads the latest record at write time, so
        // a delayed server route cannot overwrite a newer local clarification.
        if (local.status === "COMPLETED") {
            if (server.status === "COMPLETED" && local.sync_state === "SYNCED")
                await assessmentRepository.hydrateCompleted(
                    owner,
                    server.id,
                    {
                        id: server.id,
                        patient_id: server.patient_id,
                        mode: server.mode,
                        status: "COMPLETED",
                        ...serverObservations(server),
                        ...(server.srq_responses !== undefined
                            ? { srq_answers: srq }
                            : {}),
                        ...(server.risk_assessment !== undefined
                            ? { risk_indicators: risk }
                            : {}),
                        ...(server.function_assessment !== undefined
                            ? { function_domains: functions }
                            : {}),
                    },
                    local.local_revision ?? 0,
                );
        } else
            await assessmentRepository.update(owner, server.id, (current) =>
                current.status === "COMPLETED"
                    ? {}
                    : {
                          ...mergeObservations(
                              serverObservations(server),
                              current,
                          ),
                          srq_answers: mergeAssessmentDraft(
                              "srq_answers",
                              srq,
                              current.srq_answers,
                          ),
                          risk_indicators: mergeAssessmentDraft(
                              "risk_indicators",
                              risk,
                              current.risk_indicators,
                          ),
                          function_domains: mergeAssessmentDraft(
                              "function_domains",
                              functions,
                              current.function_domains,
                          ),
                      },
            );
        local = await assessmentRepository.get(owner, server.id);
    }
    if (!local) throw new Error("Asesmen lokal tidak tersedia.");
    const patient = await patientRepository.get(owner, local.patient_id);
    if (!patient) throw new Error("Penyintas lokal tidak tersedia.");
    return { assessment: local, patient };
}

export function resumeStage(a: LocalAssessment): string {
    if (!hasDefinitiveSrqAnswers(a.srq_answers)) return "srq";
    if (
        Object.keys(a.risk_indicators ?? {}).length !== 5 ||
        !["R1", "R2", "R3", "R4", "R5"].every(
            (k) => typeof a.risk_indicators?.[k] === "boolean",
        )
    )
        return "risk";
    if (!exactAssessmentAnswers(a)) return "function";
    return "review";
}

export async function completeLocalAssessment(
    owner: number, id: string, isCurrent: () => boolean = () => true,
) {
    const assertCurrent = () => {
        if (!isCurrent()) throw new Error("Akses asesmen berubah. Tinjau kembali sebelum menyelesaikan.");
    };
    assertCurrent();
    const local = await assessmentRepository.get(owner, id);
    assertCurrent();
    if (!local || !exactAssessmentAnswers(local))
        throw new Error("Asesmen belum lengkap atau tidak tersedia.");
    const patient = await patientRepository.get(owner, local.patient_id);
    assertCurrent();
    if (!patient) throw new Error("Penyintas lokal tidak tersedia.");
    const triage = new TriageCalculator().calculate(
        local.srq_answers!,
        local.risk_indicators!,
        local.function_domains!,
    );
    const completedAt = local.completed_at ?? new Date().toISOString();
    if (local.status === "IN_PROGRESS") {
        await localPersistenceHealth.recordWrite(owner, () =>
            assessmentRepository.update(owner, id, (current) => {
                assertCurrent();
                if (
                    (current.local_revision ?? 0) !==
                    (local.local_revision ?? 0)
                )
                    throw new Error(
                        "Asesmen berubah. Tinjau kembali sebelum menyelesaikan.",
                    );
                return {
                    status: "COMPLETED",
                    completed_at: completedAt,
                    triage_result: triage,
                    sync_state: "LOCAL_SAVED",
                };
            }),
        );
    }
    await queueAssessmentSnapshot(owner, id);
    void syncManager.sync(owner).catch(() => {});
    return triage;
}

function serverObservations(server: ServerAssessment) {
    return server.non_verbal_reasons !== undefined
        ? {
              non_verbal_reasons: server.non_verbal_reasons ?? [],
              non_verbal_other_note: server.non_verbal_other_note ?? null,
          }
        : {};
}
