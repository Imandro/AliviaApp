import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PushSubscription } from 'web-push';
import webpush from 'web-push';
import { applyCors } from '../_cors.js';
import { ensureSchema, getPool } from '../_db.js';
import { getUserFromRequest } from '../auth/_auth.js';
import { normalizeReminderPrefs } from '../../src/utils/reminderCatalog.js';

type NotificationAction = 'preferences' | 'subscriptions' | 'test';

const getAction = (req: VercelRequest): string | undefined => {
  const action = req.query.action;
  return Array.isArray(action) ? action[0] : action;
};

const handlePreferences = async (req: VercelRequest, res: VercelResponse) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Sesión no válida' });

    const pool = getPool();
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        'SELECT settings FROM notification_preferences WHERE user_id = $1',
        [user.id],
      );
      return res.status(200).json({ settings: rows[0]?.settings ?? null });
    }

    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
        JSON.stringify(settings).length > 50000) {
      return res.status(400).json({ error: 'Preferencias de notificación no válidas' });
    }
    const normalized = normalizeReminderPrefs(settings);
    const { rows } = await pool.query(
      `INSERT INTO notification_preferences (user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()
       RETURNING settings`,
      [user.id, JSON.stringify(normalized)],
    );
    return res.status(200).json({ settings: rows[0].settings });
  } catch (err) {
    console.error('Error en /api/notifications/preferences:', err);
    return res.status(500).json({ error: 'No se pudieron guardar las preferencias' });
  }
};

const isValidSubscription = (value: unknown): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} => {
  if (!value || typeof value !== 'object') return false;
  const subscription = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return typeof subscription.endpoint === 'string' &&
    subscription.endpoint.length <= 2048 &&
    subscription.endpoint.startsWith('https://') &&
    typeof subscription.keys?.p256dh === 'string' &&
    subscription.keys.p256dh.length <= 256 &&
    typeof subscription.keys.auth === 'string' &&
    subscription.keys.auth.length <= 256;
};

const handleSubscriptions = async (req: VercelRequest, res: VercelResponse) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Sesión no válida' });
    const pool = getPool();

    if (req.method === 'DELETE') {
      const endpoint = req.body?.endpoint;
      if (typeof endpoint !== 'string' || endpoint.length > 2048 || !endpoint.startsWith('https://')) {
        return res.status(400).json({ error: 'Endpoint de notificación no válido' });
      }
      await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
        [user.id, endpoint],
      );
      return res.status(200).json({ ok: true });
    }

    const subscription = req.body?.subscription;
    if (!isValidSubscription(subscription) || JSON.stringify(subscription).length > 10000) {
      return res.status(400).json({ error: 'Suscripción push no válida' });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, subscription, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         subscription = EXCLUDED.subscription,
         updated_at = now()`,
      [user.id, subscription.endpoint, JSON.stringify(subscription)],
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/notifications/subscriptions:', err);
    return res.status(500).json({ error: 'No se pudo guardar la suscripción push' });
  }
};

const handleTest = async (req: VercelRequest, res: VercelResponse) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return res.status(503).json({ error: 'Web Push no está configurado en Vercel (faltan las variables VAPID).' });
  }

  try {
    await ensureSchema();
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Inicia sesión para probar las notificaciones.' });

    const { rows } = await getPool().query(
      'SELECT endpoint, subscription FROM push_subscriptions WHERE user_id = $1',
      [user.id],
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'Este dispositivo no tiene una suscripción Push. Activa un recordatorio primero.' });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const payload = JSON.stringify({
      title: 'Prueba de notificaciones de Alivia',
      body: '¡Listo! Este teléfono puede recibir recordatorios de Alivia.',
      path: '/profile',
      tag: `alivia-test-${Date.now()}`,
    });
    const results = await Promise.allSettled(rows.map(async (row: {
      endpoint: string;
      subscription: PushSubscription;
    }) => {
      try {
        await webpush.sendNotification(row.subscription, payload, { TTL: 300 });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await getPool().query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
        }
        throw error;
      }
    }));
    if (!results.some((result) => result.status === 'fulfilled')) {
      console.error('Error al enviar notificación de prueba:', results.map((result) =>
        result.status === 'rejected'
          ? { statusCode: (result.reason as { statusCode?: number })?.statusCode }
          : { statusCode: 201 },
      ));
      return res.status(502).json({
        error: 'El servicio Push rechazó el envío. Revisa las claves VAPID y vuelve a activar el recordatorio en este teléfono.',
      });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en /api/notifications/test:', error);
    return res.status(500).json({ error: 'No se pudo enviar la notificación de prueba.' });
  }
};

const handlers: Record<NotificationAction, (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>> = {
  preferences: handlePreferences,
  subscriptions: handleSubscriptions,
  test: handleTest,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);
  if (action !== 'preferences' && action !== 'subscriptions' && action !== 'test') {
    return res.status(404).json({ error: 'Ruta de notificaciones no encontrada' });
  }
  return handlers[action](req, res);
}
