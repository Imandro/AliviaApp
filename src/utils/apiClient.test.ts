import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

vi.mock('./apiBase', () => ({ API_BASE: '', PROD_API_ORIGIN: 'https://test.local' }));

describe('apiClient — motor offline-first', () => {
  let apiClient: typeof import('./apiClient');

  beforeEach(async () => {
    resetStorage();
    vi.restoreAllMocks();
    vi.resetModules();
    apiClient = await import('./apiClient');
  });

  const okResponse = (json: unknown) =>
    ({ ok: true, status: 200, json: async () => json }) as Response;

  it('GET exitoso: devuelve JSON y lo guarda en caché', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse([{ score: 4 }])));

    const data = await apiClient.apiGet<unknown[]>('/api/moods');

    expect(data).toEqual([{ score: 4 }]);
    expect(apiClient.readCache('/api/moods')).toEqual([{ score: 4 }]);
  });

  it('GET sin red: sirve la última respuesta cacheada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(okResponse({ items: [1, 2] }))
        .mockRejectedValueOnce(new TypeError('network down'))
    );

    await apiClient.apiGet('/api/plan');
    const cached = await apiClient.apiGet('/api/plan');

    expect(cached).toEqual({ items: [1, 2] });
  });

  it('GET sin red y sin caché: lanza error de red', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await expect(apiClient.apiGet('/api/nada')).rejects.toThrow();
  });

  it('Mutación exitosa no encola', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({ id: 1 })));
    await apiClient.apiMutate('/api/moods', { method: 'POST', body: '{}' });
    expect(apiClient.pendingCount()).toBe(0);
  });

  it('Mutación sin red: se encola y lanza OfflineQueuedError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    await expect(
      apiClient.apiMutate('/api/moods', { method: 'POST', body: '{"score":3}' })
    ).rejects.toThrow();

    expect(apiClient.pendingCount()).toBe(1);
  });

  it('flushOutbox reenvía en orden FIFO y limpia la cola al éxito', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => okResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    // Encola dos mutaciones sin red
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await apiClient.apiMutate('/api/a', { method: 'POST', body: 'A' }).catch(() => {});
    await apiClient.apiMutate('/api/b', { method: 'PUT', body: 'B' }).catch(() => {});
    expect(apiClient.pendingCount()).toBe(2);

    // Vuelve la conexión: el flush envía A primero, luego B
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.flushOutbox();

    expect(apiClient.pendingCount()).toBe(0);
    const paths = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(paths.indexOf('/api/a')).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf('/api/b')).toBeGreaterThan(paths.indexOf('/api/a'));
  });

  it('flushOutbox descarta errores 4xx permanentes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await apiClient.apiMutate('/api/malo', { method: 'POST', body: '{}' }).catch(() => {});

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, json: async () => null }) as Response));
    await apiClient.flushOutbox();

    expect(apiClient.pendingCount()).toBe(0);
  });

  it('flushOutbox conserva el resto si la primera falla por red (pausa ordenada)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await apiClient.apiMutate('/api/x', { method: 'POST', body: 'X' }).catch(() => {});
    await apiClient.apiMutate('/api/y', { method: 'POST', body: 'Y' }).catch(() => {});

    // Primer intento falla por red; nunca debería llamarse /api/y
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      throw new TypeError('still offline');
    }));
    await apiClient.flushOutbox();

    expect(calls).toBe(1);
    expect(apiClient.pendingCount()).toBe(2);
  });
});
