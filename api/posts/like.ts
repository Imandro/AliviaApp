import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db.js';

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
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE community_posts SET likes = likes + 1 WHERE id = $1 RETURNING id, likes`,
      [postId]
    );
    return res.status(200).json(rows[0] ?? { error: 'Post no encontrado' });
  } catch (err) {
    console.error('Error en /api/posts/like:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}