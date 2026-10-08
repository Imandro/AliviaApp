import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ApiRequest, ApiResponse } from './_types.js';

/* El pool real no existe en pruebas: se sustituye por una cola de respuestas.
 * Cada llamada a query() consume la siguiente fila encolada. */
const { db } = vi.hoisted(() => {
  return {
    db: {
      queue: [] as any[][],
      nextError: null as Error | null,
      reset(rows: any[][] = []) {
        this.queue = rows;
        this.nextError = null;
      },
      getPool: () => ({
        query: async function (this: any) {
          void this;
          if (db.nextError) {
            const err = db.nextError;
            db.nextError = null;
            throw err;
          }
          return { rows: db.queue.length ? db.queue.shift()! : [] };
        },
      }),
      ensureSchema: async () => {},
      ensureFunctions: async () => {},
    },
  };
});

vi.mock('./_db.js', () => db);

import {
  ROLES, ROLE_PERMISSIONS, isRole, roleOf, can, canUser, requirePermission,
} from './auth/_roles.js';

interface Captured {
  status: number;
  body: unknown;
}

const makeRes = (): { res: ApiResponse; captured: Captured } => {
  const captured: Captured = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      captured.status = code;
      return res;
    },
    json(data: unknown) {
      captured.body = data;
      return res;
    },
    setHeader() {
      return res;
    },
    send(data: unknown) {
      captured.body = data;
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as ApiResponse, captured };
};

const makeReq = (role: string | null): ApiRequest =>
  ({
    method: 'GET',
    url: '/api/admin/stats',
    query: {},
    headers: role === null ? {} : { authorization: `Bearer token-${role}` },
  }) as ApiRequest;

const sessionRow = (role: string) => [
  { id: 'u-1', name: 'Admin', username: 'admin', email: 'a@a.local', role },
];

beforeEach(() => {
  db.reset();
});

describe('catálogo de roles', () => {
  it('define exactamente admin, usuario y auditor', () => {
    expect(Object.values(ROLES).sort()).toEqual(['admin', 'auditor', 'usuario']);
  });

  it('isRole solo acepta los tres roles del sistema', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('usuario')).toBe(true);
    expect(isRole('auditor')).toBe(true);
    expect(isRole('superuser')).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(123)).toBe(false);
  });

  it('roleOf cae a usuario ante valores desconocidos (cachés legacy)', () => {
    expect(roleOf(null)).toBe('usuario');
    expect(roleOf({ role: 'dios' })).toBe('usuario');
    expect(roleOf({ role: 'auditor' })).toBe('auditor');
  });
});

describe('matriz de permisos', () => {
  it('admin tiene todos los permisos', () => {
    expect(can('admin', 'users.manage')).toBe(true);
    expect(can('admin', 'audit.read')).toBe(true);
    expect(can('admin', 'stats.view')).toBe(true);
    expect(can('admin', 'app.use')).toBe(true);
  });

  it('usuario solo usa la app, no administra ni audita', () => {
    expect(can('usuario', 'app.use')).toBe(true);
    expect(can('usuario', 'users.manage')).toBe(false);
    expect(can('usuario', 'audit.read')).toBe(false);
    expect(can('usuario', 'stats.view')).toBe(false);
  });

  it('auditor lee bitácora y métricas pero jamás gestiona cuentas', () => {
    expect(can('auditor', 'audit.read')).toBe(true);
    expect(can('auditor', 'stats.view')).toBe(true);
    expect(can('auditor', 'users.manage')).toBe(false);
    expect(can('auditor', 'app.use')).toBe(true);
  });

  it('la matriz no acumula permisos por descuido: usuario y auditor difieren de admin', () => {
    expect(ROLE_PERMISSIONS.usuario).not.toContain('users.manage');
    expect(ROLE_PERMISSIONS.auditor).not.toContain('users.manage');
    expect(ROLE_PERMISSIONS.admin).toContain('users.manage');
  });

  it('canUser tolera sesiones sin rol', () => {
    expect(canUser({ role: undefined }, 'app.use')).toBe(true);
    expect(canUser({ role: undefined }, 'users.manage')).toBe(false);
  });
});

describe('requirePermission', () => {
  it('responde 401 sin token Bearer y devuelve null', async () => {
    const { res, captured } = makeRes();
    const user = await requirePermission(makeReq(null), res, 'stats.view');
    expect(user).toBeNull();
    expect(captured.status).toBe(401);
  });

  it('responde 401 con token pero sesión inexistente en la cola vacía', async () => {
    const { res, captured } = makeRes();
    const user = await requirePermission(makeReq('admin'), res, 'stats.view');
    expect(user).toBeNull();
    expect(captured.status).toBe(401);
  });

  it('responde 403 cuando el rol no tiene el permiso', async () => {
    db.reset([sessionRow('usuario')]);
    const { res, captured } = makeRes();
    const user = await requirePermission(makeReq('usuario'), res, 'users.manage');
    expect(user).toBeNull();
    expect(captured.status).toBe(403);
  });

  it('devuelve la sesión cuando el rol tiene el permiso', async () => {
    db.reset([sessionRow('admin')]);
    const { res, captured } = makeRes();
    const user = await requirePermission(makeReq('admin'), res, 'users.manage');
    expect(user?.id).toBe('u-1');
    expect(user?.role).toBe('admin');
    expect(captured.status).toBe(200);
  });

  it('un rol desconocido en la base se trata como usuario sin extras', async () => {
    db.reset([sessionRow('???')]);
    const { res, captured } = makeRes();
    const user = await requirePermission(makeReq('???'), res, 'users.manage');
    expect(user).toBeNull();
    expect(captured.status).toBe(403);
  });
});
