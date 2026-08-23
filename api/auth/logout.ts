import { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteSession, extractToken } from './_auth.js';

import { applyCors } from '../_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await deleteSession(extractToken(req));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/auth/logout:', err);
    return res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
}