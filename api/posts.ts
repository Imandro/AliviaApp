import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const methods = ['GET', 'POST'];
  if (!methods.includes(req.method!)) {
    res.setHeader('Allow', methods.join(', '));
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    if (req.method === 'GET') {
      const { topic, limit = 50 } = req.query as { topic?: string; limit?: string };
      const { rows } = await pool.query(
        `SELECT * FROM fn_get_posts($1, $2)`,
        [topic && topic !== 'todos' ? String(topic) : null, Number(limit) || 50]
      );
      return res.status(200).json(rows);
    }

    const { author, content, topic } = req.body ?? {};
    const cleanContent = String(content ?? '').trim();
    if (!cleanContent || cleanContent.length > 500) {
      return res.status(400).json({ error: 'El mensaje es requerido (máx. 500 caracteres)' });
    }
    const { rows } = await pool.query(
      `SELECT * FROM fn_create_post($1, $2, $3)`,
      [String(author ?? 'Anónimo').slice(0, 30), cleanContent, String(topic ?? 'general').slice(0, 30)]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/posts:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}