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
      const { rows } = await pool.query(`SELECT * FROM fn_get_activities()`);
      return res.status(200).json(rows);
    }

    const { id, title } = req.body ?? {};
    if (!id || !title) {
      return res.status(400).json({ error: 'id y title son requeridos' });
    }

    const { rows } = await pool.query(
      `SELECT o_id AS id, o_title AS title, o_date AS date FROM fn_insert_activity($1, $2)`,
      [String(id), String(title)]
    );
    return res.status(200).json(rows[0] ?? null);
  } catch (err) {
    console.error('Error en /api/activities:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}