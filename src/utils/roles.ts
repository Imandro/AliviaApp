/* ----------------------------------------------------
   ALIVIA - ROLES Y PERMISOS (espejo del servidor)

   Debe mantenerse en sync con api/auth/_roles.ts: el
   servidor es la autoridad real; esto solo adapta la
   interfaz (mostrar/ocultar, no proteger). Toda acción
   se re-valida en el backend.
   ---------------------------------------------------- */

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

export type Permission =
  | 'app.use'
  | 'users.manage'
  | 'stats.view'
  | 'audit.read';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['app.use', 'users.manage', 'stats.view', 'audit.read'],
  usuario: ['app.use'],
  auditor: ['app.use', 'stats.view', 'audit.read'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLE_CODES as readonly string[]).includes(value);
}

/** Rol efectivo: sesiones o cachés de antes de la migración caen a usuario. */
export function roleOf(user: { role?: unknown } | null | undefined): Role {
  return isRole(user?.role) ? user.role : ROLES.USUARIO;
}

/** ¿El usuario tiene el permiso? Controla la interfaz; nunca la seguridad. */
export function canUser(user: { role?: unknown } | null | undefined, permission: Permission): boolean {
  return ROLE_PERMISSIONS[roleOf(user)].includes(permission);
}
