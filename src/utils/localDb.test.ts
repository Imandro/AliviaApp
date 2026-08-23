import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

vi.mock('./apiBase', () => ({ API_BASE: '', PROD_API_ORIGIN: 'https://test.local' }));

describe('localDb — actualizaciones optimistas offline', () => {
  let localDb: typeof import('./localDb');

  beforeEach(async () => {
    resetStorage();
    vi.restoreAllMocks();
    vi.resetModules();
    localDb = await import('./localDb');
  });

  it('saveTodayMood sin red: guarda en caché y devuelve el historial actualizado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    const history = await localDb.saveTodayMood(4, 'día tranquilo');

    expect(history).toHaveLength(1);
    expect(history[0].score).toBe(4);
    expect(history[0].note).toBe('día tranquilo');
  });

  it('saveTodayMood dos veces el mismo día: actualiza en lugar de duplicar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    await localDb.saveTodayMood(2);
    const history = await localDb.saveTodayMood(5);

    expect(history).toHaveLength(1);
    expect(history[0].score).toBe(5);
  });

  it('createPost sin red: sintetiza id temporal y aparece en getPosts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    const post = await localDb.createPost('Hoy respiré mejor', 'ansiedad', 'Anónimo');

    expect(post.id).toBeLessThan(0); // id temporal
    expect(post.topic).toBe('ansiedad');

    const feed = await localDb.getPosts();
    expect(feed.some((p) => p.id === post.id)).toBe(true);
  });

  it('likePost sin red: incrementa likes en la caché local', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const post = await localDb.createPost('primer post', 'todos', 'Anónimo');

    await localDb.likePost(post.id);

    const feed = await localDb.getPosts();
    expect(feed.find((p) => p.id === post.id)?.likes).toBe(1);
  });

  it('saveCompletedActivity sin red: se refleja en estadísticas y racha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    await localDb.saveCompletedActivity('box-breathing', 'Respiración Box');

    const stats = await localDb.getActivityStats();
    expect(stats['box-breathing']).toBe(1);

    const streak = await localDb.getCompletionStreak();
    expect(streak).toBeGreaterThanOrEqual(1);
  });
});
