import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import aiHandler, { chatFallbacks } from './ai';
import type { ApiRequest, ApiResponse } from '../_types.js';

interface Captured {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

const makeRes = (): { res: ApiResponse; captured: Captured } => {
  const captured: Captured = { status: 200, headers: {}, body: undefined };
  const res = {
    status(code: number) {
      captured.status = code;
      return res;
    },
    json(data: unknown) {
      captured.body = data;
      return res;
    },
    setHeader(key: string, value: string) {
      captured.headers[key] = value;
      return res;
    },
    send(data: unknown) {
      captured.body = data;
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as ApiResponse, captured };
};

const makeReq = (over: Partial<ApiRequest> = {}): ApiRequest =>
  ({
    method: 'POST',
    url: '/api/ai/chat',
    headers: {},
    query: {},
    ...over,
  }) as ApiRequest;

const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGeminiModels = process.env.GEMINI_MODELS;
const originalOpenAIModels = process.env.OPENAI_MODELS;
const originalFetch = globalThis.fetch;

/** Shape de respuesta de chat, identico en Gemini, OpenAI y Groq. */
const chatJson = (text: string, status = 200): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  // Gemini es el proveedor principal. Los tests de proveedor mas abajo lo
  // borran a proposito para probar la cadena de respaldo.
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.GROQ_API_KEY = 'test-groq-key';
  delete process.env.GEMINI_MODELS;
  delete process.env.OPENAI_MODELS;
});

afterEach(() => {
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGeminiModels === undefined) delete process.env.GEMINI_MODELS;
  else process.env.GEMINI_MODELS = originalGeminiModels;
  if (originalOpenAIModels === undefined) delete process.env.OPENAI_MODELS;
  else process.env.OPENAI_MODELS = originalOpenAIModels;
  globalThis.fetch = originalFetch;
});

