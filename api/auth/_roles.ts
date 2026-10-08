/* ----------------------------------------------------
   ALIVIA - ROLES Y PERMISOS (RBAC)

   Tres roles: admin, usuario y auditor.

   La matriz de permisos vive aquí como única fuente de verdad del
   código y se refleja en la base de datos:
     - db/schema.sql: catálogo `roles` (FK desde users.role).
     - db/functions.sql: fn_set_user_role / fn_set_user_active
       re-validan en la propia BD (defensa en profundidad).
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from '../_types.js';
import { getUserFromRequest, type SessionUser } from './_auth.js';

export const ROLES = {
  ADMIN: 'admin',
  USUARIO: 'usuario',
  AUDITOR: 'auditor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_CODES: readonly Role[] = [ROLES.ADMIN, ROLES.USUARIO, ROLES.AUDITOR];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
  auditor: 'Auditor',
};

/**
 * Permisos del sistema. Son la unidad mínima de acceso: los handlers piden
 * permisos, nunca roles, para que reorganizar los roles no toque la API.
 */
export type Permission =
  | 'app.use' // uso normal de la app con los datos propios
  | 'users.manage' // ver cuentas, cambiar roles, activar/desactivar
  | 'stats.view' // métricas agregadas (sin datos personales)
  | 'audit.read'; // bitácora de acciones sensibles

/** Matriz rol → permisos. El auditor es de solo lectura: nunca muta datos. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['app.use', 'users.manage', 'stats.view', 'audit.read'],
  usuario: ['app.use'],
  auditor: ['app.use', 'stats.view', 'audit.read'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLE_CODES as readonly string[]).includes(value);
}

/** Rol efectivo de una sesión: cualquier valor desconocido cae a usuario. */
export function roleOf(user: { role?: unknown } | null | undefined): Role {
  return isRole(user?.role) ? user.role : ROLES.USUARIO;
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** ¿Tiene `user` el permiso pedido? Acepta sesiones sin rol (legacy) sin romper. */
export function canUser(user: { role?: unknown } | null | undefined, permission: Permission): boolean {
  return can(roleOf(user), permission);
}

/**
 * Guard de permisos para los handlers. Resuelve la sesión desde el token
 * Bearer, verifica el permiso y, si no pasa, escribe 401/403 en la respuesta
 * y devuelve null. Uso:
 *
 *   const admin = await requirePermission(req, res, 'users.manage');
 *   if (!admin) return;
 *
 * Las sesiones de cuentas desactivadas no se resuelven (getUserFromRequest
 * filtra por is_active), así que desactivar equivale a cerrar sesión.
 */
export async function requirePermission(
  req: ApiRequest,
  res: ApiResponse,
  permission: Permission
): Promise<SessionUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Sesión no válida' });
    return null;
  }
  if (!canUser(user, permission)) {
    res.status(403).json({ error: 'No tienes permiso para esta acción' });
    return null;
  }
  return user;
}
