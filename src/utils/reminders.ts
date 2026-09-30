import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { API_BASE } from './apiBase';
import { getToken } from './auth';
import { callNative, hasNativeBridge } from './nativeBridge';
import {
  DEFAULT_REMINDER_PREFS,
  mergeReminderPrefs,
  normalizeReminderPrefs,
  REMINDER_CATALOG,
  shouldReminderFire,
  type ReminderId,
  type ReminderPrefs,
} from './reminderCatalog';

const PREFS_KEY = 'alivia_notification_prefs_v2';
const LEGACY_PREFS_KEY = 'alivia_reminder_prefs';
const CHANNEL_ID = 'alivia-recordatorios';
const NATIVE_ID_BASE = 3000;
const ANDROID_HORIZON_DAYS = 90;
const IOS_HORIZON_DAYS = 20;

export {
  DEFAULT_REMINDER_PREFS,
  REMINDER_CATALOG,
  type ReminderId,
  type ReminderPrefs,
} from './reminderCatalog';

const readLegacyPrefs = (): ReminderPrefs => {
  const migrated = normalizeReminderPrefs(DEFAULT_REMINDER_PREFS);
  try {
    const raw = localStorage.getItem(LEGACY_PREFS_KEY);
    if (!raw) {
      migrated.categories['wellbeing-checkin'].enabled = true;
      return migrated;
    }
    const legacy = JSON.parse(raw) as {
      dailyEnabled?: boolean;
      dailyHour?: number;
      dailyMinute?: number;
      checkinEnabled?: boolean;
    };
    const time = `${String(legacy.dailyHour ?? 20).padStart(2, '0')}:${String(legacy.dailyMinute ?? 0).padStart(2, '0')}`;
    migrated.categories.breathing = {
      ...migrated.categories.breathing,
      enabled: legacy.dailyEnabled === true,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '20:00',
    };
    migrated.categories['wellbeing-checkin'].enabled = legacy.checkinEnabled !== false;
    return migrated;
  } catch {
    return migrated;
  }
};

export const getReminderPrefs = (): ReminderPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const saved = normalizeReminderPrefs(JSON.parse(raw));
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return timezone && timezone !== saved.timezone
        ? saveReminderPrefs({ ...saved, timezone })
        : saved;
    }
  } catch {
    // Use the legacy migration or safe defaults if stored data is invalid.
  }
  const migrated = readLegacyPrefs();
  saveReminderPrefs(migrated);
  return migrated;
};

export const saveReminderPrefs = (
  prefs: ReminderPrefs,
): ReminderPrefs => {
  const next = normalizeReminderPrefs(prefs);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    throw new Error('No se pudieron guardar los recordatorios en este dispositivo.');
  }
  return next;
};

export const patchReminderPrefs = (patch: Partial<ReminderPrefs>): ReminderPrefs =>
  saveReminderPrefs(mergeReminderPrefs(getReminderPrefs(), patch));

const isNative = (): boolean => Capacitor.isNativePlatform() || hasNativeBridge();
const hasEnabledReminders = (prefs: ReminderPrefs): boolean =>
  REMINDER_CATALOG.some(({ id }) => prefs.categories[id].enabled);

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    if (response.status === 404 && path.startsWith('/api/notifications/')) {
      throw new Error('El servidor publicado todavía no tiene las funciones push. Despliega la rama que incluye las notificaciones en Vercel.');
    }
    throw new Error(result?.error || `No se pudo sincronizar (${response.status}).`);
  }
  return response.json() as Promise<T>;
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const savePushSubscription = async (subscription: PushSubscription): Promise<void> => {
  await requestJson('/api/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
};

const removePushSubscription = async (subscription: PushSubscription): Promise<void> => {
  await requestJson('/api/notifications/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
};

const ensureWebPushSubscription = async (requestPermission: boolean): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Este navegador no admite notificaciones push. Instala la PWA o usa la APK.');
  }
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('Falta configurar la clave pública VAPID para las notificaciones web.');
  let permission = Notification.permission;
  if (permission !== 'granted' && requestPermission) permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromBase64Url(vapidKey) as BufferSource,
    });
  }
  await savePushSubscription(subscription);
  return true;
};