describe('configuracion', () => {
  it('responde 503 si la Lambda no tiene ninguna clave', async () => {
    process.env.GEMINI_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    process.env.GROQ_API_KEY = '';
    const { res, captured } = makeRes();
    await aiHandler(makeReq(), res);
    expect(captured.status).toBe(503);
  });

  it('el chat va a Gemini cuando hay GEMINI_API_KEY', async () => {
    let url = '';
    let headers: Record<string, string> = {};
    globalThis.fetch = (async (u: string, init?: RequestInit) => {
      url = u;
      headers = (init?.headers ?? {}) as Record<string, string>;
      return chatJson('ok');
    }) as typeof fetch;

    const { res } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(url).toContain('generativelanguage.googleapis.com');
    // El endpoint compatible de Google tambien usa Authorization: Bearer.
    // x-goog-api-key es lo que acepta la API nativa (generateContent), pero en
    // /v1beta/openai responde 400 "Missing or invalid Authorization header".
    expect(headers.Authorization).toBe('Bearer test-gemini-key');
  });

  it('respeta GEMINI_MODELS para ordenar la cadena', async () => {
    process.env.GEMINI_MODELS = 'gemini-3.6-flash,gemini-3.5-flash';
    const pedidos: string[] = [];
    globalThis.fetch = (async (_u: string, init?: RequestInit) => {
      pedidos.push(JSON.parse(String(init?.body)).model);
      return chatJson('boom', 500);
    }) as typeof fetch;

    const { res } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(pedidos.slice(0, 2)).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash']);
  });

  it('el 429 de Gemini se trata como demanda puntual y prueba otro modelo', async () => {
    // Es la diferencia clave con OpenAI y Groq: en Google el 429 es "high
    // demand" transitorio, no cuota agotada. Si se cortara con 429, VIA se
    // quedaria muda justo cuando el modelo esta saturado.
    const pedidos: string[] = [];
    globalThis.fetch = (async (_u: string, init?: RequestInit) => {
      const model = JSON.parse(String(init?.body)).model;
      pedidos.push(model);
      return model === 'gemini-3.6-flash'
        ? chatJson('saturado', 429)
        : chatJson('respuesta del modelo de respaldo');
    }) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(pedidos[0]).toBe('gemini-3.6-flash');
    expect(pedidos[1]).not.toBe('gemini-3.6-flash');
    expect(captured.status).toBe(200);
  });

  it('el 429 de OpenAI sigue cortando: es cuota de la cuenta', async () => {
    delete process.env.GEMINI_API_KEY;
    globalThis.fetch = (async () => chatJson('saturado', 429)) as typeof fetch;
    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(captured.status).toBe(429);
  });

  it('el chat cae a OpenAI cuando no hay GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    let url = '';
    globalThis.fetch = (async (u: string) => {
      url = u;
      return chatJson('ok');
    }) as typeof fetch;

    const { res } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(url).toContain('api.openai.com');
  });

  it('el chat cae a Groq si no hay ni Gemini ni OpenAI', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    let url = '';
    globalThis.fetch = (async (u: string) => {
      url = u;
      return chatJson('ok');
    }) as typeof fetch;

    const { res } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(url).toContain('api.groq.com');
  });

  it('la transcripcion SIEMPRE va a Groq aunque haya clave de OpenAI', async () => {
    let url = '';
    globalThis.fetch = (async (u: string) => {
      url = u;
      return new Response(JSON.stringify({ text: 'hola' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const { res } = makeRes();
    await aiHandler(
      makeReq({
        url: '/api/ai/transcribe',
        body: { size: 2000, type: 'audio/webm', buffer: (e?: string) => '' },
      }),
      res
    );
    expect(url).toContain('api.groq.com');
  });

  it('rechaza metodos distintos de POST', async () => {
    const { res, captured } = makeRes();
    await aiHandler(makeReq({ method: 'GET' }), res);
    expect(captured.status).toBe(405);
  });

  it('responde 404 en rutas desconocidas', async () => {
    const { res, captured } = makeRes();
    await aiHandler(makeReq({ url: '/api/ai/otro' }), res);
    expect(captured.status).toBe(404);
  });
});

describe('cadena de proveedores', () => {
  it('Gemini es el principal y OpenAI y Groq quedan como respaldo', () => {
    const cadena = chatFallbacks();
    expect(cadena.map((u) => u.base)).toEqual([
      'https://generativelanguage.googleapis.com/v1beta/openai',
      'https://api.openai.com/v1',
      'https://api.groq.com/openai/v1',
    ]);
  });

  it('sin la clave de Gemini el principal pasa a ser OpenAI', () => {
    delete process.env.GEMINI_API_KEY;
    const cadena = chatFallbacks();
    expect(cadena[0].base).toBe('https://api.openai.com/v1');
    // Gemini desaparece de la cadena: sin clave no puede servir ni de principal
    // ni de respaldo.
    expect(cadena.map((u) => u.base)).not.toContain('https://generativelanguage.googleapis.com/v1beta/openai');
  });

  it('sin clave de Gemini ni OpenAI, Groq queda como unico proveedor', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const cadena = chatFallbacks();
    expect(cadena.map((u) => u.base)).toEqual(['https://api.groq.com/openai/v1']);
  });

  it('respeta GEMINI_MODULES como orden de preferencia, incluido el default', () => {
    process.env.GEMINI_MODELS = 'gemini-3.5-flash,gemini-3.6-flash';
    const cadena = chatFallbacks();
    expect(cadena[0].models).toEqual(['gemini-3.5-flash', 'gemini-3.6-flash']);
    // El default debe ser el primero de la lista configurada. Antes hardcodeaba
    // GEMINI_MODELS[0] y se contradicia con `models` si alguien cambiaba la
    // variable.
    expect(cadena[0].defaultModel).toBe('gemini-3.5-flash');
  });
});

describe('validacion de entrada', () => {
  const expect400 = async (body: unknown) => {
    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body }), res);
    expect(captured.status).toBe(400);
  };

  it('rechaza mensajes vacios', () => expect400({ messages: [] }));
  it('rechaza un array que no es de mensajes', () => expect400({ messages: ['hola'] }));
  it('rechaza roles desconocidos', () =>
    expect400({ messages: [{ role: 'admin', content: 'hola' }] }));
  it('rechaza contenido no textual', () =>
    expect400({ messages: [{ role: 'user', content: { hola: true } }] }));
  it('rechaza demasiados mensajes', () =>
    expect400({ messages: Array.from({ length: 30 }, () => ({ role: 'user', content: 'x' })) }));
});

