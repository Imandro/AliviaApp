import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assessCrisis } from './crisisSafety';
import { getModelReply } from './aiProvider';

// Objetivo: comprobar que una deteccion de crisis se convierte de verdad en un
// prompt de crisis para el modelo, y no solo en un flag interno. Si el prompt no
// lleva el protocolo, el modelo responde con consejo generico a alguien que esta
// en riesgo, que es exactamente el fallo que no queremos.

const crisis = 'ya no quiero vivir, tengo un plan claro';
const calma = 'hoy me siento algo cansado pero bien';

const call = async (message: string, opts: Partial<Parameters<typeof getModelReply>[1]> = {}) => {
  const replies: string[] = [];
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = String(init?.body ?? '');
    replies.push(body);
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  const out = await getModelReply(message, {
    history: [],
    historyTexts: [],
    voiceEnabled: false,
    suggestedReply: null,
    ...opts,
  } as Parameters<typeof getModelReply>[1]);
  return { out, prompts: replies };
};

describe('protocolo de crisis', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('marca la frase con riesgo como crisis', () => {
    const a = assessCrisis(crisis);
    expect(a.isCrisis).toBe(true);
    expect(a.urgent).toBe(true);
  });

  it('inyecta el encabezado de crisis en el prompt del modelo', async () => {
    const { prompts } = await call(crisis);
    expect(prompts.length).toBeGreaterThan(0);
    // Cadena exacta, no un /crisis/i que casaria con cualquier otra cosa.
    expect(prompts.join('\n')).toContain(
      'CONTEXTO ACTUAL: la persona esta en una conversacion de crisis.',
    );
  });

  it('el encabezado incluye la evidencia que disparo la deteccion', async () => {
    const { prompts } = await call(crisis);
    const enviado = prompts.join('\n');
    // {evidence} se sustituye por las etiquetas reales: si el placeholder
    // llegara al prompt, el modelo no veria por que se activo el protocolo.
    expect(enviado).toContain('segun el clasificador de seguridad:');
    expect(enviado).not.toContain('{evidence}');
  });

  it('el prompt de crisis encamina a ayuda humana y prohibe el consejo barato', async () => {
    const { prompts } = await call(crisis);
    const enviado = prompts.join('\n');
    // Frases literales del protocolo: si desaparecen, se perdio la salvaguarda.
    expect(enviado).toContain('ayuda humana INMEDIATA');
    expect(enviado).toContain('NO minimices');
    expect(enviado).toContain('NUNCA prometas secreto');
  });

  it('prohibe cambiar de rumbo o ofrecer actividades recreativas en crisis', async () => {
    const { prompts } = await call(crisis);
    expect(prompts.join('\n')).toContain('NO cambies de rumbo ni ofrezcas actividades recreativas');
  });

  it('limita la respuesta a 2-3 frases para no desbordar en crisis', async () => {
    const { prompts } = await call(crisis);
    expect(prompts.join('\n')).toContain('2 o 3 frases, maximo 70 palabras');
  });

  it('NO inyecta el protocolo de crisis en una conversacion normal', async () => {
    const { prompts } = await call(calma);
    expect(prompts.join('\n')).not.toContain(
      'CONTEXTO ACTUAL: la persona esta en una conversacion de crisis.',
    );
    expect(prompts.join('\n')).not.toContain('ayuda humana INMEDIATA');
  });

  it('la respuesta llega marcada como crisis para que la UI la muestre', async () => {
    const { out } = await call(crisis);
    expect(out.isCrisis).toBe(true);
  });

  it('una conversacion calmada no se marca como crisis', async () => {
    const { out } = await call(calma);
    expect(out.isCrisis).toBe(false);
  });
});