/* ----------------------------------------------------
   /api/admin/stats — Métricas agregadas del panel

   GET devuelve conteos y promedios de uso. Ningún dato
   personal: solo agregados que resumen la salud del sistema.

   Permiso: stats.view (admin y auditor).
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from '../_types.js';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { requirePermission } from '../auth/_roles.js';

import { applyCors } from '../_cors.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const user = await requirePermission(req, res, 'stats.view');
    if (!user) return;

    await ensureSchema();
    await ensureFunctions();

    const { rows } = await getPool().query(`SELECT * FROM fn_admin_stats()`);
    const r = rows[0];
    if (!r) return res.status(200).json(null);
    // COUNT() y AVG() llegan como texto desde PostgreSQL (BIGINT/NUMERIC):
    // se normalizan aquí para que el cliente reciba números de verdad.
    return res.status(200).json({
      users_total: Number(r.users_total ?? 0),
      users_active: Number(r.users_active ?? 0),
      users_admin: Number(r.users_admin ?? 0),
      users_auditor: Number(r.users_auditor ?? 0),
      sessions_active: Number(r.sessions_active ?? 0),
      assessments_total: Number(r.assessments_total ?? 0),
      assessments_30d: Number(r.assessments_30d ?? 0),
      crisis_contacts: Number(r.crisis_contacts ?? 0),
      community_posts: Number(r.community_posts ?? 0),
      mood_avg: Number(r.mood_avg ?? 0),
    });
  } catch (err) {
    console.error('Error en /api/admin/stats:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
