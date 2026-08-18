/* ----------------------------------------------------
   ALIVIA - REGISTRO DE RETOS DIARIOS
   Historial de misiones completadas, racha y semana.
   Guardado local (mismo patrón que el progreso de guías).
   ---------------------------------------------------- */

import { getTodayString } from './localDb';

export interface ChallengeRecord {
  date: string; // YYYY-MM-DD
  luchaId: string;
  retoId: string;
  title: string;
  completedAt: string; // ISO timestamp
}

const KEY = 'alivia-retos-log';
const MAX_RECORDS = 90;

export const getChallengeLog = (): ChallengeRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* sin historial previo */
  }
  return [];
};

export const addChallengeRecord = (record: ChallengeRecord): ChallengeRecord[] => {
  const log = [...getChallengeLog(), record].slice(-MAX_RECORDS);
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* noop */
  }
  return log;
};

export const isDoneOn = (log: ChallengeRecord[], date: string): boolean =>
  log.some((r) => r.date === date);

export const getRecordOn = (log: ChallengeRecord[], date: string): ChallengeRecord | undefined =>
  log.find((r) => r.date === date);

// Días consecutivos con reto completado (cuenta hoy, o desde ayer si hoy aún no)
export const getChallengeStreak = (log: ChallengeRecord[], today?: string): number => {
  const todayStr = today ?? getTodayString();
  const dates = [...new Set(log.map((r) => r.date))].sort().reverse();
  let streak = 0;
  let offset = isDoneOn(log, todayStr) ? 0 : 1;
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - offset - i);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dates[i] === expected) streak++;
    else break;
  }
  return streak;
};

// Últimos 7 días con estado completado/no, para el calendario semanal
export const getWeekChallenges = (
  log: ChallengeRecord[],
): { date: string; dayName: string; done: boolean; title?: string }[] => {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const record = getRecordOn(log, dateStr);
    result.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      done: Boolean(record),
      title: record?.title,
    });
  }
  return result;
};