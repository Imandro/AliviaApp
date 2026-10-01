import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import aiHandler from './ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Captured {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

const makeRes = (): { res: VercelResponse; captured: Captured } => {
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
  return { res: res as unknown as VercelResponse, captured };
};

const makeReq = (over: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'POST',
    url: '/api/ai/chat',
    headers: {},
    query: {},
    ...over,
  }) as VercelRequest;

const originalKey = process.env.GROQ_API_KEY;
const originalFetch = globalThis.fetch;

const groqJson = (text: string, status = 200): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODELS = 'openai/gpt-oss-20b,openai/gpt-oss-120b';
});

afterEach(() => {
  process.env.GROQ_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

describe('configuracion', () => {
  it('responde 503 si la Lambda no tiene GROQ_API_KEY', async () => {
    process.env.GROQ_API_KEY = '';
    const { res, captured } = makeRes();
    await aiHandler(makeReq(), res);
    expect(captured.status).toBe(503);
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
      return groqJson('ok');
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
    const raw = await run([{ role: 'user', content: 'hola' }], { max_tokens: 99999 });
    expect(JSON.parse(raw).max_tokens).toBe(1024);
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
    expect(JSON.parse(raw).model).toBe('openai/gpt-oss-20b');
  });
});

describe('fallo hacia Groq', () => {
  it('propaga 429 sin reintentar, para que el cliente caiga a reglas', async () => {
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
      return model === 'openai/gpt-oss-20b'
        ? new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
        : groqJson('Respuesta del segundo modelo');
    }) as typeof fetch;

    const { res, captured } = makeRes();
    await aiHandler(makeReq({ body: { messages: [{ role: 'user', content: 'hola' }] } }), res);
    expect(captured.status).toBe(200);
    expect((captured.body as { text: string }).text).toBe('Respuesta del segundo modelo');
    expect(usados).toContain('openai/gpt-oss-120b');
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