const permissionGranted = async (ask: boolean): Promise<boolean> => {
  if (hasNativeBridge()) {
    const current = await callNative('notifications.checkPermissions') as { display?: string };
    if (current.display === 'granted') return true;
    if (!ask) return false;
    const requested = await callNative('notifications.requestPermissions') as { display?: string };
    return requested.display === 'granted';
  }
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  if (!ask) return false;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
};

const getNativeId = (index: number, slot: number): number => NATIVE_ID_BASE + index * 100 + slot;
const allNativeIds = (): number[] =>
  [
    2001,
    2002,
    ...REMINDER_CATALOG.flatMap((_, index) =>
      Array.from({ length: 100 }, (_unused, slot) => getNativeId(index, slot))),
  ];

const localDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const quietAdjustedTime = (time: string, prefs: ReminderPrefs): { time: string; dayOffset: number } => {
  if (!prefs.quietHours.enabled) return { time, dayOffset: 0 };
  const [hour, minute] = time.split(':').map(Number);
  const [startHour, startMinute] = prefs.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = prefs.quietHours.end.split(':').map(Number);
  const value = hour * 60 + minute;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const quiet = start === end || (start < end ? value >= start && value < end : value >= start || value < end);
  const activeQuiet = start !== end && quiet;
  const dayOffset = activeQuiet && start > end && value >= start ? 1 : 0;
  return { time: activeQuiet ? prefs.quietHours.end : time, dayOffset };
};

const nativeNotifications = (prefs: ReminderPrefs): LocalNotificationSchema[] => {
  const now = new Date();
  const candidates: Array<{
    index: number;
    slot: number;
    date: string;
    time: string;
    at: Date;
    title: string;
    body: string;
    path: string;
    category: ReminderId;
  }> = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const horizon = Capacitor.getPlatform() === 'ios' || hasNativeBridge()
    ? IOS_HORIZON_DAYS
    : ANDROID_HORIZON_DAYS;
  for (let offset = 0; offset < horizon; offset++) {
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + offset);
    const date = localDate(scheduledDate);
    for (let index = 0; index < REMINDER_CATALOG.length; index++) {
      const definition = REMINDER_CATALOG[index];
      const schedule = prefs.categories[definition.id];
      if (!schedule.enabled) continue;
      const shouldFire = schedule.frequency === 'once'
        ? schedule.date === date
        : shouldReminderFire(schedule, date, scheduledDate.getDay());
      if (!shouldFire) continue;

      const adjusted = quietAdjustedTime(schedule.time, prefs);
      const deliveryDate = new Date(scheduledDate);
      deliveryDate.setDate(deliveryDate.getDate() + adjusted.dayOffset);
      const [hour, minute] = adjusted.time.split(':').map(Number);
      const at = new Date(
        deliveryDate.getFullYear(),
        deliveryDate.getMonth(),
        deliveryDate.getDate(),
        hour,
        minute,
        0,
        0,
      );
      if (at.getTime() <= now.getTime()) continue;
      candidates.push({
        index,
        slot: offset,
        date: localDate(deliveryDate),
        time: adjusted.time,
        at,
        title: definition.title,
        body: definition.body,
        path: definition.path,
        category: definition.id,
      });
    }
  }

  const byDate = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const daily = byDate.get(candidate.date) ?? [];
    daily.push(candidate);
    byDate.set(candidate.date, daily);
  }
  const notifications: LocalNotificationSchema[] = [];
  for (const [date, daily] of byDate) {
    daily.sort((a, b) => a.at.getTime() - b.at.getTime());
    daily.slice(0, prefs.maxPerDay).forEach((candidate) => notifications.push({
      id: getNativeId(candidate.index, candidate.slot),
      channelId: CHANNEL_ID,
      title: candidate.title,
      body: candidate.body,
      schedule: { at: candidate.at, allowWhileIdle: true },
      extra: { path: candidate.path, category: candidate.category, date },
    }));
  }
  return notifications;
};

