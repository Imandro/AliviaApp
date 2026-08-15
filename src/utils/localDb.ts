/* ----------------------------------------------------
   ALIVIA - BASE DE DATOS (Neon PostgreSQL vía API)
   Gestión de historial emocional y contactos seguros
   ---------------------------------------------------- */

export interface MoodEntry {
  date: string; // Formato YYYY-MM-DD
  score: number; // 1 (Muy mal) a 5 (Excelente)
  note?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface CompletedActivity {
  id: string;
  title: string;
  completedAt: string; // ISO timestamp
  date: string; // YYYY-MM-DD
}

const BASE = '/api';

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Error ${res.status} en ${path}`);
  }
  return res.json() as Promise<T>;
};

// Obtener la fecha de hoy en formato local YYYY-MM-DD sin problemas de huso horario
export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Guardar o actualizar el estado de ánimo de hoy
export const saveTodayMood = async (score: number, note?: string): Promise<MoodEntry[]> => {
  const today = getTodayString();
  await request('/moods', {
    method: 'POST',
    body: JSON.stringify({ date: today, score, note }),
  });
  return getMoodHistory();
};

// Obtener todo el historial de ánimo
export const getMoodHistory = async (): Promise<MoodEntry[]> => {
  return request<MoodEntry[]>('/moods');
};

// Obtener los ánimos de los últimos 7 días (para el grid semanal de Apple)
export const getLastWeekMoods = async (): Promise<{ date: string; dayName: string; score: number | null }[]> => {
  let history: MoodEntry[] = [];
  try {
    history = await getMoodHistory();
  } catch (e) {
    history = [];
  }
  const result = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayName = dayNames[d.getDay()];

    const matchedEntry = history.find(entry => entry.date === dateStr);

    result.push({
      date: dateStr,
      dayName,
      score: matchedEntry ? matchedEntry.score : null
    });
  }

  return result;
};

// Obtener contacto de emergencia
export const getEmergencyContact = async (): Promise<EmergencyContact | null> => {
  try {
    return await request<EmergencyContact | null>('/contacts');
  } catch (e) {
    return null;
  }
};

// Guardar contacto de emergencia
export const saveEmergencyContact = async (name: string, phone: string): Promise<void> => {
  await request('/contacts', {
    method: 'PUT',
    body: JSON.stringify({ name, phone }),
  });
};

// Eliminar contacto de emergencia
export const deleteEmergencyContact = async (): Promise<void> => {
  await request('/contacts', { method: 'DELETE' });
};

// Historial de Actividades Completadas
export const getCompletedActivities = async (): Promise<CompletedActivity[]> => {
  try {
    return await request<CompletedActivity[]>('/activities');
  } catch (e) {
    return [];
  }
};

export const saveCompletedActivity = async (id: string, title: string): Promise<CompletedActivity[]> => {
  await request('/activities', {
    method: 'POST',
    body: JSON.stringify({ id, title }),
  });
  return getCompletedActivities();
};

// Calcular streak de días consecutivos
export const getCompletionStreak = async (): Promise<number> => {
  const activities = await getCompletedActivities();
  if (activities.length === 0) return 0;

  const dates = [...new Set(activities.map(a => a.date))].sort().reverse();
  const today = getTodayString();

  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// Estadísticas por tipo de actividad
export const getActivityStats = async (): Promise<{ [id: string]: number }> => {
  const activities = await getCompletedActivities();
  const stats: { [id: string]: number } = {};
  activities.forEach(a => {
    stats[a.id] = (stats[a.id] || 0) + 1;
  });
  return stats;
};
