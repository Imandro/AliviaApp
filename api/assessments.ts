import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, ensureFunctions, getPool } from './_db.js';
import { getUserFromRequest } from './auth/_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(`SELECT * FROM fn_get_user_assessments($1)`, [user.id]);
      const assessments = rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        stress: r.stress,
        anxiety: r.anxiety,
        depression: r.depression,
        level: r.level,
        crisis: r.crisis,
        recommendations: r.recommendations ?? [],
        ai_advice: r.ai_advice ?? null,
        created_at: r.created_at ?? '',
      }));
      return res.status(200).json(assessments);
    }

    const { id = null, type = 'bienestar', stress = 0, anxiety = 0, depression = 0, level = 'baja', crisis = false, recommendations = [], ai_advice = null, action = null, assessmentId = null, channel = 'helpline', detail = null } = req.body ?? {};

    if (action === 'contact') {
      const { rows } = await pool.query(
        `SELECT * FROM fn_log_crisis_contact($1, $2, $3, $4)`,
        [
          user.id,
          assessmentId && Number.isFinite(Number(assessmentId)) ? Number(assessmentId) : null,
          ['helpline', 'via'].includes(String(channel)) ? String(channel) : 'helpline',
          detail ? String(detail).slice(0, 300) : null,
        ]
      );
      return res.status(201).json(rows[0]);
    }

    if ([stress, anxiety, depression].some((s) => typeof s !== 'number' || s < 0 || s > 15)) {
      return res.status(400).json({ error: 'Puntuaciones inválidas (0-15)' });
    }

    if (id && Number.isFinite(Number(id))) {
      if (!ai_advice) {
        return res.status(400).json({ error: 'ai_advice es requerido para actualizar' });
      }
      const { rows } = await pool.query(
        `SELECT * FROM fn_set_assessment_advice($1, $2)`,
        [Number(id), String(ai_advice).slice(0, 1200)]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Chequeo no encontrado' });
      }
      return res.status(200).json({ id: rows[0].id, ai_advice: rows[0].ai_advice });
    }

    const { rows } = await pool.query(
      `SELECT * FROM fn_save_assessment($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        String(type).slice(0, 30),
        Math.round(stress),
        Math.round(anxiety),
        Math.round(depression),
        String(level).slice(0, 20),
        Boolean(crisis),
        Array.isArray(recommendations) ? recommendations.slice(0, 12).map((r) => String(r).slice(0, 240)) : [],
        ai_advice ? String(ai_advice).slice(0, 1200) : null,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error en /api/assessments:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}