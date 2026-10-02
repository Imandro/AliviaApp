export type ReminderId =
  | 'breathing'
  | 'mood-checkin'
  | 'wellbeing-checkin'
  | 'emotion-journal'
  | 'grounding'
  | 'gratitude'
  | 'sleep-routine'
  | 'hydration'
  | 'gentle-movement'
  | 'screen-break'
  | 'study-break'
  | 'personal-goals'
  | 'daily-challenge'
  | 'wellbeing-game'
  | 'library'
  | 'via-chat'
  | 'support-network'
  | 'mindfulness'
  | 'coping-plan'
  | 'progress-review';

export type ReminderFrequency = 'daily' | 'weekly' | 'interval' | 'once';

export interface ReminderDefinition {
  id: ReminderId;
  title: string;
  body: string;
  path: string;
  defaultTime: string;
  group: 'Bienestar' | 'Hábitos' | 'Herramientas' | 'Conexión';
}

export const REMINDER_CATALOG: ReminderDefinition[] = [
  { id: 'breathing', title: 'Respiración', body: 'Tómate dos minutos para respirar con calma.', path: '/breathe', defaultTime: '20:00', group: 'Herramientas' },
  { id: 'mood-checkin', title: 'Estado de ánimo', body: 'Haz una pausa y nota cómo te sientes hoy.', path: '/explore', defaultTime: '19:00', group: 'Bienestar' },
  { id: 'wellbeing-checkin', title: 'Chequeo de bienestar', body: 'Tu chequeo de bienestar está listo cuando quieras hacerlo.', path: '/assessment', defaultTime: '10:00', group: 'Bienestar' },
  { id: 'emotion-journal', title: 'Diario emocional', body: 'Puedes dedicar unos minutos a escribir cómo va tu día.', path: '/journal', defaultTime: '20:30', group: 'Herramientas' },
  { id: 'grounding', title: 'Grounding', body: 'Prueba volver al presente con un ejercicio breve.', path: '/coping', defaultTime: '15:00', group: 'Herramientas' },
  { id: 'gratitude', title: 'Gratitud', body: 'Recuerda algo pequeño que haya sido importante hoy.', path: '/journal', defaultTime: '20:00', group: 'Bienestar' },
  { id: 'sleep-routine', title: 'Rutina de sueño', body: 'Es momento de empezar a bajar el ritmo antes de dormir.', path: '/breathe', defaultTime: '21:00', group: 'Hábitos' },
  { id: 'hydration', title: 'Hidratación', body: 'Si te hace bien, toma un poco de agua y haz una pausa.', path: '/', defaultTime: '11:00', group: 'Hábitos' },
  { id: 'gentle-movement', title: 'Movimiento suave', body: 'Unos minutos de movimiento amable también cuentan.', path: '/explore', defaultTime: '17:00', group: 'Hábitos' },
  { id: 'screen-break', title: 'Descanso de pantalla', body: 'Aparta la vista de la pantalla y descansa un momento.', path: '/', defaultTime: '15:00', group: 'Hábitos' },
  { id: 'study-break', title: 'Pausa de estudio o trabajo', body: 'Haz una pausa breve antes de continuar.', path: '/breathe', defaultTime: '16:00', group: 'Hábitos' },
  { id: 'personal-goals', title: 'Metas personales', body: 'Revisa con calma un paso pequeño de tus metas.', path: '/plans', defaultTime: '18:00', group: 'Hábitos' },
  { id: 'daily-challenge', title: 'Retos', body: 'Hay un reto breve disponible para ti.', path: '/retos', defaultTime: '12:00', group: 'Herramientas' },
  { id: 'wellbeing-game', title: 'Pausa aburrida', body: 'Haz una tarea sin importancia: frota una moneda o apila bloques.', path: '/games', defaultTime: '17:30', group: 'Herramientas' },
  { id: 'library', title: 'Biblioteca', body: 'Puedes explorar una lectura breve a tu ritmo.', path: '/library', defaultTime: '19:30', group: 'Herramientas' },
  { id: 'via-chat', title: 'Conversar con VIA', body: 'VIA está disponible si quieres conversar.', path: '/chat', defaultTime: '18:30', group: 'Conexión' },
  { id: 'support-network', title: 'Red de apoyo', body: 'Si te ayuda, puedes contactar a alguien de confianza.', path: '/connect', defaultTime: '18:00', group: 'Conexión' },
  { id: 'mindfulness', title: 'Atención plena', body: 'Regálate un momento para notar tu respiración y el presente.', path: '/breathe', defaultTime: '13:00', group: 'Bienestar' },
  { id: 'coping-plan', title: 'Plan de afrontamiento', body: 'Revisa una estrategia que te ayude en este momento.', path: '/coping', defaultTime: '17:00', group: 'Herramientas' },
  { id: 'progress-review', title: 'Revisión de progreso', body: 'Reconoce cualquier paso que hayas dado, por pequeño que sea.', path: '/plans', defaultTime: '20:00', group: 'Bienestar' },
];

