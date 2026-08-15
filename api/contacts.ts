import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT name, phone FROM emergency_contact WHERE id = 1`
      );
      return res.status(200).json(rows[0] ?? null);
    }

    if (req.method === 'PUT') {
      const { name, phone } = req.body ?? {};
      if (!name || !phone) {
        return res.status(400).json({ error: 'name y phone son requeridos' });
      }
      const { rows } = await pool.query(
        `INSERT INTO emergency_contact (id, name, phone)
         VALUES (1, $1, $2)
         ON CONFLICT (id)
         DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
         RETURNING name, phone`,
        [String(name).trim(), String(phone).trim()]
      );
      return res.status(200).json(rows[0]);
    }

    await pool.query(`DELETE FROM emergency_contact WHERE id = 1`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/contacts:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
