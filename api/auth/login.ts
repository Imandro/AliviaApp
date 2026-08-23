import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { verifyPassword, createSession, toSafeUser } from './_auth.js';

import { applyCors } from '../_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    const { identifier, password } = req.body ?? {};
    const cleanIdentifier = String(identifier || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanIdentifier || !cleanPassword) {
      return res.status(400).json({ error: 'Ingresa tu usuario o correo y tu contraseña' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM fn_get_user_by_identifier($1)`,
      [cleanIdentifier]
    );

    const user = rows[0];
    if (!user || !verifyPassword(cleanPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = await createSession(String(user.id));

    return res.status(200).json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
}