export interface ReminderSchedule {
  enabled: boolean;
  time: string;
  frequency: ReminderFrequency;
  daysOfWeek: number[];
  intervalDays: number;
  date: string;
  startDate: string;
}

export interface ReminderPrefs {
  version: 2;
  timezone: string;
  maxPerDay: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: Record<ReminderId, ReminderSchedule>;
}

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const localDate = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  version: 2,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  maxPerDay: 3,
  quietHours: { enabled: true, start: '22:00', end: '08:00' },
  categories: Object.fromEntries(REMINDER_CATALOG.map((item) => [
    item.id,
    {
      enabled: false,
      time: item.defaultTime,
      frequency: item.id === 'wellbeing-checkin' ? 'interval' : 'daily',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      intervalDays: 5,
      date: '',
      startDate: localDate(),
    },
  ])) as Record<ReminderId, ReminderSchedule>,
};

const validTimezone = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 64) return DEFAULT_REMINDER_PREFS.timezone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_REMINDER_PREFS.timezone;
  }
};

export const normalizeReminderPrefs = (value: unknown): ReminderPrefs => {
  const input = value && typeof value === 'object' ? value as Partial<ReminderPrefs> : {};
  const categoriesInput = input.categories && typeof input.categories === 'object'
    ? input.categories as Partial<Record<ReminderId, Partial<ReminderSchedule>>>
    : {};
  const categories = Object.fromEntries(REMINDER_CATALOG.map((definition) => {
    const defaults = DEFAULT_REMINDER_PREFS.categories[definition.id];
    const current = categoriesInput[definition.id] ?? {};
    const frequency: ReminderFrequency = ['daily', 'weekly', 'interval', 'once'].includes(String(current.frequency))
      ? current.frequency as ReminderFrequency
      : defaults.frequency;
    const days = Array.isArray(current.daysOfWeek)
      ? [...new Set(current.daysOfWeek.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))]
      : defaults.daysOfWeek;
    return [definition.id, {
      enabled: current.enabled === true,
      time: isTime(current.time) ? current.time : defaults.time,
      frequency,
      daysOfWeek: days.length > 0 ? days : defaults.daysOfWeek,
      intervalDays: Number.isInteger(current.intervalDays) && current.intervalDays! >= 2 && current.intervalDays! <= 30
        ? current.intervalDays!
        : defaults.intervalDays,
      date: typeof current.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(current.date) ? current.date : '',
      startDate: typeof current.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(current.startDate)
        ? current.startDate
        : defaults.startDate,
    }];
  })) as Record<ReminderId, ReminderSchedule>;

  const quiet = input.quietHours && typeof input.quietHours === 'object' ? input.quietHours : DEFAULT_REMINDER_PREFS.quietHours;
  return {
    version: 2,
    timezone: validTimezone(input.timezone),
    maxPerDay: Number.isInteger(input.maxPerDay) ? Math.max(1, Math.min(10, input.maxPerDay!)) : DEFAULT_REMINDER_PREFS.maxPerDay,
    quietHours: {
      enabled: quiet.enabled !== false,
      start: isTime(quiet.start) ? quiet.start : DEFAULT_REMINDER_PREFS.quietHours.start,
      end: isTime(quiet.end) ? quiet.end : DEFAULT_REMINDER_PREFS.quietHours.end,
    },
    categories,
  };
};

export const mergeReminderPrefs = (
  current: ReminderPrefs,
  patch: Partial<ReminderPrefs>,
): ReminderPrefs => normalizeReminderPrefs({
  ...current,
  ...patch,
  quietHours: patch.quietHours ? { ...current.quietHours, ...patch.quietHours } : current.quietHours,
  categories: patch.categories ? { ...current.categories, ...patch.categories } : current.categories,
});

export const shouldReminderFire = (
  schedule: ReminderSchedule,
  localDateValue: string,
  weekday: number,
): boolean => {
  if (!schedule.enabled) return false;
  if (schedule.frequency === 'daily') return true;
  if (schedule.frequency === 'weekly') return schedule.daysOfWeek.includes(weekday);
  if (schedule.frequency === 'once') return schedule.date === localDateValue;
  const start = new Date(`${schedule.startDate}T00:00:00Z`).getTime();
  const today = new Date(`${localDateValue}T00:00:00Z`).getTime();
  const daysSinceStart = Math.floor((today - start) / 86400000);
  return daysSinceStart >= 0 && daysSinceStart % schedule.intervalDays === 0;
};
