import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { getUserFromRequest, toSafeUser } from './_auth.js';

import { applyCors } from '../_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();

    const sessionUser = await getUserFromRequest(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }

    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM fn_get_user_by_id($1)`, [sessionUser.id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(toSafeUser(user));
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}