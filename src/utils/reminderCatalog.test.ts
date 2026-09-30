import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_PREFS,
  normalizeReminderPrefs,
  REMINDER_CATALOG,
  shouldReminderFire,
} from './reminderCatalog';
import { findDueReminders } from '../../api/notifications/_scheduler';

describe('reminder catalog and schedules', () => {
  it('contains at least 20 distinct reminder categories, disabled by default', () => {
    expect(REMINDER_CATALOG).toHaveLength(20);
    expect(new Set(REMINDER_CATALOG.map(({ id }) => id)).size).toBe(20);
    expect(REMINDER_CATALOG.every(({ id }) => !DEFAULT_REMINDER_PREFS.categories[id].enabled)).toBe(true);
  });

  it('normalizes invalid schedule values and clamps the daily limit', () => {
    const prefs = normalizeReminderPrefs({
      ...DEFAULT_REMINDER_PREFS,
      maxPerDay: 99,
      categories: {
        breathing: { enabled: true, time: '25:80', frequency: 'weekly', daysOfWeek: [1, 9] },
      },
    });
    expect(prefs.maxPerDay).toBe(10);
    expect(prefs.categories.breathing.time).toBe('20:00');
    expect(prefs.categories.breathing.daysOfWeek).toEqual([1]);
  });

  it('matches daily, selected weekday, interval and one-time schedules', () => {
    const schedule = DEFAULT_REMINDER_PREFS.categories.breathing;
    expect(shouldReminderFire({ ...schedule, enabled: true, frequency: 'daily' }, '2026-09-28', 1)).toBe(true);
    expect(shouldReminderFire({ ...schedule, enabled: true, frequency: 'weekly', daysOfWeek: [1] }, '2026-09-28', 1)).toBe(true);
    expect(shouldReminderFire({ ...schedule, enabled: true, frequency: 'interval', startDate: '2026-09-23', intervalDays: 5 }, '2026-09-28', 1)).toBe(true);
    expect(shouldReminderFire({ ...schedule, enabled: true, frequency: 'once', date: '2026-09-28' }, '2026-09-28', 1)).toBe(true);
  });

  it('defers a daily reminder from overnight quiet hours until the quiet period ends', () => {
    const prefs = normalizeReminderPrefs({
      ...DEFAULT_REMINDER_PREFS,
      timezone: 'UTC',
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
      categories: {
        ...DEFAULT_REMINDER_PREFS.categories,
        breathing: {
          ...DEFAULT_REMINDER_PREFS.categories.breathing,
          enabled: true,
          time: '23:00',
          frequency: 'daily',
        },
      },
    });
    const due = findDueReminders(prefs, new Date('2026-09-29T08:05:00Z'));
    expect(due.map(({ id }) => id)).toContain('breathing');
  });

  it('respects the selected weekday in the user timezone', () => {
    const prefs = normalizeReminderPrefs({
      ...DEFAULT_REMINDER_PREFS,
      timezone: 'UTC',
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      categories: {
        ...DEFAULT_REMINDER_PREFS.categories,
        breathing: {
          ...DEFAULT_REMINDER_PREFS.categories.breathing,
          enabled: true,
          time: '20:00',
          frequency: 'weekly',
          daysOfWeek: [1],
        },
      },
    });
    expect(findDueReminders(prefs, new Date('2026-09-28T20:00:00Z')).map(({ id }) => id)).toContain('breathing');
    expect(findDueReminders(prefs, new Date('2026-09-29T20:00:00Z')).map(({ id }) => id)).not.toContain('breathing');
  });
});
