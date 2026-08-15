import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(`SELECT * FROM fn_get_moods()`);
      return res.status(200).json(rows);
    }

    const { date, score, note } = req.body ?? {};
    if (!date || typeof score !== 'number' || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Datos inválidos: date y score (1-5) son requeridos' });
    }

    const { rows } = await pool.query(
      `SELECT o_date AS date, o_score AS score, o_note AS note FROM fn_upsert_mood($1, $2, $3)`,
      [date, score, note ?? null]
    );
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/moods:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}