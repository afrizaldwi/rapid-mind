import { assessmentRepository } from '@/offline/assessmentRepository';
import { patientRepository } from '@/offline/patientRepository';
import { loadAssessmentContext, resumeStage, type ServerAssessment } from '@/offline/assessmentWorkflow';
import type { LocalPatient } from '@/offline/db';

export type AssessmentDraft = {
  id: string;
  patientName: string;
  nik?: string;
  mode: string;
  stageLabel: string;
  updatedAt: string;
  resumeUrl: string;
  resumeLabel: string;
};

const stageLabels: Record<string, string> = {
  srq: 'SRQ-20',
  risk: 'Faktor Risiko',
  function: 'Fungsi Harian',
  review: 'Tinjau Asesmen',
};

export async function loadRelawanAssessmentDrafts(owner: number, serverAssessments: ServerAssessment[] = []): Promise<{
  drafts: AssessmentDraft[];
  patients: LocalPatient[];
  hydrationFailed: boolean;
}> {
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
      const stage = resumeStage(assessment);
      return {
        id: assessment.id,
        patientName: patient?.name || 'Penyintas',
        nik: patient?.nik || undefined,
        mode: assessment.mode,
        stageLabel: stageLabels[stage],
        updatedAt: assessment.updated_at,
        resumeUrl: `/relawan/assessment/${assessment.id}/${stage}`,
        resumeLabel: stage === 'review' ? 'Tinjau Asesmen' : `Lanjutkan ${stageLabels[stage]}`,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { drafts, patients, hydrationFailed };
}
