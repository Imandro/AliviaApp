import type { ApiRequest, ApiResponse } from '../_types.js';
import type { PushSubscription } from 'web-push';
import webpush from 'web-push';
import { applyCors } from '../_cors.js';
import { ensureSchema, getPool } from '../_db.js';
import { getUserFromRequest } from '../auth/_auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return res.status(503).json({ error: 'Web Push no está configurado en el servidor (faltan las variables VAPID).' });
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
}
