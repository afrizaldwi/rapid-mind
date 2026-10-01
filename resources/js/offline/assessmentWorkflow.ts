import { usePage } from '@inertiajs/vue3';
import { assessmentRepository } from './assessmentRepository';
import { patientRepository } from './patientRepository';
import { requireOwner, type LocalAssessment, type LocalPatient } from './db';
import { mergeAssessmentDraft } from './assessmentDraft';
import { TriageCalculator } from '@/domain/triage/triageCalculator';
import { syncManager } from './syncManager';
import { localPersistenceHealth } from './localPersistenceHealth';

export type ServerPatient = Partial<LocalPatient> & { id: string; name: string };
export type ServerAssessment = Partial<LocalAssessment> & {
    id: string; user_id: number; patient_id?: string | null;
    patient?: ServerPatient | null;
    srq_responses?: Array<{ question_number: number; answer: boolean }>;
    risk_assessment?: Array<{ indicator: string; answer: boolean }>;
    function_assessment?: Array<{ domain: string; level: number }>;
};

export function relawanOwner(): number {
    const page = usePage();
    const auth = page.props.auth as { user?: { id?: number } } | undefined;
    return requireOwner(Number(auth?.user?.id));
}

export async function startLocalAssessment(owner: number, patientInput: Omit<LocalPatient, 'id' | 'owner_user_id' | 'sync_state'> & { id?: string; serverKnown?: boolean }, mode: LocalAssessment['mode']) {
    const { serverKnown, ...input } = patientInput;
    const patientId = await localPersistenceHealth.recordWrite(owner, () => serverKnown
        ? patientRepository.saveServerSnapshot(owner, input as ServerPatient)
        : patientRepository.save(owner, input));
    const id = await localPersistenceHealth.recordWrite(owner, () => assessmentRepository.save(owner, {
        patient_id: patientId,
        mode,
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        sync_state: 'LOCAL_SAVED',
    }));
    return id;
}

export async function loadAssessmentContext(owner: number, server: ServerAssessment, patientSnapshot?: ServerPatient | null) {
    requireOwner(owner);
    if (server.user_id !== owner) throw new Error('Asesmen tidak tersedia untuk Relawan ini.');
    let local = await assessmentRepository.get(owner, server.id);
    if (!local) {
        if (!server.patient_id) throw new Error('Asesmen lokal tidak ditemukan pada perangkat ini.');
        const patient = patientSnapshot ?? server.patient;
        if (!patient || patient.id !== server.patient_id) throw new Error('Data penyintas tidak tersedia.');
        await patientRepository.saveServerSnapshot(owner, patient);
        const srq = Object.fromEntries((server.srq_responses ?? []).map(row => [row.question_number, row.answer]));
        const risk = Object.fromEntries((server.risk_assessment ?? []).map(row => [row.indicator, row.answer]));
        const functions = Object.fromEntries((server.function_assessment ?? []).map(row => [row.domain, row.level]));
        await assessmentRepository.save(owner, {
            id: server.id,
            patient_id: server.patient_id,
            status: server.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
            mode: server.mode === 'NON_VERBAL' ? 'NON_VERBAL' : 'VERBAL',
            started_at: server.started_at,
            completed_at: server.completed_at,
            srq_answers: mergeAssessmentDraft('srq_answers', srq, {}),
            risk_indicators: mergeAssessmentDraft('risk_indicators', risk, {}),
            function_domains: mergeAssessmentDraft('function_domains', functions, {}),
            triage_result: server.triage_result,
            sync_state: 'SYNCED',
        });
        local = await assessmentRepository.get(owner, server.id);
    }
    if (local && server.patient_id) {
        const patient = patientSnapshot ?? server.patient;
        if (patient && patient.id === server.patient_id) {
            await patientRepository.saveServerSnapshot(owner, patient);
        }
        const srq = Object.fromEntries((server.srq_responses ?? []).map(row => [row.question_number, row.answer]));
        const risk = Object.fromEntries((server.risk_assessment ?? []).map(row => [row.indicator, row.answer]));
        const functions = Object.fromEntries((server.function_assessment ?? []).map(row => [row.domain, row.level]));
        const merged = {
            srq_answers: mergeAssessmentDraft('srq_answers', srq, local.srq_answers),
            risk_indicators: mergeAssessmentDraft('risk_indicators', risk, local.risk_indicators),
            function_domains: mergeAssessmentDraft('function_domains', functions, local.function_domains),
        };
        if (JSON.stringify(merged.srq_answers) !== JSON.stringify(local.srq_answers ?? {})
            || JSON.stringify(merged.risk_indicators) !== JSON.stringify(local.risk_indicators ?? {})
            || JSON.stringify(merged.function_domains) !== JSON.stringify(local.function_domains ?? {})) {
            await assessmentRepository.update(owner, server.id, merged);
            local = await assessmentRepository.get(owner, server.id);
        }
    }
    if (!local) throw new Error('Asesmen lokal tidak tersedia.');
    const patient = await patientRepository.get(owner, local.patient_id);
    if (!patient) throw new Error('Penyintas lokal tidak tersedia.');
    return { assessment: local, patient };
}

