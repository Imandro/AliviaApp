import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const postId = Number(req.query.postId ?? NaN);
  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: 'postId inválido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM fn_like_post($1)`, [postId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/posts/like:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}