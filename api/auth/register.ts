import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { hashPassword, createSession, toSafeUser, EMAIL_RE, PHONE_RE } from './_auth.js';

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

    const { username, email, phone, name, password } = req.body ?? {};

    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim() || null;
    const cleanName = String(name || '').trim();
    const cleanPassword = String(password || '');

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos' });
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Ingresa un correo válido' });
    }
    if (cleanPhone && !PHONE_RE.test(cleanPhone)) {
      return res.status(400).json({ error: 'Ingresa un teléfono válido' });
    }
    if (!cleanName) {
      return res.status(400).json({ error: 'Ingresa tu nombre' });
    }
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM fn_create_user($1, $2, $3, $4, $5)`,
      [cleanUsername, cleanEmail, cleanPhone, cleanName, hashPassword(cleanPassword)]
    );

    const user = toSafeUser(rows[0]);
    const token = await createSession(user.id);

    return res.status(201).json({ token, user });
  } catch (err: any) {
    const msg = String(err?.message || '');
    const known = [
      'El usuario ya está en uso',
      'El correo ya está registrado',
      'El teléfono ya está registrado',
    ];
    if (known.some((k) => msg.includes(k))) {
      return res.status(409).json({ error: msg });
    }
    console.error('Error en /api/auth/register:', err);
    return res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
}