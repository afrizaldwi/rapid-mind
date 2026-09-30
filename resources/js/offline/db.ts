import Dexie, { type Table } from 'dexie';

export interface LocalPatient {
  id: string; // uuid
  nik?: string;
  name: string;
  age?: number;
  gender?: string;
  shelter_id?: number;
  created_at?: string;
}

export interface LocalAssessment {
  id: string; // uuid
  patient_id: string;
  user_id?: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  mode: 'VERBAL' | 'NON_VERBAL';
  started_at?: string;
  completed_at?: string;
  srq_answers?: Record<number, boolean>;
  risk_indicators?: Record<string, boolean>;
  function_domains?: Record<string, number>;
  triage_result?: {
    srqScore: number;
    riskScore: number;
    functionScore: number;
    totalScore: number;
    recommendation: string;
    isRedFlagOverride: boolean;
  };
  synced: boolean;
  updated_at: string;
  local_draft_only?: boolean;
}

export interface LocalEmergency {
  id: string; // uuid
  patient_id?: string;
  patient_name?: string;
  red_flag_type: string;
  status: string;
  latitude?: number;
  longitude?: number;
  shelter_id?: number;
  notes?: string;
  created_at: string;
  synced: boolean;
}

export interface OutboxItem {
  id?: number;
  type: 'EMERGENCY' | 'ASSESSMENT' | 'PATIENT';
  payload: any;
  priority: number; // 1 for emergency, 2 for assessment
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retry_count: number;
  created_at: string;
}

export class RapidMindDB extends Dexie {
  patients!: Table<LocalPatient, string>;
  assessments!: Table<LocalAssessment, string>;
  emergencies!: Table<LocalEmergency, string>;
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super('RapidMindOfflineDB');
    this.version(1).stores({
      patients: 'id, nik, name, shelter_id',
      assessments: 'id, patient_id, status, synced, updated_at',
      emergencies: 'id, patient_id, status, synced, created_at',
      outbox: '++id, type, priority, status, created_at',
    });
  }
}

export const db = new RapidMindDB();
