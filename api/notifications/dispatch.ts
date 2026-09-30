import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Pool } from 'pg';
import webpush from 'web-push';
import { ensureSchema, getPool } from '../_db.js';
import { normalizeReminderPrefs } from '../../src/utils/reminderCatalog.js';
import { findDueReminders } from './_scheduler.js';

const validCronRequest = (authorization: string | undefined, secret: string): boolean => {
  if (!authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};

const reserveDelivery = async (
  pool: Pool,
  userId: string,
  reminderId: string,
  localDate: string,
  dailyLimit: number,
): Promise<string | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT user_id FROM notification_preferences WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const { rows: counts } = await client.query(
      `SELECT count(*)::int AS count
       FROM notification_deliveries
       WHERE user_id = $1 AND local_date = $2
         AND (status = 'sent' OR (status = 'pending' AND created_at >= now() - interval '10 minutes'))`,
      [userId, localDate],
    );
    if (counts[0].count >= dailyLimit) {
      await client.query('COMMIT');
      return null;
    }
    const { rows } = await client.query(
      `INSERT INTO notification_deliveries (user_id, reminder_id, local_date, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (user_id, reminder_id, local_date) DO UPDATE
         SET status = 'pending', created_at = now()
       WHERE notification_deliveries.status = 'failed'
          OR (notification_deliveries.status = 'pending'
              AND notification_deliveries.created_at < now() - interval '10 minutes')
       RETURNING id`,
      [userId, reminderId, localDate],
    );
    await client.query('COMMIT');
    return rows[0]?.id == null ? null : String(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !validCronRequest(req.headers.authorization, cronSecret)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return res.status(503).json({ error: 'Notificaciones push no configuradas' });
  }

  try {
    await ensureSchema();
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const pool = getPool();
    const { rows: preferenceRows } = await pool.query(
      `SELECT user_id, settings
       FROM notification_preferences
       WHERE settings IS NOT NULL
       ORDER BY updated_at ASC
       LIMIT 1000`,
    );

    let sent = 0;
    let expired = 0;
    for (const row of preferenceRows) {
      const prefs = normalizeReminderPrefs(row.settings);
      const due = findDueReminders(prefs);
      if (due.length === 0) continue;

      const { rows: subscriptions } = await pool.query(
        'SELECT endpoint, subscription FROM push_subscriptions WHERE user_id = $1',
        [row.user_id],
      );
      if (subscriptions.length === 0) continue;

      for (const reminder of due) {
        const deliveryId = await reserveDelivery(
          pool,
          row.user_id,
          reminder.id,
          reminder.localDate,
          prefs.maxPerDay,
        );
        if (!deliveryId) continue;

        const payload = JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          path: reminder.path,
          tag: `alivia-${reminder.id}-${reminder.localDate}`,
        });
        const results = await Promise.allSettled(subscriptions.map(async (item: {
          endpoint: string;
          subscription: webpush.PushSubscription;
        }) => {
          try {
            await webpush.sendNotification(item.subscription, payload, { TTL: 3600 });
            return true;
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [item.endpoint]);
              expired++;
            }
            throw err;
          }
        }));
        const delivered = results.some((result) => result.status === 'fulfilled');
        await pool.query(
          'UPDATE notification_deliveries SET status = $2 WHERE id = $1',
          [deliveryId, delivered ? 'sent' : 'failed'],
        );
        if (delivered) sent++;
      }
    }
    return res.status(200).json({ ok: true, sent, expiredSubscriptions: expired });
  } catch (err) {
    console.error('Error en /api/notifications/dispatch:', err);
    return res.status(500).json({ error: 'No se pudieron procesar los recordatorios' });
  }
}
