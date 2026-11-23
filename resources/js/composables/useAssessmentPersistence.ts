import { onUnmounted } from "vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import { ensureDeviceClinicalAccess } from "@/offline/deviceKeyWorkflow";
import * as workflow from "@/offline/assessmentWorkflow";
import * as drafts from "@/offline/assessmentDraft";
import { syncManager } from "@/offline/syncManager";

/** The same encrypted local save path is used with and without connectivity. */
export function useAssessmentPersistence(server: workflow.ServerAssessment, patient?: workflow.ServerPatient | null) {
    const runtime = useRelawanRuntime();
    const owner = runtime.owner;
    const path = runtime.path;
    let active = true;
    let generation = 0;
    function invalidate() { generation++; }
    onUnmounted(() => { active = false; invalidate(); });
    function current(user = owner, id = server.id) {
        return active && runtime.owner === owner && runtime.path === path &&
            user === owner && server.user_id === owner && id === server.id;
    }
    function requireCurrent(user = owner, id = server.id) {
        if (!current(user, id)) throw new Error("Akses asesmen berubah. Buka kembali asesmen.");
    }
    const loadAssessmentContext: typeof workflow.loadAssessmentContext = async (user, assessment, sourcePatient, localOnly) => {
        requireCurrent(user, assessment.id);
        await ensureDeviceClinicalAccess(owner);
        requireCurrent(user, assessment.id);
        return workflow.loadAssessmentContext(user, assessment, sourcePatient ?? patient,
            localOnly ?? runtime.mode === "OFFLINE_FIELD_MODE");
    };
    const readAssessmentDraft: typeof drafts.readAssessmentDraft = (user, id, field) => {
        requireCurrent(user, id);
        return drafts.readAssessmentDraft(user, id, field);
    };
    async function save(task: (isCurrent: () => boolean) => Promise<void>, isCurrent = () => true) {
        requireCurrent();
        const check = generation;
        const valid = () => check === generation && current() && isCurrent();
        if (!valid()) throw new Error("Akses asesmen berubah.");
        await task(valid);
        if (valid()) void syncManager.sync(owner).catch(() => {});
    }
    const saveAssessmentDraft: typeof drafts.saveAssessmentDraft = (assessment, field, answers, isCurrent) => {
        requireCurrent(assessment.user_id, assessment.id);
        return save(valid => drafts.saveAssessmentDraft(assessment, field, answers, valid), isCurrent);
    };
    const saveAssessmentMode: typeof drafts.saveAssessmentMode = (user, id, mode, isCurrent) => {
        requireCurrent(user, id);
        return save(valid => drafts.saveAssessmentMode(user, id, mode, valid), isCurrent);
    };
    const saveObservationDraft: typeof drafts.saveObservationDraft = (user, id, observations, isCurrent) => {
        requireCurrent(user, id);
        return save(valid => drafts.saveObservationDraft(user, id, observations, valid), isCurrent);
    };
    const completeLocalAssessment: typeof workflow.completeLocalAssessment = (user, id, isCurrent = () => true) => {
        requireCurrent(user, id);
        const check = generation;
        return workflow.completeLocalAssessment(user, id, () => check === generation && current(user, id) && isCurrent());
    };
    return { online: false, invalidate, loadAssessmentContext, readAssessmentDraft,
        saveAssessmentDraft, saveAssessmentMode, saveObservationDraft, completeLocalAssessment };
}
