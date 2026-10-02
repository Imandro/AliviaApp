import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signalScreenReady } from './startup';

const script = readFileSync(new URL('../../public/startup.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

function setup(reducedMotion = false, device = {}, opts: { desktop?: boolean; landingFlag?: string } = {}) {
  const { desktop = false, landingFlag } = opts;
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
  const location = { reload: vi.fn(), replace: vi.fn() };
  const window = Object.assign(new EventTarget(), {
    navigator: device,
// El script pregunta por prefers-reduced-motion y por el tamano de pantalla
    // (para alargar la animacion en laptop), asi que matchMedia tiene que
    // responder distinto segun la media query.
    matchMedia: (query: string) => (query.includes('prefers-reduced-motion') ? motion : { matches: desktop }),
    location,
  });
  const store = new Map<string, string>();
  if (landingFlag) store.set('alivia:landing-v1', landingFlag);
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const elements = { 'app-preloader': overlay, root, 'startup-recovery': recovery, 'startup-retry': retry };
  runInNewContext(script, {
    window,
    document: { getElementById: (id: keyof typeof elements) => elements[id], addEventListener() {} },
    localStorage,
    navigator: device,
    location,
    performance, setTimeout, clearTimeout,
  });
  return { window, overlay, root, recovery, retry, motion, classes, location, store };
}

describe('arranque de ALIVIA', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('mantiene la presentación de laptop cuatro segundos antes de salir', () => {
    const { window, classes, overlay } = setup(false, {}, { desktop: true });
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(3999);
    expect(classes.has('is-leaving')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(classes.has('is-leaving')).toBe(true);
    vi.advanceTimersByTime(730);
    expect(overlay.remove).toHaveBeenCalledOnce();
  });

  it('cuenta la descarga lenta dentro de la espera mínima de laptop', () => {
    const { window, classes } = setup(false, {}, { desktop: true });
    vi.advanceTimersByTime(5000);
    window.dispatchEvent(new Event('alivia:screen-ready'));
    vi.advanceTimersByTime(0);
    expect(classes.has('is-leaving')).toBe(true);
  });

  it.each([{ hardwareConcurrency: 2 }, { connection: { saveData: true } }])('usa la presentación ligera en dispositivos limitados: %j', (device) => {
    const { overlay } = setup(false, device);
    expect(overlay.setAttribute).toHaveBeenCalledWith('data-lite', '');
  });

  it('el HTML inicial incluye estilo, arte y recuperación sin descargas adicionales', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const css = readFileSync(new URL('../components/LoadingBrand.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(html).toContain(script);
    expect(html).toContain(css);
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('href="/src/components/LoadingBrand.css"');
    expect(html).not.toContain('src="%BASE_URL%startup.js"');
  });

  it('la primera visita manda a la landing y no deja entrar en la app', () => {
    const { location } = setup();
    expect(location.replace).toHaveBeenCalledWith('/landing.html');
  });

  it('con el flag puesto entra directo a la app, sin volver a la landing', () => {
    const { location } = setup(false, {}, { landingFlag: '1' });
    expect(location.replace).not.toHaveBeenCalled();
  });

  it('un buscador no aterriza en la landing (si no, Google indexaria la presentación)', () => {
    const { location, store } = setup(false, { userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' });
    expect(location.replace).not.toHaveBeenCalled();
    expect(store.get('alivia:landing-v1')).toBe('1');
  });

  it('si localStorage está bloqueado no rompe el arranque', () => {
    // Modo privado o WebView restrictiva: es preferible dejar entrar a la app
    // antes que dejar a nadie atrapado en un bucle de redirección.
    const boom = new Proxy({}, { get() { throw new Error('bloqueado'); } });
    expect(() => runInNewContext(script, {
      window: { navigator: {}, matchMedia: () => ({ matches: false, addEventListener() {} }), location: { replace: vi.fn() } },
      document: { getElementById: () => null, addEventListener() {} },
      localStorage: boom,
      navigator: { userAgent: 'Mozilla/5.0' },
      performance, setTimeout, clearTimeout,
    })).not.toThrow();
  });

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
    vi.advanceTimersByTime(2799);
    expect(classes.has('is-leaving')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(classes.has('is-leaving')).toBe(true);
    expect(root.removeAttribute).not.toHaveBeenCalled();
    vi.advanceTimersByTime(730);
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
    vi.advanceTimersByTime(2800);
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
    vi.advanceTimersByTime(730);
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

  it('espera al CSS de la app antes de retirar la marca en una red lenta', () => {
    const stylesheet = Object.assign(new EventTarget(), { sheet: null });
    const ready = vi.fn();
    const target = new EventTarget();
    target.addEventListener('alivia:screen-ready', ready);
    vi.stubGlobal('window', target);
    vi.stubGlobal('document', {
      getElementById: () => ({ hasAttribute: () => true }),
      querySelector: () => stylesheet,
    });
    signalScreenReady();
    expect(ready).not.toHaveBeenCalled();
    stylesheet.dispatchEvent(new Event('load'));
    expect(ready).toHaveBeenCalledOnce();
  });
});
