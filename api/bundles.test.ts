import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

/**
 * Los bundles de las tres Lambdas se cargan de verdad.
 *
 * El motivo: esbuild empaqueta a ESM y solo se rompe en tiempo de ejecucion.
 * Una referencia a un simbolo que se uso pero no se importo compila sin queja y
 * solo falla cuando la Lambda arranca, con el cliente viendo un stream que se
 * abre y se corta sin explicacion. Pasó con GEMINI_BASE en ai-handler.ts.
 *
 * Ademas, un `.catch(() => {})` en el camino del streaming se comio el error
 * durante varias iteraciones. Por eso este test mira tambien que el modulo
 * cargue sin lanzar, que es la unica senal que se tiene antes de desplegar.
 */
const BUNDLES = [
  ['api Lambda', 'dist/handler.js'],
  ['tts Lambda', 'dist-tts/handler.js'],
  ['ai Lambda', 'dist-ai/handler.js'],
] as const;

describe('bundles de Lambda', () => {
  const raiz = join(__dirname, 'lambda');

  for (const [nombre, relativo] of BUNDLES) {
    it(`${nombre}: el bundle existe`, () => {
      expect(existsSync(join(raiz, relativo))).toBe(true);
    });

    it(`${nombre}: carga sin lanzar (referencias sin importar fallan aqui)`, async () => {
      const ruta = pathToFileURL(join(raiz, relativo)).href;
      const mod = await import(/* @vite-ignore */ ruta);
      expect(typeof mod.handler).toBe('function');
    });
  }
});