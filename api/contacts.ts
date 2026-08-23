import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from './_db.js';

import { applyCors } from './_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(`SELECT * FROM fn_get_contact()`);
      return res.status(200).json(rows[0] ?? null);
    }

    if (req.method === 'PUT') {
      const { name, phone } = req.body ?? {};
      if (!name || !phone) {
        return res.status(400).json({ error: 'name y phone son requeridos' });
      }
      const { rows } = await pool.query(
        `SELECT * FROM fn_upsert_contact($1, $2)`,
        [String(name).trim(), String(phone).trim()]
      );
      return res.status(200).json(rows[0]);
    }

    await pool.query(`SELECT fn_delete_contact()`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/contacts:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}