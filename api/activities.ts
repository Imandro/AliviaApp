import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT id, title, to_char(date, 'YYYY-MM-DD') AS date
         FROM completed_activities ORDER BY completed_at ASC`
      );
      return res.status(200).json(rows);
    }

    const { id, title } = req.body ?? {};
    if (!id || !title) {
      return res.status(400).json({ error: 'id y title son requeridos' });
    }

    const date = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `INSERT INTO completed_activities (id, title, date)
       VALUES ($1, $2, $3)
       ON CONFLICT (id, date) DO NOTHING
       RETURNING id, title, to_char(date, 'YYYY-MM-DD') AS date`,
      [String(id), String(title), date]
    );
    return res.status(200).json(rows[0] ?? null);
  } catch (err) {
    console.error('Error en /api/activities:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
