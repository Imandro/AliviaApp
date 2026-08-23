/* ----------------------------------------------------
   ALIVIA - BASE DE DATOS (Neon PostgreSQL vía API)
   Offline-first: lecturas con caché local y escrituras
   encoladas que se sincronizan al reconectar.
   ---------------------------------------------------- */

import {
  apiGet,
  apiMutate,
  readCache,
  writeCache,
  OfflineQueuedError,
} from './apiClient';

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

const P_MOODS = '/api/moods';
const P_CONTACTS = '/api/contacts';
const P_ACTIVITIES = '/api/activities';
const P_POSTS = '/api/posts';
const P_PLANS = '/api/plans';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('alivia_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Obtener la fecha de hoy en formato local YYYY-MM-DD sin problemas de huso horario
export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tempId = (): number => -(Date.now() % 100000000) - Math.floor(Math.random() * 999);

// Guardar o actualizar el estado de ánimo de hoy
export const saveTodayMood = async (score: number, note?: string): Promise<MoodEntry[]> => {
  const today = getTodayString();
  try {
    await apiMutate(P_MOODS, {
      method: 'POST',
      body: JSON.stringify({ date: today, score, note }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  // Actualización optimista en caché (online u offline)
  const history = readCache<MoodEntry[]>(P_MOODS) ?? [];
  const idx = history.findIndex((m) => m.date === today);
  if (idx >= 0) history[idx] = { date: today, score, note };
  else history.push({ date: today, score, note });
  writeCache(P_MOODS, history);
  return history;
};

// Obtener todo el historial de ánimo
export const getMoodHistory = async (): Promise<MoodEntry[]> => {
  return apiGet<MoodEntry[]>(P_MOODS);
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
    return await apiGet<EmergencyContact | null>(P_CONTACTS);
  } catch (e) {
    return null;
  }
};

// Guardar contacto de emergencia
export const saveEmergencyContact = async (name: string, phone: string): Promise<void> => {
  try {
    await apiMutate(P_CONTACTS, {
      method: 'PUT',
      body: JSON.stringify({ name, phone }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  writeCache(P_CONTACTS, { name, phone });
};

// Eliminar contacto de emergencia
export const deleteEmergencyContact = async (): Promise<void> => {
  try {
    await apiMutate(P_CONTACTS, { method: 'DELETE', headers: authHeaders() });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  writeCache(P_CONTACTS, null);
};

// Historial de Actividades Completadas
export const getCompletedActivities = async (): Promise<CompletedActivity[]> => {
  try {
    return await apiGet<CompletedActivity[]>(P_ACTIVITIES);
  } catch (e) {
    return [];
  }
};

export const saveCompletedActivity = async (id: string, title: string): Promise<CompletedActivity[]> => {
  try {
    await apiMutate(P_ACTIVITIES, {
      method: 'POST',
      body: JSON.stringify({ id, title }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  const list = readCache<CompletedActivity[]>(P_ACTIVITIES) ?? [];
  list.push({ id, title, completedAt: new Date().toISOString(), date: getTodayString() });
  writeCache(P_ACTIVITIES, list);
  return list;
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

// -------------------- COMUNIDAD GLOBAL --------------------

export interface CommunityPost {
  id: number;
  author: string;
  content: string;
  topic: string;
  likes: number;
  created_at: string;
}

export const postsPath = (topic?: string): string =>
  topic && topic !== 'todos' ? `${P_POSTS}?topic=${encodeURIComponent(topic)}` : P_POSTS;

export const getPosts = async (topic?: string): Promise<CommunityPost[]> => {
  try {
    return await apiGet<CommunityPost[]>(postsPath(topic));
  } catch (e) {
    return [];
  }
};

const injectPostIntoCaches = (post: CommunityPost): void => {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('alivia_cache:' + P_POSTS)) continue;
    const path = key.slice('alivia_cache:'.length);
    const qsTopic = path.includes('topic=') ? decodeURIComponent(path.split('topic=')[1]) : 'todos';
    if (qsTopic !== 'todos' && post.topic !== qsTopic) continue;
    const list = readCache<CommunityPost[]>(path) ?? [];
    list.unshift(post);
    writeCache(path, list);
  }
};

export const createPost = async (content: string, topic: string, author: string): Promise<CommunityPost> => {
  try {
    await apiMutate(P_POSTS, {
      method: 'POST',
      body: JSON.stringify({ content, topic, author }),
      headers: authHeaders(),
    });
    // En línea el servidor responde con el post real; lo sintetizamos igual para la caché
    const post: CommunityPost = { id: tempId(), author, content, topic, likes: 0, created_at: new Date().toISOString() };
    injectPostIntoCaches(post);
    return post;
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
    const post: CommunityPost = { id: tempId(), author, content, topic, likes: 0, created_at: new Date().toISOString() };
    injectPostIntoCaches(post);
    return post;
  }
};

export const likePost = async (postId: number): Promise<void> => {
  try {
    await apiMutate(`${P_POSTS}/like?postId=${postId}`, { method: 'POST', headers: authHeaders() });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('alivia_cache:' + P_POSTS)) continue;
      const path = key.slice('alivia_cache:'.length);
      const list = readCache<CommunityPost[]>(path) ?? [];
      const p = list.find((x) => x.id === postId);
      if (p) p.likes += 1;
      writeCache(path, list);
    }
  }
};

// -------------------- PLANES DE PROGRESO --------------------

export interface PlanGoal {
  id: number;
  title: string;
  done: boolean;
}

export interface Plan {
  id: number;
  title: string;
  area: string;
  created_at: string;
  goals: PlanGoal[];
}

const mutatePlansCache = (fn: (plans: Plan[]) => boolean): void => {
  const plans = readCache<Plan[]>(P_PLANS);
  if (!plans) return;
  if (fn(plans)) writeCache(P_PLANS, plans);
};

export const getPlans = async (): Promise<Plan[]> => {
  try {
    return await apiGet<Plan[]>(P_PLANS);
  } catch (e) {
    return [];
  }
};

export const createPlan = async (title: string, area: string): Promise<Plan> => {
  try {
    await apiMutate(P_PLANS, {
      method: 'POST',
      body: JSON.stringify({ title, area }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  const plan: Plan = { id: tempId(), title, area, created_at: new Date().toISOString(), goals: [] };
  const plans = readCache<Plan[]>(P_PLANS) ?? [];
  plans.unshift(plan);
  writeCache(P_PLANS, plans);
  return plan;
};

export const deletePlan = async (planId: number): Promise<void> => {
  try {
    await apiMutate(`${P_PLANS}?planId=${planId}`, { method: 'DELETE', headers: authHeaders() });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  mutatePlansCache((plans) => {
    const idx = plans.findIndex((p) => p.id === planId);
    if (idx < 0) return false;
    plans.splice(idx, 1);
    return true;
  });
};

export const addPlanGoal = async (planId: number, goalTitle: string): Promise<PlanGoal> => {
  try {
    await apiMutate(`${P_PLANS}?planId=${planId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'add_goal', goalTitle }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  const goal: PlanGoal = { id: tempId(), title: goalTitle, done: false };
  mutatePlansCache((plans) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return false;
    plan.goals.push(goal);
    return true;
  });
  return goal;
};

export const togglePlanGoal = async (planId: number, goalId: number): Promise<void> => {
  try {
    await apiMutate(`${P_PLANS}?planId=${planId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'toggle_goal', goalId }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  mutatePlansCache((plans) => {
    const goal = plans.find((p) => p.id === planId)?.goals.find((g) => g.id === goalId);
    if (!goal) return false;
    goal.done = !goal.done;
    return true;
  });
};

export const deletePlanGoal = async (planId: number, goalId: number): Promise<void> => {
  try {
    await apiMutate(`${P_PLANS}?planId=${planId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'delete_goal', goalId }),
      headers: authHeaders(),
    });
  } catch (e) {
    if (!(e instanceof OfflineQueuedError)) throw e;
  }
  mutatePlansCache((plans) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return false;
    const idx = plan.goals.findIndex((g) => g.id === goalId);
    if (idx < 0) return false;
    plan.goals.splice(idx, 1);
    return true;
  });
};
