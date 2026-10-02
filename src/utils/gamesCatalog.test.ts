import { describe, expect, it } from 'vitest';
import { GAMES, getGame } from './gamesCatalog';

const ICON_NAMES = ['coins', 'blocks', 'marimba', 'target', 'thread', 'broom', 'paper', 'trays'];
const ACCENT_VARS = ['gold', 'sage', 'lavender', 'rose', 'warm'];

describe('gamesCatalog', () => {
  it('tiene juegos y todos con id único', () => {
    expect(GAMES.length).toBeGreaterThan(0);
    const ids = GAMES.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa un nombre de icono por juego, sin repetir', () => {
    const icons = GAMES.map(g => g.icon);
    expect(new Set(icons).size).toBe(icons.length);
    icons.forEach(icon => expect(ICON_NAMES).toContain(icon));
  });

  it('no usa emoji: todos los iconos son nombres, no caracteres', () => {
    GAMES.forEach(game => {
      expect(typeof game.icon).toBe('string');
      // Si alguien reintrodujera un emoji aquí, no coincidiría con ningún nombre.
      expect(ICON_NAMES).toContain(game.icon);
      // @ts-expect-error el campo emoji no debe existir en el tipo
      expect(game.emoji).toBeUndefined();
    });
  });

  it('no ofrece ninguna mecánica con meta: sin tiempos ni puntuaciones', () => {
    GAMES.forEach(game => {
      // @ts-expect-error `minutes` se sustituyó por `pace`, que nunca es un tiempo
      expect(game.minutes).toBeUndefined();
      expect(game.pace.toLowerCase()).not.toMatch(/\d/);
    });
  });

  it('declara para quién es cada juego', () => {
    GAMES.forEach(game => {
      expect(game.forWhom.length).toBeGreaterThan(0);
      game.forWhom.forEach(w => expect(w.trim().length).toBeGreaterThan(0));
    });
  });

  it('usa los acentos y degradados del sistema de diseño', () => {
    GAMES.forEach(game => {
      const accent = ACCENT_VARS.find(v => game.accent === `var(--accent-${v})`);
      expect(accent, `accent inválido en ${game.id}`).toBeDefined();
      expect(game.gradient).toContain(`var(--accent-${accent}-rgb)`);
    });
  });

  it('getGame resuelve por id y devuelve undefined si no existe', () => {
    GAMES.forEach(game => expect(getGame(game.id)).toBe(game));
    expect(getGame('no-existe')).toBeUndefined();
  });
});
