import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GAMES } from './gamesCatalog';

/**
 * Prueba de humo del render: monta cada juego en SSR.
 * Los efectos no corren en node, así que esto no cubre canvas ni puntero,
 * pero sí atrapa imports rotos, JSX inválido y crashes en tiempo de render.
 */
const COMPONENTS: Record<string, () => unknown> = {
  moneda: () => import('../games/CoinPolish'),
  pila: () => import('../games/BlockStack'),
  marimba: () => import('../games/Marimba'),
  dardos: () => import('../games/Darts'),
  hilos: () => import('../games/Threading'),
  barrer: () => import('../games/SweepDust'),
  doblar: () => import('../games/PaperFold'),
  bandejas: () => import('../games/SortTokens'),
};

describe('juegos: render en SSR', () => {
  it('el catálogo y el registro de componentes están sincronizados', () => {
    expect(GAMES.map(g => g.id).sort()).toEqual(Object.keys(COMPONENTS).sort());
  });

  it.each(GAMES.map(g => g.id))('monta "%s" sin fallar', async id => {
    const mod = (await COMPONENTS[id]()) as Record<string, unknown>;
    const keys = Object.keys(mod);
    const Game = mod[keys.find(k => k !== 'default') ?? 'default'] as never;
    expect(typeof Game).toBe('function');

    const html = renderToStaticMarkup(
      createElement(Game as never, { onExit: () => undefined }),
    );
    expect(html.length).toBeGreaterThan(200);
    // Ningún juego debe montar un emoji como identidad visual.
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
