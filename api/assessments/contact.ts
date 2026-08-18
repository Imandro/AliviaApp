import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { getUserFromRequest } from '../auth/_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    const { assessmentId = null, channel = 'helpline', detail = null } = req.body ?? {};

    const { rows } = await pool.query(
      `SELECT * FROM fn_log_crisis_contact($1, $2, $3, $4)`,
      [
        user.id,
        assessmentId && Number.isFinite(Number(assessmentId)) ? Number(assessmentId) : null,
        ['helpline', 'via'].includes(String(channel)) ? String(channel) : 'helpline',
        detail ? String(detail).slice(0, 300) : null,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/assessments/contact:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}