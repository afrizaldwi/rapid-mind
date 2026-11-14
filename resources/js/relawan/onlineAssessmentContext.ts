import type { InjectionKey } from "vue";
import type { ServerAssessment, ServerPatient } from "@/offline/assessmentWorkflow";

// Scoped to the mounted page. No clinical snapshot is written to browser storage.
export const onlineAssessmentContextKey: InjectionKey<() => {
    assessment: ServerAssessment;
    patient: ServerPatient;
} | null> = Symbol("online-assessment-context");
