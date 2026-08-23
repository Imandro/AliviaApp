import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from './_db.js';

import { applyCors } from './_cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const method = req.method ?? 'GET';
  if (!methods.includes(method)) {
    res.setHeader('Allow', methods.join(', '));
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();
    const planId = Number(req.query.planId ?? NaN);

    if (method === 'POST') {
      const { title, area = 'general' } = req.body ?? {};
      if (!String(title ?? '').trim()) {
        return res.status(400).json({ error: 'title es requerido' });
      }
      const { rows } = await pool.query(
        `SELECT * FROM fn_create_plan($1, $2)`,
        [String(title).trim().slice(0, 120), String(area).slice(0, 30)]
      );
      return res.status(201).json({ ...rows[0], goals: [] });
    }

    if (method === 'GET') {
      const { rows } = await pool.query(`SELECT * FROM fn_get_plans()`);
      const plans = rows.map((r: any) => ({
        id: r.plan_id,
        title: r.plan_title,
        area: r.plan_area,
        created_at: r.plan_created_at,
        goals: r.goals ?? [],
      }));
      return res.status(200).json(plans);
    }

    if (!Number.isFinite(planId)) {
      return res.status(400).json({ error: 'planId inválido' });
    }

    if (method === 'PUT') {
      const { action, goalTitle, goalId } = req.body ?? {};
      if (action === 'add_goal') {
        if (!String(goalTitle ?? '').trim()) {
          return res.status(400).json({ error: 'goalTitle es requerido' });
        }
        const { rows } = await pool.query(
          `SELECT o_id AS id, o_title AS title, o_done AS done FROM fn_add_goal($1, $2)`,
          [planId, String(goalTitle).trim().slice(0, 160)]
        );
        return res.status(201).json(rows[0]);
      }
      if (action === 'toggle_goal') {
        const { rows } = await pool.query(
          `SELECT o_id AS id, o_title AS title, o_done AS done FROM fn_toggle_goal($1)`,
          [Number(goalId)]
        );
        return res.status(200).json(rows[0] ?? null);
      }
      if (action === 'delete_goal') {
        await pool.query(`SELECT fn_delete_goal($1)`, [Number(goalId)]);
        return res.status(200).json({ ok: true });
      }
      const { title } = req.body ?? {};
      if (title) {
        const { rows } = await pool.query(
          `UPDATE plans SET title = $1 WHERE id = $2 RETURNING id, title, area`,
          [String(title).trim().slice(0, 120), planId]
        );
        return res.status(200).json(rows[0] ?? null);
      }
      return res.status(400).json({ error: 'Acción no reconocida' });
    }

    await pool.query(`SELECT fn_delete_plan($1)`, [planId]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/plans:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}