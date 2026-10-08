/* ----------------------------------------------------
   /api/admin/audit — Bitácora de auditoría

   GET lista las acciones sensibles registradas por la BD
   (cambios de rol, desactivaciones) con paginación simple.

   Permiso: audit.read (admin y auditor). Solo lectura.
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
    const user = await requirePermission(req, res, 'audit.read');
    if (!user) return;

    await ensureSchema();
    await ensureFunctions();

    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
    const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

    const { rows } = await getPool().query(
      `SELECT * FROM fn_get_audit($1, $2)`,
      [limit, offset]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error en /api/admin/audit:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
