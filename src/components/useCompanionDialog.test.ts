import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El globo de Livi antes se desmontaba de golpe: React lo eliminaba del DOM en el
 * mismo instante en que el mensaje llegaba a null, asi que la animacion de salida
 * no existia.
 *
 * Estos tests fijan la maquina de estados que hace posible animarla. Se replica
 * aqui en vez de montar el hook porque el proyecto no tiene jsdom ni libreria de
 * render en test, y anadir una dependencia por un test no compensa: lo que se
 * verifica es la logica de tiempos, que es lo que estaba mal.
 *
 * Los valores EXIT_MS y VISIBLE_MS tienen que coincidir con
 * useCompanionDialog.ts, y ese a su vez con home-companion-dialog-out de
 * HomeCompanion.css.
 */
const EXIT_MS = 180;
const VISIBLE_MS = 6000;

/** Espejo del hook, con los mismos temporizadores y la misma regla de salida. */
function crearDialogo() {
  let message: string | null = null;
  let leaving = false;
  let vigente: string | null = null;
  let automaticCount = 0;
  let pendingPriority = -1;
  let lastDisplayed: number | null = null;

  const pendientes = new Map<string, ReturnType<typeof setTimeout>>();
  // Quitar un temporizador del mapa no lo cancela: hay que limpiarlo. El hook
  // real usa clearTimeout, y el espejo tiene que hacerlo igual o el test de
  // "un texto nuevo durante la salida" passaria sin querer.
  const cancelar = (nombre: string) => {
    const t = pendientes.get(nombre);
    if (t !== undefined) clearTimeout(t);
    pendientes.delete(nombre);
  };

  const cerrar = () => {
    cancelar('hide');
    if (vigente === null) return;
    leaving = true;
    pendientes.set('unmount', setTimeout(() => {
      vigente = null;
      leaving = false;
      message = null;
    }, EXIT_MS));
  };

  const mostrar = (texto: string) => {
    cancelar('hide');
    cancelar('unmount');
    vigente = texto;
    leaving = false;
    lastDisplayed = Date.now();
    message = texto;
    pendientes.set('hide', setTimeout(cerrar, VISIBLE_MS));
  };

  const encolar = (texto: string, prioridad = 0, espera = 0) => {
    if (automaticCount >= 2 || prioridad < pendingPriority) return;
    cancelar('pending');
    pendingPriority = prioridad;
    const restante = lastDisplayed === null ? 0 : Math.max(0, 60000 - (Date.now() - lastDisplayed));
    pendientes.set('pending', setTimeout(() => {
      pendingPriority = -1;
      if (automaticCount >= 2) return;
      automaticCount++;
      mostrar(texto);
    }, Math.max(espera, restante)));
  };

  const descartar = () => {
    cancelar('pending');
    automaticCount = 2;
    pendingPriority = -1;
    cerrar();
  };

  const estado = () => ({ message, leaving });
  const limpiar = () => { for (const t of pendientes.values()) clearTimeout(t); pendientes.clear(); };
  return { estado, mostrar, encolar, descartar, limpiar };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('diálogo de la mascota: salida animable', () => {
  it('no muestra nada hasta que hay un mensaje', () => {
    const d = crearDialogo();
    expect(d.estado()).toEqual({ message: null, leaving: false });
  });

  it('al mostrar un texto lo marca visible y no como saliendo', () => {
    const d = crearDialogo();
    d.mostrar('Aquí estoy.');
    expect(d.estado()).toEqual({ message: 'Aquí estoy.', leaving: false });
  });

  it('mantiene el texto montado mientras se anima la salida', () => {
    const d = crearDialogo();
    d.mostrar('Aquí estoy.');
    vi.advanceTimersByTime(VISIBLE_MS);

    // El mensaje agoto su tiempo, pero el globo sigue montado: es lo que
    // permite que la animacion de salida llegue a verse. Antes se desmontaba
    // aqui mismo y por eso no habia animacion que mostrar.
    expect(d.estado().leaving).toBe(true);
    expect(d.estado().message).toBe('Aquí estoy.');
  });

  it('desmonta el globo al terminar la animacion de salida', () => {
    const d = crearDialogo();
    d.mostrar('Aquí estoy.');
    vi.advanceTimersByTime(VISIBLE_MS + EXIT_MS);
    expect(d.estado()).toEqual({ message: null, leaving: false });
  });

  it('cerrar a mano tambien pasa por la salida, no se corta en seco', () => {
    const d = crearDialogo();
    d.mostrar('Aquí estoy.');
    d.descartar();
    expect(d.estado()).toEqual({ message: 'Aquí estoy.', leaving: true });

    vi.advanceTimersByTime(EXIT_MS);
    expect(d.estado().message).toBeNull();
  });

  it('un texto nuevo durante la salida cancela el desmontaje', () => {
    const d = crearDialogo();
    d.mostrar('Primero.');
    vi.advanceTimersByTime(VISIBLE_MS);
    expect(d.estado().leaving).toBe(true);

    // Llega otro texto cuando el globo ya se estaba desvaneciendo. Sin
    // cancelar el temporizador de unmount, el globo se llevaria por delante el
    // texto nuevo a mitad de camino.
    d.mostrar('Segundo.');
    expect(d.estado()).toEqual({ message: 'Segundo.', leaving: false });

    vi.advanceTimersByTime(EXIT_MS);
    expect(d.estado().message).toBe('Segundo.');
  });

  it('cerrar dos veces seguidas no deja el estado a medias', () => {
    const d = crearDialogo();
    d.mostrar('Aquí estoy.');
    d.descartar();
    vi.advanceTimersByTime(EXIT_MS);

    // Ya no hay nada visible: un segundo cierre no debe dejar leaving colgado.
    d.descartar();
    expect(d.estado()).toEqual({ message: null, leaving: false });
  });

  it('descartar cancela los automaticos pendientes', () => {
    const d = crearDialogo();
    d.encolar('Programado', 0, 500);
    d.descartar();
    vi.advanceTimersByTime(2000);
    expect(d.estado().message).toBeNull();
  });

  it('los automaticos quedan separados por la ventana de 60 s', () => {
    const d = crearDialogo();
    d.encolar('Uno', 0, 0);
    vi.advanceTimersByTime(10);
    expect(d.estado().message).toBe('Uno');

    // El hook no encadena automátivos seguidos: entre uno y el siguiente pasa
    // un minuto, para que el globo no canse a quien abre la app a diario.
    d.encolar('Dos', 0, 0);
    vi.advanceTimersByTime(1000);
    expect(d.estado().message).toBe('Uno');

    vi.advanceTimersByTime(60000);
    expect(d.estado().message).toBe('Dos');
  });

  it('no encadena un tercer automatico en la misma visita', () => {
    const d = crearDialogo();
    d.encolar('Uno', 0, 0);
    vi.advanceTimersByTime(10);
    d.encolar('Dos', 0, 0);
    vi.advanceTimersByTime(60010);

    d.encolar('Tres', 0, 0);
    vi.advanceTimersByTime(60010);

    // Tres superaria el tope de dos por visita.
    expect(d.estado().message).not.toBe('Tres');
  });
});

describe('coherencia entre el hook y el CSS', () => {
  it('EXIT_MS coincide con la duracion de home-companion-dialog-out', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');

    const aqui = dirname(fileURLToPath(import.meta.url));
    const hook = readFileSync(join(aqui, 'useCompanionDialog.ts'), 'utf8');
    const css = readFileSync(join(aqui, 'HomeCompanion.css'), 'utf8');

    const delHook = Number(hook.match(/EXIT_MS = (\d+)/)?.[1]);
    const delCss = Number(css.match(/home-companion-dialog-out (\d+)ms/)?.[1]);

    expect(delHook).toBeGreaterThan(0);
    // Si el CSS durara mas que el JS, el globo se cortaria a media salida; si
    // durara menos, se quedaria congelado un instante. Por eso se comparan.
    expect(delCss).toBe(delHook);
  });

  it('la animacion de salida se anula tambien con prefers-reduced-motion', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const aqui = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(aqui, 'HomeCompanion.css'), 'utf8');

    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    // Sin esto, la regla de salida (declarada despues y con selector de
    // atributo) ganaria a la de entrada y el globo se moveria aunque la
    // persona haya pedido menos movimiento.
    expect(bloque).toMatch(/\.home-companion-dialog\[data-leaving\]\s*\{[^}]*animation:\s*none/);
  });
});