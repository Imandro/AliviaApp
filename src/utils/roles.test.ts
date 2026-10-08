import { describe, it, expect } from 'vitest';
import { ROLES, isRole, roleOf, canUser, ROLE_PERMISSIONS } from './roles';

/* Espejo del servidor: si alguien desincroniza api/auth/_roles.ts y este
 * archivo, estos tests delatan el lado cliente. */
describe('roles (cliente)', () => {
  it('conoce exactamente los tres roles', () => {
    expect(Object.values(ROLES).sort()).toEqual(['admin', 'auditor', 'usuario']);
    expect(isRole('admin') && isRole('usuario') && isRole('auditor')).toBe(true);
    expect(isRole('root')).toBe(false);
  });

  it('usuario normal solo tiene app.use', () => {
    expect(canUser({ role: 'usuario' }, 'app.use')).toBe(true);
    expect(canUser({ role: 'usuario' }, 'users.manage')).toBe(false);
    expect(canUser({ role: 'usuario' }, 'stats.view')).toBe(false);
    expect(canUser({ role: 'usuario' }, 'audit.read')).toBe(false);
  });

  it('admin y auditor ven la bitácora; solo admin gestiona cuentas', () => {
    expect(canUser({ role: 'auditor' }, 'audit.read')).toBe(true);
    expect(canUser({ role: 'auditor' }, 'users.manage')).toBe(false);
    expect(canUser({ role: 'admin' }, 'users.manage')).toBe(true);
  });

  it('degrada a usuario cualquier rol desconocido', () => {
    expect(roleOf(null)).toBe('usuario');
    expect(roleOf({ role: 'desconocido' })).toBe('usuario');
    expect(canUser({ role: 'desconocido' }, 'users.manage')).toBe(false);
  });

  it('mantiene la misma matriz que el servidor', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('users.manage');
    expect(ROLE_PERMISSIONS.auditor).not.toContain('users.manage');
    expect(ROLE_PERMISSIONS.usuario).toEqual(['app.use']);
  });
});
