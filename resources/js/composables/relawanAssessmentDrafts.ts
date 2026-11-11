import { assessmentRepository } from '@/offline/assessmentRepository';
import { patientRepository } from '@/offline/patientRepository';
import { loadAssessmentContext, resumeStage, type ServerAssessment } from '@/offline/assessmentWorkflow';
import type { LocalPatient } from '@/offline/db';

export type AssessmentDraft = {
  id: string;
  patientName: string;
  hasPatientName: boolean;
  nik?: string;
  mode: string;
  stage: 'srq' | 'risk' | 'function' | 'review';
  stageLabel: string;
  updatedAt: string;
  resumeUrl: string;
  resumeLabel: string;
};

const stageLabelsByLocale: Record<'id' | 'en', Record<string, string>> = {
  id: {
    srq: 'SRQ-20',
    risk: 'Faktor Risiko',
    function: 'Fungsi Harian',
    review: 'Tinjau Asesmen',
  },
  en: {
    srq: 'SRQ-20',
    risk: 'Risk Factors',
    function: 'Daily Functioning',
    review: 'Review Assessment',
  },
};

export async function loadRelawanAssessmentDrafts(
  owner: number,
  serverAssessments: ServerAssessment[] = [],
  locale: 'id' | 'en' = 'id',
): Promise<{
  drafts: AssessmentDraft[];
  patients: LocalPatient[];
  hydrationFailed: boolean;
}> {
  const isEn = locale === 'en';
  const stageLabels = isEn ? stageLabelsByLocale.en : stageLabelsByLocale.id;
  let hydrationFailed = false;
  for (const server of serverAssessments) {
    try {
      await loadAssessmentContext(owner, server, server.patient);
    } catch {
      hydrationFailed = true;
    }
  }

  const [assessments, patients] = await Promise.all([
    assessmentRepository.list(owner),
    patientRepository.list(owner),
  ]);
  const patientById = new Map(patients.map(patient => [patient.id, patient]));
  const drafts = assessments
    .filter(assessment => assessment.status === 'IN_PROGRESS')
    .map(assessment => {
      const patient = patientById.get(assessment.patient_id);
      const stage = resumeStage(assessment) as AssessmentDraft['stage'];
      return {
        id: assessment.id,
        patientName: patient?.name || (isEn ? 'Survivor' : 'Penyintas'),
        hasPatientName: Boolean(patient?.name),
        nik: patient?.nik || undefined,
        mode: assessment.mode,
        stage,
        stageLabel: stageLabels[stage],
        updatedAt: assessment.updated_at,
        resumeUrl: `/relawan/assessment/${assessment.id}/${stage}`,
        resumeLabel: stage === 'review' ? stageLabels.review : (isEn ? `Continue ${stageLabels[stage]}` : `Lanjutkan ${stageLabels[stage]}`),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { drafts, patients, hydrationFailed };
}
