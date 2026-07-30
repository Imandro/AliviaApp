/* ----------------------------------------------------
   ALIVIA - BASE DE DATOS LOCAL (localStorage)
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

// Obtener la fecha de hoy en formato local YYYY-MM-DD sin problemas de huso horario
export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Guardar o actualizar el estado de ánimo de hoy
export const saveTodayMood = (score: number, note?: string): MoodEntry[] => {
  const history = getMoodHistory();
  const today = getTodayString();
  
  const existingIndex = history.findIndex(entry => entry.date === today);
  
  if (existingIndex >= 0) {
    history[existingIndex] = { date: today, score, note };
  } else {
    history.push({ date: today, score, note });
  }
  
  // Guardar ordenado por fecha
  history.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('alivia_mood_history', JSON.stringify(history));
  return history;
};

// Obtener todo el historial de ánimo
export const getMoodHistory = (): MoodEntry[] => {
  const data = localStorage.getItem('alivia_mood_history');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

// Obtener los ánimos de los últimos 7 días (para el grid semanal de Apple)
export const getLastWeekMoods = (): { date: string; dayName: string; score: number | null }[] => {
  const history = getMoodHistory();
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
export const getEmergencyContact = (): EmergencyContact | null => {
  const data = localStorage.getItem('alivia_emergency_contact');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

// Guardar contacto de emergencia
export const saveEmergencyContact = (name: string, phone: string): void => {
  localStorage.setItem('alivia_emergency_contact', JSON.stringify({ name, phone }));
};

// Historial de Actividades Completadas
export interface CompletedActivity {
  id: string;
  title: string;
  completedAt: string; // ISO timestamp
  date: string; // YYYY-MM-DD
}

export const getCompletedActivities = (): CompletedActivity[] => {
  const data = localStorage.getItem('alivia_completed_activities');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveCompletedActivity = (id: string, title: string): CompletedActivity[] => {
  const activities = getCompletedActivities();
  const today = getTodayString();
  
  // Evitar duplicados del mismo día para la misma actividad
  const existingToday = activities.find(a => a.id === id && a.date === today);
  if (existingToday) return activities;
  
  const newActivity: CompletedActivity = {
    id,
    title,
    completedAt: new Date().toISOString(),
    date: today
  };
  
  activities.push(newActivity);
  localStorage.setItem('alivia_completed_activities', JSON.stringify(activities));
  return activities;
};

// Calcular streak de días consecutivos
export const getCompletionStreak = (): number => {
  const activities = getCompletedActivities();
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
export const getActivityStats = (): { [id: string]: number } => {
  const activities = getCompletedActivities();
  const stats: { [id: string]: number } = {};
  activities.forEach(a => {
    stats[a.id] = (stats[a.id] || 0) + 1;
  });
  return stats;
};
