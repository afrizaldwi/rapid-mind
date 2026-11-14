import { onUnmounted, provide } from "vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import * as workflow from "@/offline/assessmentWorkflow";
import * as drafts from "@/offline/assessmentDraft";
import { normalizeDraftAnswers } from "@/offline/assessmentDraftValues";
import { srqAnswerFromRow } from "@/domain/srq/srqAnswer";
import { normalizeObservations } from "@/domain/assessment/nonVerbalObservations";
import { jsonRequest } from "@/offline/jsonRequest";
import type { LocalAssessment } from "@/offline/db";
import type { TriageResult } from "@/domain/triage/triageResult";
import { onlineAssessmentContextKey } from "@/relawan/onlineAssessmentContext";

/** Online pages persist through authorized server endpoints without hydrating IndexedDB. */
export function useAssessmentPersistence(server: workflow.ServerAssessment, patient?: workflow.ServerPatient | null) {
    const runtime = useRelawanRuntime();
    const owner = runtime.owner;
    const path = runtime.path;
    const online = runtime.mode === "ONLINE_SERVER" && !!server.patient_id;
    let active = true;
    let snapshot: LocalAssessment | null = null;
    let pending = Promise.resolve();
    function invalidate() { active = false; snapshot = null; }
    onUnmounted(invalidate);
    provide(onlineAssessmentContextKey, () => {
        const sourcePatient = patient ?? server.patient;
        if (!online || !snapshot || !sourcePatient) return null;
        assertCurrent();
        return {
            patient: sourcePatient,
            assessment: {
                ...snapshot, user_id: owner!,
                srq_responses: Object.entries(snapshot.srq_answers ?? {}).map(([number, answer]) => ({
                    question_number: Number(number), answer: typeof answer === "boolean" ? answer : null,
                    answer_state: typeof answer === "boolean" ? null : answer,
                })),
                risk_assessment: Object.entries(snapshot.risk_indicators ?? {}).map(([indicator, answer]) => ({ indicator, answer })),
                function_assessment: Object.entries(snapshot.function_domains ?? {}).map(([domain, level]) => ({ domain, level })),
            },
        };
    });

    function assertCurrent(id = server.id, user = owner) {
        if (!active || runtime.mode !== "ONLINE_SERVER" || runtime.owner !== owner || runtime.path !== path ||
            user !== owner || server.user_id !== owner || id !== server.id)
            throw new Error("Akses asesmen berubah. Buka kembali asesmen.");
    }
    async function send(suffix: string, payload: Record<string, unknown>, isCurrent = () => true) {
        assertCurrent();
        if (!isCurrent()) throw new Error("Akses asesmen berubah.");
        if (!navigator.onLine) throw new Error("Koneksi terputus. Jawaban masih ada di halaman ini dan belum tersimpan di server.");
        if (!snapshot?.server_version) throw new Error("Versi asesmen tidak tersedia. Muat dan tinjau asesmen kembali.");
        let response: Response;
        try {
            response = await jsonRequest(`/relawan/assessment/${encodeURIComponent(server.id)}/${suffix}`, { ...payload, base_version: snapshot.server_version });
        } catch {
            throw new Error("Penerimaan server belum terkonfirmasi. Jawaban masih ada di halaman ini; periksa koneksi atau sesi login dan tinjau asesmen sebelum mencoba kembali.");
        }
        assertCurrent();
        if (!isCurrent()) throw new Error("Akses asesmen berubah.");
        if (!response.ok) throw new Error("Penyimpanan server belum berhasil. Jawaban masih ada di halaman ini. Periksa koneksi atau masuk kembali.");
        const body = await response.json() as { server_version?: string; result?: TriageResult };
        if (suffix !== "complete") {
            if (!body.server_version) throw new Error("Penerimaan versi server belum terkonfirmasi. Muat dan tinjau asesmen kembali.");
            snapshot.server_version = body.server_version;
        }
        return body;
    }
    function queue(task: () => Promise<void>) {
        const next = pending.catch(() => {}).then(task);
        pending = next;
        return next;
    }
    function srqPayload() {
        if (!snapshot) throw new Error("Asesmen belum siap.");
        return {
            responses: Array.from({ length: 20 }, (_, index) => ({
                question_number: index + 1,
                answer: snapshot!.srq_answers?.[index + 1] ?? "UNANSWERED",
            })),
            mode: snapshot.mode,
            non_verbal_reasons: snapshot.non_verbal_reasons ?? [],
            non_verbal_other_note: snapshot.non_verbal_other_note ?? null,
        };
    }
    const loadAssessmentContext: typeof workflow.loadAssessmentContext = async (...args) => {
        if (!online) return workflow.loadAssessmentContext(...args);
        assertCurrent(args[1].id, args[0]);
        const sourcePatient = patient ?? server.patient;
        if (!sourcePatient || sourcePatient.id !== server.patient_id)
            throw new Error("Data penyintas tidak sesuai dengan asesmen.");
        snapshot = {
            id: server.id, owner_user_id: owner!, patient_id: server.patient_id!,
            mode: server.mode === "NON_VERBAL" ? "NON_VERBAL" : "VERBAL",
            status: server.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
            started_at: server.started_at, completed_at: server.completed_at,
            updated_at: server.updated_at ?? server.started_at ?? "",
            sync_state: "SYNCED", server_version: server.server_version,
            srq_answers: Object.fromEntries((server.srq_responses ?? []).map(row => [row.question_number, srqAnswerFromRow(row)])),
            risk_indicators: Object.fromEntries((server.risk_assessment ?? []).map(row => [row.indicator, row.answer])),
            function_domains: Object.fromEntries((server.function_assessment ?? []).map(row => [row.domain, row.level])),
            ...normalizeObservations({ non_verbal_reasons: server.non_verbal_reasons ?? [], non_verbal_other_note: server.non_verbal_other_note }),
            triage_result: server.triage_result,
        };
        return { assessment: snapshot, patient: { ...sourcePatient, owner_user_id: owner!, sync_state: "SYNCED" } };
    };
    const readAssessmentDraft: typeof drafts.readAssessmentDraft = async (user, id, field) => {
        if (!online) return drafts.readAssessmentDraft(user, id, field);
        assertCurrent(id, user);
        return normalizeDraftAnswers(field, snapshot?.[field]);
    };
    const saveAssessmentDraft: typeof drafts.saveAssessmentDraft = (assessment, field, answers, isCurrent = () => true) => {
        if (!online) return drafts.saveAssessmentDraft(assessment, field, answers, isCurrent);
        const cleaned = normalizeDraftAnswers(field, answers);
        return queue(async () => {
            assertCurrent(assessment.id, assessment.user_id);
            if (!snapshot || !isCurrent()) throw new Error("Akses asesmen berubah.");
            Object.assign(snapshot, { [field]: cleaned });
            if (field === "srq_answers") await send("srq", srqPayload(), isCurrent);
            if (field === "risk_indicators" && Object.keys(cleaned).length === 5) await send("risk", { risks: cleaned }, isCurrent);
            if (field === "function_domains" && Object.keys(cleaned).length === 3) await send("function", { functions: cleaned }, isCurrent);
        });
    };
    const saveAssessmentMode: typeof drafts.saveAssessmentMode = (user, id, mode, isCurrent) => {
        if (!online) return drafts.saveAssessmentMode(user, id, mode, isCurrent);
        return queue(async () => {
            assertCurrent(id, user);
            if (!snapshot) throw new Error("Asesmen belum siap.");
            snapshot.mode = mode;
            await send("srq", srqPayload(), isCurrent);
        });
    };
    const saveObservationDraft: typeof drafts.saveObservationDraft = (user, id, observations, isCurrent) => {
        if (!online) return drafts.saveObservationDraft(user, id, observations, isCurrent);
        const cleaned = normalizeObservations(observations);
        return queue(async () => {
            assertCurrent(id, user);
            if (!snapshot) throw new Error("Asesmen belum siap.");
            Object.assign(snapshot, cleaned);
            await send("srq", srqPayload(), isCurrent);
        });
    };
    const completeLocalAssessment: typeof workflow.completeLocalAssessment = async (user, id, isCurrent) => {
        if (!online) return workflow.completeLocalAssessment(user, id, isCurrent);
        assertCurrent(id, user);
        await pending;
        if (!snapshot || !workflow.exactAssessmentAnswers(snapshot)) throw new Error("Asesmen belum lengkap.");
        const result = await send("complete", {}, isCurrent);
        if (!result.result) throw new Error("Hasil server belum tersedia. Buka hasil asesmen kembali.");
        return result.result;
    };
    return { online, invalidate, loadAssessmentContext, readAssessmentDraft, saveAssessmentDraft, saveAssessmentMode, saveObservationDraft, completeLocalAssessment };
}
