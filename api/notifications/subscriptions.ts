import type { ApiRequest, ApiResponse } from '../_types.js';
import { applyCors } from '../_cors.js';
import { ensureSchema, getPool } from '../_db.js';
import { getUserFromRequest } from '../auth/_auth.js';

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
}
