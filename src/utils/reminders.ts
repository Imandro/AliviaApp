/* ----------------------------------------------------
   ALIVIA - RECORDATORIOS LOCALES
   - Respiración diaria a la hora que elija el usuario.
   - Aviso de chequeo de bienestar pendiente (cada 5 días).
   Todo se programa en el dispositivo: funciona sin servidor
   y sobrevive sin conexión.
   ---------------------------------------------------- */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const PREFS_KEY = 'alivia_reminder_prefs';
const CHANNEL_ID = 'alivia-recordatorios';
const DAILY_ID = 2001;
const CHECKIN_ID = 2002;

export interface ReminderPrefs {
  /** Recordatorio diario de respiración. */
  dailyEnabled: boolean;
  dailyHour: number; // 0-23
  dailyMinute: number; // 0-59
  /** Aviso cuando el chequeo de bienestar cumple 5 días. */
  checkinEnabled: boolean;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  dailyEnabled: false,
  dailyHour: 20,
  dailyMinute: 0,
  checkinEnabled: true,
};

export const getReminderPrefs = (): ReminderPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_PREFS };
    return { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return { ...DEFAULT_REMINDER_PREFS };
  }
};

export const saveReminderPrefs = (patch: Partial<ReminderPrefs>): ReminderPrefs => {
  const next = { ...getReminderPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
};

const isNative = (): boolean => Capacitor.isNativePlatform();

const ensurePermission = async (): Promise<boolean> => {
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
};

const registerChannel = async (): Promise<void> => {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Recordatorios',
      description: 'Recordatorios suaves de respiración y chequeo',
      importance: 3,
      visibility: 0,
    });
  } catch {
    /* el canal puede existir ya */
  }
};

/** Programa/cancela según preferencias. Llamar al iniciar y tras cada cambio. */
export const applyDailyReminder = async (prefs = getReminderPrefs()): Promise<void> => {
  if (!isNative()) return;
  await registerChannel();
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] });
  } catch {
    /* nada que cancelar */
  }
  if (!prefs.dailyEnabled) return;
  if (!(await ensurePermission())) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_ID,
        channelId: CHANNEL_ID,
        title: 'Un momento para respirar',
        body: 'Dos minutos de calma te están esperando. Tu espacio sigue aquí.',
        schedule: {
          on: { hour: prefs.dailyHour, minute: prefs.dailyMinute },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ],
  });
};

/**
 * Programa el aviso de chequeo para 5 días después del último registro.
 * Si ya venció, avisa a la mañana siguiente a las 10:00.
 * `lastCreatedAt`: ISO del último chequeo o null si nunca ha hecho uno.
 */
export const syncCheckInReminder = async (
  prefs: ReminderPrefs,
  lastCreatedAt: string | null
): Promise<void> => {
  if (!isNative()) return;
  await registerChannel();
  try {
    await LocalNotifications.cancel({ notifications: [{ id: CHECKIN_ID }] });
  } catch {
    /* nada que cancelar */
  }
  if (!prefs.checkinEnabled) return;
  if (!(await ensurePermission())) return;

  const base = lastCreatedAt ? new Date(lastCreatedAt) : null;
  const due = base ? new Date(base.getTime() + 5 * 86400000) : new Date();
  const now = new Date();
  const fire = new Date(due);
  fire.setHours(10, 0, 0, 0);
  if (fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + Math.max(1, Math.ceil((now.getTime() - fire.getTime()) / 86400000)));
    // Garantiza que sea al menos mañana a las 10:00
    const min = new Date(now);
    min.setDate(min.getDate() + 1);
    min.setHours(10, 0, 0, 0);
    if (fire.getTime() < min.getTime()) fire.setTime(min.getTime());
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: CHECKIN_ID,
        channelId: CHANNEL_ID,
        title: '¿Cómo vienen tus días?',
        body: 'Tu chequeo de bienestar está listo: 2 minutos para medir estrés, ansiedad y ánimo.',
        schedule: {
          on: {
            year: fire.getFullYear(),
            month: fire.getMonth() + 1,
            day: fire.getDate(),
            hour: 10,
            minute: 0,
          },
          allowWhileIdle: true,
        },
      },
    ],
  });
};