describe('sanitizacion del prompt', () => {
  const run = async (messages: unknown[], params?: unknown): Promise<string> => {
    let captured = '';
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      captured = String(init?.body);
      return chatJson('ok');
    }) as typeof fetch;
    const { res } = makeRes();
    await aiHandler(makeReq({ body: { messages, params } }), res);
    return captured;
  };

  it('coloca el system primero aunque venga al final', async () => {
    const raw = await run([
      { role: 'user', content: 'hola' },
      { role: 'system', content: 'reglas' },
    ]);
    const parsed = JSON.parse(raw);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[parsed.messages.length - 1].role).toBe('user');
  });

  it('acota la temperatura para que una crisis no pida 2.0', async () => {
    const raw = await run([{ role: 'user', content: 'hola' }], { temperature: 2 });
    expect(JSON.parse(raw).temperature).toBe(1);
  });

  it('acota max_tokens', async () => {
    // El techo es 8192: Gemini 3 razona antes de responder y sus tokens de
    // razonamiento se descuentan del mismo presupuesto. Con el techo anterior
    // (1024) la respuesta llegaba cortada a media frase, con finish_reason
    // "length": el razonamiento se comía unos 700 tokens.
    const raw = await run([{ role: 'user', content: 'hola' }], { max_tokens: 99999 });
    expect(JSON.parse(raw).max_tokens).toBe(8192);
  });

  it('el max_tokens por defecto da margen a una respuesta completa de Gemini', async () => {
    // 320 y 1024 cortaban a media frase; 4096 devolvio la respuesta entera.
    const raw = await run([{ role: 'user', content: 'hola' }]);
    expect(JSON.parse(raw).max_tokens).toBe(4096);
  });

  it('usa valores por defecto si params viene vacio', async () => {
    const raw = await run([{ role: 'user', content: 'hola' }]);
    const parsed = JSON.parse(raw);
    expect(parsed.temperature).toBeGreaterThan(0);
    expect(parsed.max_tokens).toBeGreaterThan(0);
  });

  it('trunca un mensaje excesivamente largo', async () => {
    const raw = await run([{ role: 'user', content: 'a'.repeat(9000) }]);
    expect(JSON.parse(raw).messages[0].content.length).toBe(4000);
  });

  it('usa el primer modelo de la lista permitida', async () => {
    const raw = await run([{ role: 'user', content: 'hola' }]);
    expect(JSON.parse(raw).model).toBe('gemini-3.6-flash');
  });
});

describe('fallo hacia Groq', () => {
  it('propaga 429 sin reintentar, para que el cliente caiga a reglas', async () => {
    // Sin la clave de Gemini, el proveedor principal pasa a ser OpenAI, cuyo 429
    // es cuota de la cuenta y no mejora cambiando de modelo.
    delete process.env.GEMINI_API_KEY;
    let n = 0;
    globalThis.fetch = (async () => {
      n += 1;
      return new Response(JSON.stringify({ error: 'rate' }), { status: 429 });
    }) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(captured.status).toBe(429);
    expect(n).toBe(1);
  });

  it('prueba el segundo modelo si el primero falla', async () => {
    const usados: string[] = [];
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      const model = JSON.parse(String(init?.body)).model;
      usados.push(model);
      return model === 'gemini-3.6-flash'
        ? new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
        : chatJson('Respuesta del segundo modelo');
    }) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(captured.status).toBe(200);
    expect((captured.body as { text: string }).text).toBe('Respuesta del segundo modelo');
    expect(usados).toContain('gemini-3.5-flash');
  });

  it('devuelve 502 si Groq no esta disponible', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(captured.status).toBe(502);
  });

  it('propaga el error de clave invalida como 500, no como 401', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'invalid key' }), { status: 401 })) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    // 401 revelaria al cliente que la clave es de la app, no suya.
    expect(captured.status).toBe(500);
  });
});

describe('transcripcion', () => {
  it('rechaza audio ausente', async () => {
    const { res, captured } = makeRes();
    await aiHandler(makeReq({ url: '/api/ai/transcribe', body: null }), res);
    expect(captured.status).toBe(400);
  });

  it('rechaza audio demasiado grande', async () => {
    const { res, captured } = makeRes();
    await aiHandler(
      makeReq({ url: '/api/ai/transcribe', body: { size: 99 * 1024 * 1024, type: 'audio/webm' } }),
      res
    );
    expect(captured.status).toBe(413);
  });

  it('reenvia el audio y devuelve la transcripcion', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ text: 'me siento ansioso' }), {
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(
      makeReq({
        url: '/api/ai/transcribe',
        body: { size: 2000, type: 'audio/webm', buffer: (e?: string) => '' },
      }),
      res
    );
    expect(captured.status).toBe(200);
    expect((captured.body as { text: string }).text).toBe('me siento ansioso');
  });
});