import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

vi.mock('./apiBase', () => ({ API_BASE: '' }));
vi.mock('./auth', () => ({ getAuthHeaders: () => ({ Authorization: 'Bearer technical-test' }) }));

describe('assessment authenticated persistence', () => {
  beforeEach(() => {
    resetStorage();
    vi.restoreAllMocks();
  });

  it('consulta el historial usando la sesión del usuario', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ id: 42 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { getMyAssessments } = await import('./assessment');
    expect(await getMyAssessments()).toEqual([{ id: 42 }]);
    expect(fetchMock.mock.calls[0]).toEqual([
      '/api/assessments',
      expect.objectContaining({ headers: { Authorization: 'Bearer technical-test' } }),
    ]);
  });

  it('conserva el ID positivo del servidor al guardar el chequeo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ id: 42 }) })));
    const { saveAssessment } = await import('./assessment');
    const saved = await saveAssessment({ stress: 0, anxiety: 0, depression: 0, level: 'baja', crisis: false, recommendations: [] });
    expect(saved?.id).toBe(42);
    expect(JSON.parse(localStorage.getItem('alivia_cache:/api/assessments') ?? '[]')[0].id).toBe(42);
  });
});
