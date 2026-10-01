/* ----------------------------------------------------
   ALIVIA - LAMBDA DE IA (fuera del VPC) con streaming
   Misma logica que api/ai.ts, pero en forma nativa de Lambda y
   con respuesta en streaming: el token del modelo viaja al
   movil a medida que llega, en vez de esperar a que termine.

   awslambda.streamifyResponse solo existe dentro del runtime de
   Lambda. En local (node scripts/build-lambda.mjs, vercel dev)
   se degrada a un handler normal que responde JSON completo.
   ---------------------------------------------------- */

import type { LambdaEvent, LambdaResponse } from './adapter.js';
import { applyCors } from '../_cors.js';
import aiHandler from '../ai.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const UPSTREAM_TIMEOUT_MS = 22000;
const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];
const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;

const groqKey = (): string => (process.env.GROQ_API_KEY ?? '').trim();

const allowedModels = (): string[] => {
  const raw = (process.env.GROQ_MODELS ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return raw.length ? raw : FALLBACK_MODELS;
};

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

interface ProxyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const sanitizeMessages = (raw: unknown): ProxyMessage[] | null => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out: ProxyMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    out.push({ role, content: trimmed.slice(0, MAX_CONTENT_CHARS) });
  }
  return [...out.filter(m => m.role === 'system').slice(0, 1), ...out.filter(m => m.role !== 'system')];
};

const jsonBody = (event: LambdaEvent): Record<string, unknown> => {
  const raw = event.body;
  if (!raw) return {};
  const decoded = event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  try {
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const eventPath = (event: LambdaEvent): string => {
  const raw = event.rawPath || event.path || '';
  const clean = raw.split('?')[0].replace(/\/+$/, '');
  // CloudFront enruta /api/ai/* a esta Lambda: la ruta llega completa.
  return clean === '/ai/chat' || clean === '/chat' ? '/api/ai/chat' : clean;
};

const sseEvent = (payload: Record<string, unknown>): string => `data: ${JSON.stringify(payload)}\n\n`;

const supportsStreaming = (): boolean =>
  typeof (globalThis as { awslambda?: { streamifyResponse?: unknown } }).awslambda?.streamifyResponse === 'function';

/**
 * ReadableStream controlable desde fuera: se usa en vez de `stream.PassThrough`
 * para no arrastrar el modulo nativo de Node, que no existe en el runtime.
 */
const openStream = (): { stream: ReadableStream<Uint8Array>; write: (chunk: string) => void; end: () => void } => {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let pending: Uint8Array[] = [];
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      for (const chunk of pending) controller.enqueue(chunk);
      pending = [];
      if (closed) controller.close();
    },
  });

  return {
    stream,
    write(chunk: string) {
      if (closed) return;
      const bytes = new TextEncoder().encode(chunk);
      if (controllerRef) controllerRef.enqueue(bytes);
      else pending.push(bytes);
    },
    end() {
      if (closed) return;
      closed = true;
      controllerRef?.close();
    },
  };
};

// ---------- camino con streaming ----------

const streamChat = async (event: LambdaEvent): Promise<unknown> => {
  const HttpResponseStream = (globalThis as {
    awslambda: {
      HttpResponseStream: { from: (s: unknown, m: unknown) => unknown };
    };
  }).awslambda.HttpResponseStream;

  const rawResponse = openStream();

  const { metadata, body, params, models } = (() => {
    const parsed = jsonBody(event);
    const messages = sanitizeMessages(parsed.messages);
    const src = (parsed.params ?? {}) as Record<string, unknown>;
    return {
      metadata: {
        statusCode: messages ? 200 : 400,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
      },
      body: messages,
      params: {
        temperature: clamp(src.temperature, 0, 1, 0.8),
        top_p: clamp(src.top_p, 0, 1, 0.9),
        max_tokens: Math.round(clamp(src.max_tokens, 32, 1024, 320)),
      },
      models:
        typeof parsed.model === 'string' && allowedModels().includes(parsed.model)
          ? [parsed.model]
          : allowedModels(),
    };
  })();

  if (!body) {
    rawResponse.write(sseEvent({ type: 'error', reason: 'Mensajes inválidos' }));
    rawResponse.end();
    return HttpResponseStream.from(rawResponse.stream, metadata);
  }

  const key = groqKey();
  if (!key) {
    rawResponse.write(sseEvent({ type: 'error', reason: 'IA no configurada' }));
    rawResponse.end();
    return HttpResponseStream.from(rawResponse.stream, metadata);
  }

  rawResponse.write(sseEvent({ type: 'open' }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  (async () => {
    let delivered = false;
    for (const model of models) {
      if (controller.signal.aborted) break;
      try {
        const upstream = await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: body, stream: true, ...params }),
          signal: controller.signal,
        });

        if (upstream.status === 429) {
          rawResponse.write(sseEvent({ type: 'error', reason: 'IA saturada' }));
          break;
        }
        if (!upstream.ok || !upstream.body) continue;

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let guard = false;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl = buffer.indexOf('\n');
          while (nl !== -1) {
            const line = buffer.slice(0, nl).replace(/\r$/, '');
            buffer = buffer.slice(nl + 1);
            if (line.startsWith('data:')) {
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') {
                guard = true;
                continue;
              }
              try {
                const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta) {
                  delivered = true;
                  guard = true;
                  rawResponse.write(sseEvent({ type: 'delta', text: delta }));
                }
              } catch {
                /* fragmento incompleto */
              }
            }
            nl = buffer.indexOf('\n');
          }
        }

        if (delivered || guard) {
          rawResponse.write(sseEvent({ type: 'done', model }));
          reader.releaseLock();
          return;
        }
        reader.releaseLock();
      } catch {
        if (controller.signal.aborted) break;
      }
    }
    rawResponse.write(sseEvent({ type: 'error', reason: 'IA no disponible' }));
  })()
    .catch(() => {
      /* el stream ya se cerro con un evento de error */
    })
    .finally(() => {
      clearTimeout(timer);
      rawResponse.end();
    });

  return HttpResponseStream.from(rawResponse.stream, metadata);
};

// ---------- entrypoint ----------

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  const path = eventPath(event);
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  const isChat = path === '/api/ai/chat';

  if (supportsStreaming() && isChat && method === 'POST') {
    return (await streamChat(event)) as LambdaResponse;
  }

  // Sin streaming (local, o ruta que no lo necesita) cae al handler Vercel.
  const headers = (event.headers ?? {}) as Record<string, string>;
  const req = {
    method,
    url: path,
    query: {},
    body: event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body
      : null,
    headers,
  } as never;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LambdaResponse) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const res = {
      status(code: number) {
        res._status = code;
        return res;
      },
      json(data: unknown) {
        finish({
          statusCode: res._status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return res;
      },
      setHeader(key: string, value: string) {
        res._headers[key] = value;
        return res;
      },
      send(data: unknown) {
        finish({ statusCode: res._status, headers: res._headers, body: String(data) });
        return res;
      },
      end() {
        finish({
          statusCode: res._status,
          headers: res._headers,
          body: '',
        });
      },
      _status: 200,
      _headers: { 'Content-Type': 'application/json' } as Record<string, string>,
    };

    if (applyCors(req, res as never)) {
      res.end();
      return;
    }

    Promise.resolve(aiHandler(req, res as never))
      .catch((err) => {
        console.error('AI handler error:', err);
        if (!settled) {
          res.status(500).json({ error: 'Internal server error' });
          res.end();
        }
      })
      .finally(() => {
        if (!settled) res.end();
      });
  });
}
