import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const methods = ['GET', 'POST'];
  if (!methods.includes(req.method!)) {
    res.setHeader('Allow', methods.join(', '));
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const pool = getPool();

    if (req.method === 'GET') {
      const { topic, limit = 50 } = req.query as { topic?: string; limit?: string };
      const params: unknown[] = [];
      let where = '';
      if (topic && topic !== 'todos') {
        params.push(topic);
        where = `WHERE topic = $1`;
      }
      params.push(Number(limit) || 50);
      const { rows } = await pool.query(
        `SELECT id, author, content, topic, likes,
                to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
         FROM community_posts ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params
      );
      return res.status(200).json(rows);
    }

    const { author, content, topic } = req.body ?? {};
    const cleanContent = String(content ?? '').trim();
    if (!cleanContent || cleanContent.length > 500) {
      return res.status(400).json({ error: 'El mensaje es requerido (máx. 500 caracteres)' });
    }
    const { rows } = await pool.query(
      `INSERT INTO community_posts (author, content, topic)
       VALUES ($1, $2, $3)
       RETURNING id, author, content, topic, likes,
                 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at`,
      [String(author ?? 'Anónimo').slice(0, 30), cleanContent, String(topic ?? 'general').slice(0, 30)]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/posts:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}