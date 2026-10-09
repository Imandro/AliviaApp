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
import aiHandler, { chatFallbacks, GEMINI_BASE, CUENTA_SIN_FONDOS } from '../ai.js';

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

// Gemini 3 razona antes de responder, y los tokens de razonamiento se descuentan
// del mismo presupuesto que el texto. Con 320 la respuesta llegaba cortada a
// media frase ("...pero confía en lo que"), con finish_reason "length". Medido
// con esta cuenta: 320 y 640 cortan, 1024 ya completa. El maximo queda en 2048
// para que una respuesta larga no se trunque.
const DEFAULT_MAX_TOKENS = 4096;
const MAX_MAX_TOKENS = 8192;

/**
 * La regla de "este limite es de la cuenta, no del modelo" vive en ai.ts y se
 * importa, en vez de estar escrita en los dos sitios. Cuando estaban
 * separadas ya se habian desincronizado: el streaming reconocia "quota" y
 * OpenAI responde "no credits remaining", asi que gastaba tres intentos en
 * gpt-4.1-mini, nano y 4o-mini, unos 600 ms cada uno, antes de llegar a Groq.
 */
const DETALLE_PROVEEDOR = (base: string): string =>
  base === GEMINI_BASE ? 'gemini' : base.includes('openai.com') ? 'openai' : 'groq';

/** Nombre corto del proveedor, para logs legibles. */
const nombreProveedor = DETALLE_PROVEEDOR;

/**
 * Extrae el motivo de un error de la API sin volcar el cuerpo entero: estos
 * errores pueden traer la peticion completa reflected, y el log se lee peor.
 */
const motivoDe = (cuerpo: string): string => {
  const m = cuerpo.match(/"message"\s*:\s*"([^"]{0,110})/);
  if (m) return m[1];
  const p = cuerpo.replace(/\s+/g, ' ').trim();
  return p.slice(0, 100) || '(sin detalle)';
};

const streamifyRuntime = (globalThis as unknown as {
  awslambda?: { streamifyResponse?: (handler: StreamingHandler) => unknown };
}).awslambda?.streamifyResponse;

const supportsStreaming = (): boolean => typeof streamifyRuntime === 'function';

// ---------- camino con streaming ----------