export function exactAssessmentAnswers(a: LocalAssessment): boolean {
    const srq = a.srq_answers ?? {};
    const risk = a.risk_indicators ?? {};
    const functions = a.function_domains ?? {};
    return Object.keys(srq).length === 20 && Array.from({ length: 20 }, (_, i) => typeof srq[i + 1] === 'boolean').every(Boolean)
        && Object.keys(risk).length === 5 && ['R1', 'R2', 'R3', 'R4', 'R5'].every(k => typeof risk[k] === 'boolean')
        && Object.keys(functions).length === 3 && ['F1', 'F2', 'F3'].every(k => [0, 1, 3].includes(functions[k]));
}

export function resumeStage(a: LocalAssessment): string {
    if (Object.keys(a.srq_answers ?? {}).length !== 20 || !Array.from({ length: 20 }, (_, i) => typeof a.srq_answers?.[i + 1] === 'boolean').every(Boolean)) return 'srq';
    if (Object.keys(a.risk_indicators ?? {}).length !== 5 || !['R1', 'R2', 'R3', 'R4', 'R5'].every(k => typeof a.risk_indicators?.[k] === 'boolean')) return 'risk';
    if (!exactAssessmentAnswers(a)) return 'function';
    return 'review';
}

export async function completeLocalAssessment(owner: number, id: string) {
    const local = await assessmentRepository.get(owner, id);
    if (!local || !exactAssessmentAnswers(local)) throw new Error('Asesmen belum lengkap atau tidak tersedia.');
    const patient = await patientRepository.get(owner, local.patient_id);
    if (!patient) throw new Error('Penyintas lokal tidak tersedia.');
    const triage = new TriageCalculator().calculate(local.srq_answers!, local.risk_indicators!, local.function_domains!);
    const completedAt = local.completed_at ?? new Date().toISOString();
    if (local.status === 'IN_PROGRESS') {
        await localPersistenceHealth.recordWrite(owner, () => assessmentRepository.update(owner, id, { status: 'COMPLETED', completed_at: completedAt, triage_result: triage, sync_state: 'LOCAL_SAVED' }));
    }
    const payload = {
        id, patient: { id: patient.id, nik: patient.nik ?? null, name: patient.name, age: patient.age ?? null, gender: patient.gender ?? null },
        mode: local.mode, status: 'COMPLETED', started_at: local.started_at, completed_at: completedAt,
        srq_answers: local.srq_answers!, risk_indicators: local.risk_indicators!, function_domains: local.function_domains!,
        client_triage: triage,
    };
    await syncManager.queueItem(owner, 'ASSESSMENT', id, payload);
    return triage;
}
