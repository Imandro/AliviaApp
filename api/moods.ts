import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db';

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
        `SELECT to_char(date, 'YYYY-MM-DD') AS date, score, note
         FROM mood_entries ORDER BY date ASC`
      );
      return res.status(200).json(rows);
    }

    const { date, score, note } = req.body ?? {};
    if (!date || typeof score !== 'number' || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Datos inválidos: date y score (1-5) son requeridos' });
    }

    const { rows } = await pool.query(
      `INSERT INTO mood_entries (date, score, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (date)
       DO UPDATE SET score = EXCLUDED.score, note = EXCLUDED.note
       RETURNING to_char(date, 'YYYY-MM-DD') AS date, score, note`,
      [date, score, note ?? null]
    );
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/moods:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
