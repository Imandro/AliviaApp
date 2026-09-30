import { REMINDER_CATALOG, shouldReminderFire, type ReminderPrefs } from '../../src/utils/reminderCatalog.js';

interface LocalParts {
  date: string;
  weekday: number;
  hour: number;
  minute: number;
}

const localParts = (date: Date, timezone: string): LocalParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: Math.max(0, weekday),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
};

const addLocalDays = (date: string, amount: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
};

const timeMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const quietAdjustedTime = (time: string, prefs: ReminderPrefs): { time: string; dayOffset: number } => {
  if (!prefs.quietHours.enabled) return { time, dayOffset: 0 };
  const value = timeMinutes(time);
  const start = timeMinutes(prefs.quietHours.start);
  const end = timeMinutes(prefs.quietHours.end);
  const crossesMidnight = start > end;
  const isQuiet = start !== end && (crossesMidnight
    ? value >= start || value < end
    : value >= start && value < end);
  if (!isQuiet) return { time, dayOffset: 0 };
  const dayOffset = crossesMidnight && value >= start ? 1 : 0;
  return { time: prefs.quietHours.end, dayOffset };
};

export interface DueReminder {
  id: string;
  title: string;
  body: string;
  path: string;
  localDate: string;
}

export const findDueReminders = (
  prefs: ReminderPrefs,
  now = new Date(),
  lateWindowMinutes = 15,
): DueReminder[] => {
  const nowParts = localParts(now, prefs.timezone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const due: DueReminder[] = [];

  for (const definition of REMINDER_CATALOG) {
    const schedule = prefs.categories[definition.id];
    if (!schedule.enabled) continue;
    for (const scheduleDate of [nowParts.date, addLocalDays(nowParts.date, -1)]) {
      const weekday = new Date(`${scheduleDate}T00:00:00Z`).getUTCDay();
      if (!shouldReminderFire(schedule, scheduleDate, weekday)) continue;

      const adjusted = quietAdjustedTime(schedule.time, prefs);
      const deliveryDate = addLocalDays(scheduleDate, adjusted.dayOffset);
      if (deliveryDate !== nowParts.date) continue;
      const deliveryMinutes = timeMinutes(adjusted.time);
      const delay = nowMinutes - deliveryMinutes;
      const allowedDelay = schedule.frequency === 'once' ? 24 * 60 : lateWindowMinutes;
      if (delay < 0 || delay >= allowedDelay) continue;
      due.push({ ...definition, localDate: deliveryDate });
      break;
    }
  }
  return due;
};
