import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '../_types.js';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../_db.js', () => ({ ensureSchema: vi.fn(), ensureFunctions: vi.fn(), getPool: () => ({ query }) }));
vi.mock('../_cors.js', () => ({ applyCors: () => false }));
vi.mock('./_auth.js', () => ({ getUserFromRequest: async () => ({ id: 'test-user' }), toSafeUser: (row: unknown) => row, PHONE_RE: /^\+?\d{8,15}$/ }));
import handler from './profile';

describe('optional profile fields', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [{ id: 'test-user', phone: '+50588888888', trusted_person: 'Before', trusted_phone: '+50588888888', goals_text: 'Before' }] });
    query.mockResolvedValue({ rows: [{ id: 'test-user' }] });
  });
  const response = () => {
    const res = { status: vi.fn(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn(), end: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as ApiResponse;
  };
  it('accepts an empty optional phone and saves cleared fields as SQL null', async () => {
    const res = response();
    await handler({ method: 'PUT', query: {}, headers: {}, body: { phone: null, trusted_person: null, trusted_phone: null, goals_text: null } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const values = query.mock.calls[1][1];
    for (const index of [4, 5, 8, 10]) expect(values[index]).toBeNull();
  });
  it('still rejects a nonempty invalid phone without writing the profile', async () => {
    const res = response();
    await handler({ method: 'PUT', query: {}, headers: {}, body: { phone: 'invalid' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('preserves existing optional fields omitted in a partial update', async () => {
    const res = response();
    await handler({ method: 'PUT', query: {}, headers: {}, body: { goals_text: ' Updated ' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(query.mock.calls[1][1][10]).toBe('+50588888888');
    expect(query.mock.calls[1][1][4]).toBe('Before');
    expect(query.mock.calls[1][1][8]).toBe('Updated');
  });
});