const scheduleNativeReminders = async (prefs: ReminderPrefs, ask: boolean): Promise<boolean> => {
  if (hasNativeBridge()) {
    await callNative('notifications.cancel', {
      notifications: allNativeIds().map((id) => ({ id })),
    });
    if (!hasEnabledReminders(prefs)) return true;
    if (!(await permissionGranted(ask))) return false;
    const notifications = nativeNotifications(prefs).map(({ id, title, body, schedule }) => ({
      id,
      title,
      body,
      schedule: schedule?.at
        ? { at: (schedule.at as Date).toISOString().replace(/\.\d{3}Z$/, 'Z') }
        : schedule?.on
          ? { on: schedule.on as unknown as Record<string, number>, repeats: schedule.repeats }
          : {},
    }));
    if (notifications.length) {
      await callNative('notifications.schedule', { notifications });
    }
    return true;
  }
  await LocalNotifications.cancel({ notifications: allNativeIds().map((id) => ({ id })) });
  if (!hasEnabledReminders(prefs)) return true;
  if (!(await permissionGranted(ask))) return false;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Recordatorios',
    description: 'Recordatorios configurados por ti en Alivia',
    importance: 3,
    visibility: 0,
  });
  const notifications = nativeNotifications(prefs);
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return true;
};

export const applyReminderSettings = async (
  prefs = getReminderPrefs(),
  requestPermission = false,
): Promise<boolean> => {
  if (isNative()) return scheduleNativeReminders(prefs, requestPermission);
  if (!getToken()) throw new Error('Inicia sesión para sincronizar tus recordatorios de la PWA.');
  if (hasEnabledReminders(prefs)) {
    const subscribed = await ensureWebPushSubscription(requestPermission);
    if (!subscribed) return false;
  }
  await requestJson('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify({ settings: prefs }),
  });
  if (!hasEnabledReminders(prefs) && 'serviceWorker' in navigator) {
    const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (subscription) await removePushSubscription(subscription);
  }
  return true;
};

export const loadRemoteReminderPrefs = async (): Promise<ReminderPrefs | null> => {
  if (isNative() || !getToken()) return null;
  const response = await requestJson<{ settings: ReminderPrefs | null }>('/api/notifications/preferences');
  if (!response.settings) return null;
  const saved = normalizeReminderPrefs(response.settings);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone ? { ...saved, timezone } : saved;
};

export const sendTestReminder = async (): Promise<void> => {
  if (isNative()) throw new Error('La prueba Web Push solo está disponible en la PWA.');
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no admite Web Push. En iPhone, instala la PWA desde Safari y prueba desde su icono.');
  }
  if (Notification.permission !== 'granted') {
    throw new Error('Permite las notificaciones en los ajustes del navegador antes de hacer la prueba.');
  }
  const registration = await navigator.serviceWorker.ready;
  if (!(await registration.pushManager.getSubscription())) {
    throw new Error('Este teléfono aún no está suscrito. Activa un recordatorio para registrar este dispositivo.');
  }
  await requestJson<{ ok: boolean }>('/api/notifications/test', { method: 'POST' });
};

export const applyDailyReminder = async (prefs = getReminderPrefs()): Promise<void> => {
  await applyReminderSettings(prefs, false);
};

export const syncCheckInReminder = async (
  prefs: ReminderPrefs,
  lastCreatedAt: string | null,
): Promise<void> => {
  if (!lastCreatedAt) return;
  const date = new Date(lastCreatedAt);
  if (Number.isNaN(date.getTime())) return;
  const schedule = prefs.categories['wellbeing-checkin'];
  schedule.startDate = localDate(date);
  const next = saveReminderPrefs(prefs);
  await applyReminderSettings(next, false);
};

export const getNotificationPermission = (): string => {
  if (!isNative()) return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return 'native';
};
