import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_cors.js';
import { ensureSchema, getPool } from '../_db.js';
import { getUserFromRequest } from '../auth/_auth.js';
import { normalizeReminderPrefs } from '../../src/utils/reminderCatalog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
}
