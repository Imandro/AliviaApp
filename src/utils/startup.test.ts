import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signalScreenReady } from './startup';

const script = readFileSync(new URL('../../public/startup.js', import.meta.url), 'utf8');

function setup(reducedMotion = false) {
  const classes = new Set<string>();
  const overlay = Object.assign(new EventTarget(), {
    setAttribute: vi.fn(),
    classList: { add: (name: string) => classes.add(name) },
    remove: vi.fn(),
  });
  const root = { removeAttribute: vi.fn() };
  const recovery = { hidden: true };
  const retry = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => motion,
    location: { reload: vi.fn() },
  });
  const elements = { 'app-preloader': overlay, root, 'startup-recovery': recovery, 'startup-retry': retry };
  runInNewContext(script, {
    window,
    document: { getElementById: (id: keyof typeof elements) => elements[id] },
    performance, setTimeout, clearTimeout,
  });
  return { window, overlay, root, recovery, retry, motion, classes };
}

describe('arranque de ALIVIA', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('window.load no descubre una pantalla que React todavía no terminó', () => {
    const { window, overlay, recovery } = setup();
    window.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(12000);
    expect(overlay.remove).not.toHaveBeenCalled();
    expect(recovery.hidden).toBe(false);
  });

  it('termina la entrada breve antes de desvanecerse, incluso con StrictMode', () => {
    const { window, overlay, root, classes } = setup();
    window.dispatchEvent(new Event('alivia:screen-ready'));
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(799);
    expect(classes.has('is-leaving')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(classes.has('is-leaving')).toBe(true);
    expect(root.removeAttribute).not.toHaveBeenCalled();
    vi.advanceTimersByTime(440);
    expect(overlay.remove).toHaveBeenCalledTimes(1);
    expect(root.removeAttribute).toHaveBeenCalledWith('inert');
  });

  it('no vuelve a añadir la duración de entrada a una carga lenta', () => {
    const { window, classes } = setup();
    vi.advanceTimersByTime(5000);
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(0);
    expect(classes.has('is-leaving')).toBe(true);
  });

  it('omite la espera y el movimiento cuando el usuario lo solicita', () => {
    const { window, overlay } = setup(true);
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(0);
    expect(overlay.remove).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('atiende cambios de movimiento reducido durante la salida', () => {
    const { window, overlay, motion } = setup();
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(800);
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    expect(overlay.remove).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ofrece reintentar si el bundle falla y se recupera si llega a estar listo', () => {
    const { window, recovery, retry, overlay } = setup();
    vi.advanceTimersByTime(12000);
    expect(recovery.hidden).toBe(false);
    retry.dispatchEvent(new Event('click'));
    expect(window.location.reload).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(440);
    expect(overlay.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libera una pantalla lista si no se pudo descargar startup.js', () => {
    const overlay = { hasAttribute: () => false, remove: vi.fn() };
    const root = { removeAttribute: vi.fn() };
    vi.stubGlobal('document', { getElementById: (id: string) => id === 'root' ? root : overlay });
    signalScreenReady();
    expect(overlay.remove).toHaveBeenCalledOnce();
    expect(root.removeAttribute).toHaveBeenCalledWith('inert');
  });
});
