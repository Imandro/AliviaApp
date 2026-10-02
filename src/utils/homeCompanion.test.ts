import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateHomeCompanion, getHomeMoodStreak } from './homeCompanion';

async function fixture(reduced = false, failures: number[] = [], options: { inactive?: boolean; celebrate?: boolean } = {}) {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const page = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('document', page);
  vi.stubGlobal('window', { matchMedia: () => motion });
  vi.stubGlobal('navigator', {});
  const element = { dataset: { pose: 'normal' }, hidden: false, querySelectorAll: () =>
    [0, 1, 2, 3, 4, 5, 6].map(index => ({ decode: () => failures.includes(index) ? Promise.reject(new Error('network')) : Promise.resolve() })) };
  const dispose = animateHomeCompanion(element as unknown as HTMLElement, options);
  await vi.advanceTimersByTimeAsync(0);
  return { page, motion, element, dispose };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('mascota de Inicio', () => {
  it('activa la racha con el registro de hoy, sin desplazar la fecha a ayer', () => {
    expect(getHomeMoodStreak(['2026-10-02'], '2026-10-02')).toBe(1);
    expect(getHomeMoodStreak(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-02'], '2026-10-02')).toBe(3);
    expect(getHomeMoodStreak(['2026-10-01'], '2026-10-02')).toBe(0);
    expect(getHomeMoodStreak(['2026-10-02', '2026-09-30'], '2026-10-02')).toBe(1);
  });
  it('parpadea brevemente y vuelve a la pose normal', async () => {
    const { element, dispose } = await fixture();
    await vi.advanceTimersByTimeAsync(1000);
    expect(element.dataset.pose).toBe('blink');
    await vi.advanceTimersByTimeAsync(180);
    expect(element.dataset.pose).toBe('normal');
    dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('detiene los temporizadores en segundo plano y al salir de Inicio', async () => {
    const { page, element, dispose } = await fixture();
    page.hidden = true;
    page.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    page.hidden = false;
    page.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(1);
    dispose();
    page.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    expect(element.dataset.pose).toBe('normal');
  });
  it('mantiene el parpadeo con movimiento reducido sin usar bucles de movimiento', async () => {
    const { motion, element, dispose } = await fixture(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(element.dataset.pose).toBe('blink');
    motion.matches = false;
    motion.dispatchEvent(new Event('change'));
    expect(vi.getTimerCount()).toBe(1);
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    expect(vi.getTimerCount()).toBe(1);
    dispose();
  });
  it('no sustituye el logo por una pose que no se descargó', async () => {
    const { element, dispose } = await fixture(false, [1, 2, 3, 4, 5, 6]);
    expect(vi.getTimerCount()).toBe(0);
    expect(element.hidden).toBe(false);
    expect(element.dataset.pose).toBe('normal');
    dispose();
  });
  it('mantiene la cara triste sin racha y vuelve a ella después de parpadear', async () => {
    const { element, dispose } = await fixture(false, [], { inactive: true });
    expect(element.dataset.pose).toBe('sad');
    await vi.advanceTimersByTimeAsync(1180);
    expect(element.dataset.pose).toBe('sad');
    await vi.advanceTimersByTimeAsync(2400);
    expect(element.dataset.pose).toBe('caring');
    await vi.advanceTimersByTimeAsync(1400);
    expect(element.dataset.pose).toBe('sad');
    dispose();
  });
  it('celebra una activación y después vuelve al ciclo habitual', async () => {
    const { element, dispose } = await fixture(false, [], { celebrate: true });
    expect(element.dataset.pose).toBe('celebrate');
    await vi.advanceTimersByTimeAsync(1800);
    expect(element.dataset.pose).toBe('normal');
    dispose();
  });
  it('muestra la expresión feliz con movimiento reducido; CSS omite los saltos', async () => {
    const { element, dispose } = await fixture(true, [], { celebrate: true });
    expect(element.dataset.pose).toBe('celebrate');
    expect(vi.getTimerCount()).toBe(1);
    dispose();
  });
  it('alterna las otras expresiones solo con racha activa', async () => {
    const { element, dispose } = await fixture();
    await vi.advanceTimersByTimeAsync(1180 + 2400);
    expect(element.dataset.pose).toBe('happy');
    await vi.advanceTimersByTimeAsync(1400 + 2580 + 2400);
    expect(element.dataset.pose).toBe('caring');
    dispose();
  });
});
