import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const method = req.method ?? 'GET';
  if (!methods.includes(method)) {
    res.setHeader('Allow', methods.join(', '));
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const planId = Number(req.query.planId ?? NaN);

    if (method === 'POST') {
      const { title, area = 'general' } = req.body ?? {};
      if (!String(title ?? '').trim()) {
        return res.status(400).json({ error: 'title es requerido' });
      }
      const { rows } = await pool.query(
        `INSERT INTO plans (title, area)
         VALUES ($1, $2)
         RETURNING id, title, area,
                   to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at`,
        [String(title).trim().slice(0, 120), String(area).slice(0, 30)]
      );
      return res.status(201).json(rows[0]);
    }

    if (method === 'GET') {
      const { rows } = await pool.query(
        `SELECT p.id, p.title, p.area,
                to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                COALESCE(json_agg(
                  json_build_object('id', g.id, 'title', g.title, 'done', g.done)
                  ORDER BY g.id
                ) FILTER (WHERE g.id IS NOT NULL), '[]') AS goals
         FROM plans p
         LEFT JOIN plan_goals g ON g.plan_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      );
      return res.status(200).json(rows);
    }

    if (!Number.isFinite(planId)) {
      return res.status(400).json({ error: 'planId inválido' });
    }

    if (method === 'PUT') {
      const { action, goalTitle, title, done, goalId } = req.body ?? {};
      if (action === 'add_goal') {
        if (!String(goalTitle ?? '').trim()) {
          return res.status(400).json({ error: 'goalTitle es requerido' });
        }
        const { rows } = await pool.query(
          `INSERT INTO plan_goals (plan_id, title)
           VALUES ($1, $2)
           RETURNING id, title, done`,
          [planId, String(goalTitle).trim().slice(0, 160)]
        );
        return res.status(201).json(rows[0]);
      }
      if (action === 'toggle_goal') {
        const { rows } = await pool.query(
          `UPDATE plan_goals SET done = NOT done WHERE id = $1 RETURNING id, title, done`,
          [Number(goalId)]
        );
        return res.status(200).json(rows[0] ?? null);
      }
      if (action === 'delete_goal') {
        await pool.query(`DELETE FROM plan_goals WHERE id = $1`, [Number(goalId)]);
        return res.status(200).json({ ok: true });
      }
      if (title) {
        const { rows } = await pool.query(
          `UPDATE plans SET title = $1 WHERE id = $2 RETURNING id, title, area`,
          [String(title).trim().slice(0, 120), planId]
        );
        return res.status(200).json(rows[0] ?? null);
      }
      return res.status(400).json({ error: 'Acción no reconocida' });
    }

    await pool.query(`DELETE FROM plans WHERE id = $1`, [planId]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/plans:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}