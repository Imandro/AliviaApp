/* ----------------------------------------------------
   ALIVIA - CHEQUEO DE BIENESTAR (cliente)
   Evaluación de estrés, ansiedad y depresión cada 5 días,
   con recomendaciones de planes y contacto de crisis.
   ---------------------------------------------------- */

import { getAuthHeaders } from './auth';
import { apiGet, apiMutate, readCache, writeCache, OfflineQueuedError, tempId } from './apiClient';

export type DimensionKey = 'stress' | 'anxiety' | 'depression';
export type LevelKey = 'baja' | 'moderada' | 'alta';

export interface AssessmentRecord {
  id: number;
  type: string;
  stress: number;
  anxiety: number;
  depression: number;
  level: LevelKey;
  crisis: boolean;
  recommendations: string[];
  ai_advice: string | null;
  created_at: string;
}

export interface AssessmentResult {
  stress: number;
  anxiety: number;
  depression: number;
  level: LevelKey;
  crisis: boolean;
  recommendations: string[];
}

const BASE = '/api/assessments';

const DIMENSION_MAX = 15;

export const DIMENSION_INFO: Record<DimensionKey, { label: string; short: string; emoji: string }> = {
  stress: { label: 'Estrés', short: 'ESTRÉS', emoji: '✦' },
  anxiety: { label: 'Ansiedad', short: 'ANSIEDAD', emoji: '≋' },
  depression: { label: 'Depresión', short: 'DEPRESIÓN', emoji: '✦' },
};

export const levelOf = (score: number): LevelKey => {
  if (score <= 4) return 'baja';
  if (score <= 9) return 'moderada';
  return 'alta';
};

export const LEVEL_INFO: Record<LevelKey, { label: string; color: string; rgb: string }> = {
  baja: { label: 'Bajo', color: '#22c55e', rgb: '34, 197, 94' },
  moderada: { label: 'Moderado', color: '#f59e0b', rgb: '245, 158, 11' },
  alta: { label: 'Elevado', color: '#ef4444', rgb: '239, 68, 68' },
};

export const overallLevel = (scores: { stress: number; anxiety: number; depression: number }): LevelKey => {
  const max = Math.max(scores.stress, scores.anxiety, scores.depression);
  return levelOf(max);
};

export const isCrisisLevel = (scores: { stress: number; anxiety: number; depression: number }): boolean =>
  overallLevel(scores) === 'alta';

// ---- API ----

export const getMyAssessments = async (): Promise<AssessmentRecord[]> => {
  try {
    return await apiGet<AssessmentRecord[]>(BASE);
  } catch {
    return [];
  }
};

export interface SaveAssessmentInput extends AssessmentResult {
  id?: number;
  ai_advice?: string | null;
}

export const saveAssessment = async (data: SaveAssessmentInput): Promise<AssessmentRecord | null> => {
  try {
    await apiMutate(BASE, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    // En línea: revalidamos la caché con el registro real del servidor
    const records = readCache<AssessmentRecord[]>(BASE) ?? [];
    const synth: AssessmentRecord = {
      id: tempId(),
      type: 'bienestar',
      stress: data.stress,
      anxiety: data.anxiety,
      depression: data.depression,
      level: data.level,
      crisis: data.crisis,
      recommendations: data.recommendations,
      ai_advice: data.ai_advice ?? null,
      created_at: new Date().toISOString(),
    };
    records.unshift(synth);
    writeCache(BASE, records);
    return synth;
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) return null;
    const records = readCache<AssessmentRecord[]>(BASE) ?? [];
    const synth: AssessmentRecord = {
      id: tempId(),
      type: 'bienestar',
      stress: data.stress,
      anxiety: data.anxiety,
      depression: data.depression,
      level: data.level,
      crisis: data.crisis,
      recommendations: data.recommendations,
      ai_advice: data.ai_advice ?? null,
      created_at: new Date().toISOString(),
    };
    records.unshift(synth);
    writeCache(BASE, records);
    return synth;
  }
};

export const logCrisisContact = async (
  assessmentId: number | null,
  channel: 'helpline' | 'via',
  detail?: string
): Promise<void> => {
  try {
    await apiMutate(BASE, {
      method: 'POST',
      body: JSON.stringify({ action: 'contact', assessmentId, channel, detail }),
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
  } catch {
    /* best-effort, también se encola offline */
  }
};

// ---- Frecuencia cada 5 días ----

export const ASSESSMENT_INTERVAL_DAYS = 5;

export const daysSinceAssessment = (records: AssessmentRecord[]): number | null => {
  if (!records.length) return null;
  const last = records[0];
  const lastDate = new Date(last.created_at);
  if (Number.isNaN(lastDate.getTime())) return null;
  return Math.floor((Date.now() - lastDate.getTime()) / 86400000);
};

export interface AssessmentDue {
  due: boolean;
  daysLeft: number | null;
  last: AssessmentRecord | null;
}

export const assessmentDueState = (records: AssessmentRecord[]): AssessmentDue => {
  const last = records[0] ?? null;
  const days = daysSinceAssessment(records);
  if (days === null) {
    return { due: true, daysLeft: null, last: null };
  }
  return {
    due: days >= ASSESSMENT_INTERVAL_DAYS,
    daysLeft: Math.max(0, ASSESSMENT_INTERVAL_DAYS - days),
    last,
  };
};