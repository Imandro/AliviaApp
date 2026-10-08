/* ----------------------------------------------------
   /api/admin/users — Panel de administración de cuentas

   GET   lista las cuentas (sin password_hash); acepta
         ?q= para buscar por usuario, correo o nombre.
   PATCH cambia rol y/o estado de una cuenta. Ambos
         cambios viajan en UNA llamada a la BD, así se
         aplican en la misma transacción.

   Permiso: users.manage (solo admin). La verificación se
   repite dentro de fn_admin_update_user.
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from '../_types.js';
import { ensureSchema, ensureFunctions, getPool } from '../_db.js';
import { requirePermission, isRole } from '../auth/_roles.js';

import { applyCors } from '../_cors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// La BD lanza excepciones legibles; aquí se traducen al HTTP correcto.
// Cualquier otro mensaje se queda en 500 y se loggea.
function statusForDbError(message: string): number {
  if (message.includes('no encontrado')) return 404;
  if (message.includes('propio rol') || message.includes('propia cuenta')) return 403;
  if (message.includes('al menos un administrador')) return 409;
  if (message.includes('Rol no válido')) return 400;
  if (message.includes('Solo un administrador')) return 403;
  return 500;
}

// fn_admin_update_user devuelve columnas con prefijo o_ (convención para
// evitar sombras en plpgsql); aquí se normalizan para que el cliente reciba
// siempre la misma forma que fn_list_users.
function toUpdatedUser(row: any) {
  return {
    id: String(row.o_id ?? row.id),
    username: row.o_username ?? row.username,
    email: row.o_email ?? row.email,
    name: row.o_name ?? row.name,
    role: row.o_role ?? row.role,
    is_active: Boolean(row.o_is_active ?? row.is_active),
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const admin = await requirePermission(req, res, 'users.manage');
    if (!admin) return;

    await ensureSchema();
    await ensureFunctions();
    const pool = getPool();

    if (req.method === 'GET') {
      const search = String(req.query.q ?? '').trim().slice(0, 60) || null;
      const { rows } = await pool.query(`SELECT * FROM fn_list_users($1)`, [search]);
      return res.status(200).json(rows);
    }

    const { userId, role, is_active } = req.body ?? {};
    const targetId = String(userId ?? '');
    if (!UUID_RE.test(targetId)) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const hasRole = role !== undefined;
    const hasActive = is_active !== undefined;
    if (!hasRole && !hasActive) {
      return res.status(400).json({ error: 'Indica el nuevo rol o el nuevo estado de la cuenta' });
    }
    if (hasRole && !isRole(role)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    // NULL = "no tocar": la BD aplica solo lo que llegó y audita solo lo
    // que realmente cambió, dentro de una misma transacción.
    const { rows } = await pool.query(
      `SELECT * FROM fn_admin_update_user($1, $2, $3, $4)`,
      [admin.id, targetId, hasRole ? role : null, hasActive ? Boolean(is_active) : null]
    );

    return res.status(200).json(toUpdatedUser(rows[0]));
  } catch (err: any) {
    const msg = String(err?.message || '');
    const status = statusForDbError(msg);
    if (status === 500) {
      console.error('Error en /api/admin/users:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
    return res.status(status).json({ error: msg });
  }
}
