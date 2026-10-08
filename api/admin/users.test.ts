import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ApiRequest, ApiResponse } from '../_types.js';

/* Cola de respuestas del pool: la primera llamada resuelve la sesión y las
 * siguientes devuelven lo que las fn_* responderían. Además se registran las
 * llamadas (texto + argumentos) para poder afirmar qué recibió la BD. */
const { db } = vi.hoisted(() => {
  return {
    db: {
      queue: [] as any[][],
      calls: [] as { text: string; args: any[] }[],
      nextError: null as Error | null,
      reset(rows: any[][] = []) {
        this.queue = rows;
        this.calls = [];
        this.nextError = null;
      },
      getPool: () => ({
        query: async (text: string, args: any[] = []) => {
          db.calls.push({ text, args });
          // El error simulado estalla en la función de administración, no en
          // la resolución de sesión: así se prueba el mapeo del PATCH real.
          if (db.nextError && text.includes('fn_admin')) {
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

vi.mock('../_db.js', () => db);

import usersHandler from './users.js';

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

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

const sessionRow = (role: string) => [
  { id: role === 'admin' ? ADMIN_ID : 'u-2', name: 'Admin', username: 'admin', email: 'a@a.local', role },
];

const makeReq = (over: Partial<ApiRequest> = {}): ApiRequest =>
  ({
    method: 'GET',
    url: '/api/admin/users',
    query: {},
    headers: { authorization: 'Bearer tok' },
    ...over,
  }) as ApiRequest;

/** Índice de la primera llamada a función de administración (tras la sesión). */
const adminCall = () => db.calls.find((c) => c.text.includes('fn_'));

beforeEach(() => {
  db.reset();
});

describe('/api/admin/users', () => {
  it('rechaza métodos que no sean GET ni PATCH', async () => {
    const { res, captured } = makeRes();
    await usersHandler(makeReq({ method: 'PUT' }), res);
    expect(captured.status).toBe(405);
  });

  it('responde 401 sin sesión', async () => {
    const { res, captured } = makeRes();
    await usersHandler(makeReq({ headers: {} }), res);
    expect(captured.status).toBe(401);
  });

  it('responde 403 a un usuario sin permiso de gestión', async () => {
    db.reset([sessionRow('usuario')]);
    const { res, captured } = makeRes();
    await usersHandler(makeReq(), res);
    expect(captured.status).toBe(403);
  });

  it('lista cuentas para un admin sin exponer password_hash', async () => {
    db.reset([
      sessionRow('admin'),
      [
        {
          id: TARGET_ID, username: 'ana', email: 'ana@a.local', name: 'Ana',
          role: 'usuario', is_active: true, onboarding_done: true,
          created_at: '2026-01-01T00:00:00Z', last_access: null,
        },
      ],
    ]);
    const { res, captured } = makeRes();
    await usersHandler(makeReq(), res);
    expect(captured.status).toBe(200);
    const users = captured.body as any[];
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('ana');
    expect(JSON.stringify(users)).not.toContain('password');
  });

  it('pasa el término de búsqueda (?q=) a fn_list_users como argumento', async () => {
    db.reset([sessionRow('admin'), [[]]]);
    const { res, captured } = makeRes();
    await usersHandler(makeReq({ query: { q: 'ana' } }), res);
    expect(captured.status).toBe(200);
    expect(adminCall()?.args).toEqual(['ana']);
  });

  it('sin ?q= la búsqueda viaja como NULL (listado completo)', async () => {
    db.reset([sessionRow('admin'), [[]]]);
    const { res, captured } = makeRes();
    await usersHandler(makeReq(), res);
    expect(captured.status).toBe(200);
    expect(adminCall()?.args).toEqual([null]);
  });

  it('rechaza un userId malformado', async () => {
    db.reset([sessionRow('admin')]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: 'no-un-uuid', role: 'auditor' } }),
      res
    );
    expect(captured.status).toBe(400);
  });

  it('rechaza un rol fuera del catálogo aunque venga de la interfaz', async () => {
    db.reset([sessionRow('admin')]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID, role: 'superuser' } }),
      res
    );
    expect(captured.status).toBe(400);
  });

  it('pide al menos un cambio (rol o estado)', async () => {
    db.reset([sessionRow('admin')]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID } }),
      res
    );
    expect(captured.status).toBe(400);
  });

  it('con solo rol, el estado viaja como NULL (no se toca) en una única llamada', async () => {
    db.reset([
      sessionRow('admin'),
      [
        {
          o_id: TARGET_ID, o_username: 'ana', o_email: 'ana@a.local',
          o_name: 'Ana', o_role: 'auditor', o_is_active: true,
        },
      ],
    ]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID, role: 'auditor' } }),
      res
    );
    expect(captured.status).toBe(200);
    expect(db.calls.filter((c) => c.text.includes('fn_admin_update_user'))).toHaveLength(1);
    expect(adminCall()?.args).toEqual([ADMIN_ID, TARGET_ID, 'auditor', null]);
    expect(captured.body).toEqual({
      id: TARGET_ID, username: 'ana', email: 'ana@a.local',
      name: 'Ana', role: 'auditor', is_active: true,
    });
  });

  it('con solo estado, el rol viaja como NULL', async () => {
    db.reset([
      sessionRow('admin'),
      [
        {
          o_id: TARGET_ID, o_username: 'ana', o_email: 'ana@a.local',
          o_name: 'Ana', o_role: 'usuario', o_is_active: false,
        },
      ],
    ]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID, is_active: false } }),
      res
    );
    expect(captured.status).toBe(200);
    expect(adminCall()?.args).toEqual([ADMIN_ID, TARGET_ID, null, false]);
  });

  it('con rol y estado juntos, UNA sola llamada atómica', async () => {
    db.reset([
      sessionRow('admin'),
      [
        {
          o_id: TARGET_ID, o_username: 'ana', o_email: 'ana@a.local',
          o_name: 'Ana', o_role: 'auditor', o_is_active: false,
        },
      ],
    ]);
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID, role: 'auditor', is_active: false } }),
      res
    );
    expect(captured.status).toBe(200);
    expect(db.calls.filter((c) => c.text.includes('fn_admin_update_user'))).toHaveLength(1);
    expect(adminCall()?.args).toEqual([ADMIN_ID, TARGET_ID, 'auditor', false]);
  });

  it('traduce el bloqueo de la BD (rol propio) a 403 con su mensaje', async () => {
    db.reset([sessionRow('admin')]);
    db.nextError = new Error('No puedes cambiar tu propio rol');
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: ADMIN_ID, role: 'auditor' } }),
      res
    );
    expect(captured.status).toBe(403);
    expect((captured.body as { error: string }).error).toContain('propio rol');
  });

  it('traduce la protección del último admin a 409', async () => {
    db.reset([sessionRow('admin')]);
    db.nextError = new Error('Debe quedar al menos un administrador activo');
    const { res, captured } = makeRes();
    await usersHandler(
      makeReq({ method: 'PATCH', body: { userId: TARGET_ID, role: 'usuario' } }),
      res
    );
    expect(captured.status).toBe(409);
  });
});
