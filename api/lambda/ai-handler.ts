/* ----------------------------------------------------
   ALIVIA - LAMBDA DE IA (fuera del VPC) con streaming
   Misma logica que api/ai.ts, pero en forma nativa de Lambda y
   con respuesta en streaming: el token del modelo viaja al
   movil a medida que llega, en vez de esperar a que termine.

   El upstream lo decide api/ai.ts (chat a OpenAI, voz a Groq).
   Aqui solo se replica lo necesario para transmitir la respuesta.

   awslambda.streamifyResponse solo existe dentro del runtime de
   Lambda. En local (node scripts/build-lambda.mjs)
   se degrada a un handler normal que responde JSON completo.
   ---------------------------------------------------- */

import type { LambdaEvent, LambdaResponse } from './adapter.js';
import { applyCors } from '../_cors.js';
import aiHandler, { chatUpstream } from '../ai.js';

// writableStream que AWS inyecta como segundo argumento del handler registrado
// con streamifyResponse.
type ResponseStream = {
  write: (chunk: string) => unknown;
  end: () => void;
  setContentType?: (type: string) => void;
};

const UPSTREAM_TIMEOUT_MS = 22000;
const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;

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

// El runtime de Lambda expone streamifyResponse solo dentro de la funcion; si
// no esta, el handler responde JSON normal (util en local). El stream de
// respuesta llega como segundo argumento del handler.
type StreamingHandler = (
  event: LambdaEvent,
  responseStream: ResponseStream
) => Promise<unknown>;

const streamifyRuntime = (globalThis as unknown as {
  awslambda?: { streamifyResponse?: (handler: StreamingHandler) => unknown };
}).awslambda?.streamifyResponse;

const supportsStreaming = (): boolean => typeof streamifyRuntime === 'function';

// ---------- camino con streaming ----------

// AWS inyecta el responseStream como SEGUNDO argumento del handler envuelto con
// streamifyResponse. Es un writableStream de Node ya preparado: por eso no hay
// que pasar nada por HttpResponseStream.from (que exige setContentType y no lo
// tiene un PassThrough propio).
const streamChat = async (event: LambdaEvent, responseStream: ResponseStream): Promise<void> => {
  const write = (chunk: string): void => {
    responseStream.write(chunk);
  };

  responseStream.setContentType?.('text/event-stream');

  const upstream = chatUpstream();

  const { body, params, models } = (() => {
    const parsed = jsonBody(event);
    const messages = sanitizeMessages(parsed.messages);
    const src = (parsed.params ?? {}) as Record<string, unknown>;
    return {
      body: messages,
      params: {
        temperature: clamp(src.temperature, 0, 1, 0.8),
        top_p: clamp(src.top_p, 0, 1, 0.9),
        max_tokens: Math.round(clamp(src.max_tokens, 32, 1024, 320)),
      },
      models:
        typeof parsed.model === 'string' && upstream.models.includes(parsed.model)
          ? [parsed.model]
          : upstream.models,
    };
  })();

  if (!body) {
    write(sseEvent({ type: 'error', reason: 'Mensajes inválidos' }));
    responseStream.end();
    return;
  }

  if (!upstream.key) {
    write(sseEvent({ type: 'error', reason: 'IA no configurada' }));
    responseStream.end();
    return;
  }

  write(sseEvent({ type: 'open' }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  (async () => {
    let delivered = false;
    for (const model of models) {
      if (controller.signal.aborted) break;
      try {
        // OpenAI y Groq comparten formato de streaming: `data:` con
        // choices[0].delta.content y cierre en `data: [DONE]`.
        const upstreamRes = await fetch(`${upstream.base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upstream.key}` },
          body: JSON.stringify({ model, messages: body, stream: true, ...params }),
          signal: controller.signal,
        });

        if (upstreamRes.status === 429) {
          write(sseEvent({ type: 'error', reason: 'IA saturada' }));
          break;
        }
        if (!upstreamRes.ok || !upstreamRes.body) continue;

        const reader = upstreamRes.body.getReader();
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
                  write(sseEvent({ type: 'delta', text: delta }));
                }
              } catch {
                /* fragmento incompleto */
              }
            }
            nl = buffer.indexOf('\n');
          }
        }

        if (delivered || guard) {
          write(sseEvent({ type: 'done', model }));
          reader.releaseLock();
          return;
        }
        reader.releaseLock();
      } catch {
        if (controller.signal.aborted) break;
      }
    }
    write(sseEvent({ type: 'error', reason: 'IA no disponible' }));
  })()
    .catch(() => {
      /* el stream ya se cerro con un evento de error */
    })
    .finally(() => {
      clearTimeout(timer);
      responseStream.end();
    });

  return;
};

// ---------- entrypoint ----------

// Handler de chat en streaming: recibe el responseStream que inyecta AWS.
const streamingHandler = async (
  event: LambdaEvent,
  responseStream: ResponseStream
): Promise<void> => {
  const path = eventPath(event);
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  if (path === '/api/ai/chat' && method === 'POST') {
    await streamChat(event, responseStream);
    return;
  }

  // Cualquier otra ruta (p.ej. /api/ai/transcribe) responde JSON normal.
  const result = await bufferedHandler(event);
  responseStream.setContentType?.('application/json');
  responseStream.write(result.body);
  responseStream.end();
};

async function bufferedHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const path = eventPath(event);

  // El chat con streaming se resuelve en streamingHandler; aqui solo llegan las
  // rutas que responden JSON (transcripcion, etc.).
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

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

// Entry point real de la Lambda.
//
// La Function URL usa InvokeMode RESPONSE_STREAM, asi que AWS tiene que ejecutar
// la funcion en modo streaming. Eso exige registrar el handler con
// streamifyResponse, que inyecta el writableStream como SEGUNDO argumento.
// Sin ese envoltorio el runtime lo invoca en modo bufferizado y el chat no
// transmite token a token.
//
// Fuera del runtime (local, tests) no existe awslambda, asi que se expone el
// handler normal que responde JSON.
export const handler = (
  typeof streamifyRuntime === 'function'
    ? streamifyRuntime(streamingHandler)
    : (event: LambdaEvent) => bufferedHandler(event)
) as (event: LambdaEvent) => Promise<unknown>;
