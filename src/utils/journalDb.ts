import { analyzeJournalEntry, JournalAnalysis } from './aiProvider';

export interface JournalRecord extends JournalAnalysis {
  date: string;
}

export interface JournalInsights {
  count: number;
  valence: number;
  dominantTopics: string[];
  recentEmotion: string | null;
  crisisCount: number;
}

const KEY = 'alivia-journal-v1';
const MAX_ENTRIES = 120;

const readAll = (): JournalRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveJournalEntry = (text: string): JournalRecord => {
  const analysis = analyzeJournalEntry(text);
  const record: JournalRecord = { ...analysis, date: new Date().toISOString() };
  try {
    const all = readAll();
    all.push(record);
    localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX_ENTRIES)));
  } catch {
    /* noop */
  }
  return record;
};

/** Todas las entradas (para exportación de datos del usuario). */
export const getAllJournalEntries = (): JournalRecord[] => readAll();

export const getJournalInsights = (): JournalInsights => {
  const all = readAll();
  if (all.length === 0) {
    return { count: 0, valence: 0, dominantTopics: [], recentEmotion: null, crisisCount: 0 };
  }
  const recent = all.slice(-7);
  const valence = recent.reduce((acc, r) => acc + r.valence, 0) / recent.length;
  const freq: Record<string, number> = {};
  for (const r of all) {
    for (const t of r.topics) {
      freq[t] = (freq[t] || 0) + 1;
    }
  }
  const dominantTopics = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);
  return {
    count: all.length,
    valence,
    dominantTopics,
    recentEmotion: all[all.length - 1].emotion,
    crisisCount: all.filter((r) => r.crisis).length,
  };
};

export const journalSummaryForPrompt = (): string => {
  const s = getJournalInsights();
  if (s.count === 0) return '';
  const mood = s.valence < -0.4 ? 'un momento difícil' : s.valence > 0.3 ? 'un tono positivo' : 'un momento mixto';
  const topics = s.dominantTopics.length ? s.dominantTopics.join(', ') : 'nada en especial';
  let summary =
    `Datos de su diario de desahogo: ha escrito ${s.count} veces; última semana ${mood}; ` +
    `última emoción registrada: ${s.recentEmotion ?? '—'}; temas frecuentes: ${topics}.`;
  if (s.crisisCount > 0) {
    summary += ` Ha registrado ${s.crisisCount} entradas críticas: cuida su bienestar con especial atención y calidez.`;
  }
  return summary;
};