// AWS inyecta el responseStream como SEGUNDO argumento del handler envuelto con
// streamifyResponse. Es un writableStream de Node ya preparado: por eso no hay
// que pasar nada por HttpResponseStream.from (que exige setContentType y no lo
// tiene un PassThrough propio).
export const streamChat = async (event: LambdaEvent, responseStream: ResponseStream): Promise<void> => {
  const write = (chunk: string): void => {
    responseStream.write(chunk);
  };

  responseStream.setContentType?.('text/event-stream');

  const upstreams = chatFallbacks();

  const { body, params, modelosPorProveedor } = (() => {
    const parsed = jsonBody(event);
    const messages = sanitizeMessages(parsed.messages);
    const src = (parsed.params ?? {}) as Record<string, unknown>;
    const modeloPedido = typeof parsed.model === 'string' ? parsed.model : null;
    return {
      body: messages,
      params: {
        temperature: clamp(src.temperature, 0, 1, 0.8),
        top_p: clamp(src.top_p, 0, 1, 0.9),
        max_tokens: Math.round(clamp(src.max_tokens, 32, MAX_MAX_TOKENS, DEFAULT_MAX_TOKENS)),
      },
      // El cliente solo puede pedir un modelo de la lista del proveedor
      // principal. En los de respaldo se usa siempre su lista completa, que es
      // la unica valida para ellos.
      modelosPorProveedor: upstreams.map((u) => ({
        upstream: u,
        models: u === upstreams[0] && modeloPedido && u.models.includes(modeloPedido)
          ? [modeloPedido]
          : u.models,
      })),
    };
  })();

  if (!body) {
    write(sseEvent({ type: 'error', reason: 'Mensajes inválidos' }));
    responseStream.end();
    return;
  }

  if (!upstreams.some((u) => u.key)) {
    write(sseEvent({ type: 'error', reason: 'IA no configurada' }));
    responseStream.end();
    return;
  }

  write(sseEvent({ type: 'open' }));

  // El tiempo se reparte entre los intentos en vez de darle un unico
  // AbortController para toda la cadena.
  //
  // Antes un solo controller con 22 s para todo: si el proveedor principal se
  // quedaba sin cuota y tardaba en responder sus 429, el abort global se
  // disparaba mientras todavia estaba recorriendo sus modelos y los proveedores
  // de respaldo nunca llegaban a probarse. Con la cuota de Gemini agotada, la
  // Lambda devolvia "IA no disponible" aunque Groq estuviera disponible y
  // respondsiendo bien. Verificado: Groq contestaba "di ok" en el mismo minuto
  // en que la app fallaba.
  //
  // Ahora cada intento tiene su propio presupuesto y solo se corta cuando se
  // agota el tiempo total de la Lambda.
  const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;
  const restante = (): number => Math.max(1000, deadline - Date.now());

  (async () => {
    let delivered = false;

    // Se recorre proveedor por proveedor y, dentro de cada uno, sus modelos.
    //
    // Esto importa porque la cuota de Gemini es.intermitente: medido con esta
    // cuenta, 5 de 6 llamadas seguidas devolvieron 429 "exceeded your current
    // quota". Antes solo se probaban los modelos de un mismo proveedor, asi que
    // cuando los tres fallaban Livi se quedaba muda sin intentar Groq.
    for (const { upstream, models } of modelosPorProveedor) {
      if (Date.now() >= deadline) break;
      if (!upstream.key) continue;
      console.warn(`[chat] probando ${nombreProveedor(upstream.base)} (${models.length} modelo/s)`);

      for (const model of models) {
        if (Date.now() >= deadline) break;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), restante());
        try {
        // Gemini, OpenAI y Groq comparten formato de streaming: `data:` con
        // choices[0].delta.content y cierre en `data: [DONE]`. Y los tres
        // aceptan la clave en Authorization: Bearer, incluido el endpoint
        // compatible de Google.
        const upstreamRes = await fetch(`${upstream.base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upstream.key}` },
          body: JSON.stringify({ model, messages: body, stream: true, ...params }),
          signal: controller.signal,
        });

        // Ni 429 ni 503 cortan el stream: quedan otros modelos y otros proveedores por
        // probar. Cortar aqui era lo que dejaba a Livi muda cuando se agotaba la
        // cuota.
        if (!upstreamRes.ok || !upstreamRes.body) {
          // Pero hay dos 429 que quieren cosas distintas, y confundirlos cuesta
          // 22 segundos de espera:
          //
          //  - "You exceeded your current quota" es de la cuenta. Le pasa igual
          //    a los demas modelos del mismo proveedor, asi que seguir probando
          //    es perder tiempo: conviene saltar al proveedor siguiente ya.
          //  - "This model is currently experiencing high demand" es de ese
          //    modelo. El siguiente puede funcionar, asi que se sigue.
          if (upstreamRes.status === 429 || upstreamRes.status === 503) {
            const detalle = await upstreamRes.text().catch(() => '');
            console.warn(`[chat] ${nombreProveedor(upstream.base)}/${model} ${upstreamRes.status}: ${motivoDe(detalle)}`);
            if (CUENTA_SIN_FONDOS.test(detalle)) {
              break; // el bucle de modelos: al siguiente proveedor
            }
          } else {
            console.warn(`[chat] ${nombreProveedor(upstream.base)}/${model} ${upstreamRes.status} sin cuerpo`);
          }
          continue;
        }

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
          if (Date.now() >= deadline) break;
        } finally {
          clearTimeout(timer);
        }
      }
    }
    // Se agoto la cadena completa: todos los proveedores y todos sus modelos.
    write(sseEvent({ type: 'error', reason: 'IA no disponible' }));
  })()
    .catch((err) => {
      // Antes esto se tragaba el error en silencio: el cliente recibia solo el
      // evento "open" y nada mas, sin forma de saber que habia pasado.
      console.error('[chat] fallo el stream:', err);
      write(sseEvent({ type: 'error', reason: 'IA no disponible' }));
    })
    .finally(() => {
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
