import { describe, expect, it } from 'vitest';

import { MODEL_LABELS, PROMPT_VERSION, SYSTEM_PROMPT, buildPrompt } from './aiPrompts';

describe('aiPrompts — identidad de la asistente', () => {
  it('la mascota se llama Livi en el prompt del sistema', () => {
    expect(SYSTEM_PROMPT).toContain('Livi');
  });

  it('ningun modo de prompt reintroduce el nombre viejo', () => {
    // Un rename a medias dejo "Eres Livi" junto a "TE LLAMAS VIA" en la misma
    // frase, y el modelo seellia con el nombre viejo. Los prompts de crisis
    // van aparte (no llevan la linea de identidad), asi que se comprueba que
    // ninguno Mentiona al antecesor.
    for (const mode of ['normal', 'crisis', 'crisis-exit'] as const) {
      expect(buildPrompt(mode).system).not.toMatch(/\bVIA\b/);
    }
  });

  it('el label del modelo refleja el nombre actual', () => {
    expect(MODEL_LABELS.via).toBe('Livi');
  });

  it('PROMPT_VERSION tiene formato de fecha para atribuir cambios de calidad', () => {
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});