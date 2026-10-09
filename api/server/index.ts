/**
 * ALIVIA - Servidor HTTP de Node para la VM de Azure.
 *
 * Sustituye a las cuatro Lambdas de AWS con un unico proceso Node 22. No es una
 * reescritura del backend: los handlers de `api/` no saben donde corren, asi que
 * aqui solo se traduce el `IncomingMessage` de Node al mismo objeto
 * `{ method, path, query, body, headers }` que ya consumia `api/lambda/router.ts`.
 *
 * Lo que cambia respecto a AWS:
 *
 *  - Las cuatro Lambdas estaban separadas por una razon economica (salida a
 *    internet desde el VPC sin pagar NAT Gateway). En una VM hay salida
 *    siempre, asi que TTS, IA y alertas se sirven desde el mismo proceso.
 *  - El chat de IA hacia streaming con `awslambda.streamifyResponse`, que solo
 *    existe en el runtime de Lambda. Ahi se reimplementa con SSE sobre la
 *    respuesta de Node, que es lo que el cliente ya sabe consumir
 *    (`src/utils/aiProvider.ts` parsea `data:` de un ReadableStream).
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ApiRequest, ApiResponse } from '../_types.js';
import { route } from '../lambda/router.js';
import ttsHandler from '../tts.js';
import alertsHandler from '../alerts.js';
import aiHandler from '../ai.js';
import { applyCors } from '../_cors.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

// Cuerpo maximo del backend. La API recibe JSON pequeno (moods, assessments,
// posts) y audio de la transcripcion; 12 MB deja margen sin permitir que una
// sola peticion se coma la memoria del proceso.
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/** Los headers de Node llegan como string | string[]; los handlers los quieren planos. */
const flatHeaders = (req: IncomingMessage): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
};

interface ParsedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

const parse = async (req: IncomingMessage): Promise<ParsedRequest> => {
  const url = new URL(req.url || '/', 'http://placeholder');
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) query[key] = value;

  const raw = await readBody(req);
  let body: unknown = null;
  if (raw.length > 0) {
    const text = raw.toString('utf8');
    // La transcripcion de audio llega binaria; el resto es JSON. Se intenta
    // parsear y, si no es JSON, viaja el Buffer intacto para que el handler
    // pueda tratarlo como archivo.
    try {
      body = JSON.parse(text);
    } catch {
      body = raw;
    }
  }

  return {
    method: req.method || 'GET',
    path: url.pathname,
    query,
    body,
    headers: flatHeaders(req),
  };
};

const writeJson = (res: ServerResponse, status: number, data: unknown): void => {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
};

/**
 * Adapta la respuesta de Node al contrato `ApiResponse` de `api/_types.ts`.
 *
 * Los handlers escriben con res.status().json() / .send() / .end(), y no conocen
 * el runtime. `send` con un Buffer se pasa tal cual (el TTS devuelve audio
 * binario); con un string se responde como texto plano.
 */
const nodeResponse = (res: ServerResponse): ApiResponse => {
  let statusCode = 200;
  let ended = false;

  const send = (data: unknown): void => {
    if (ended) return;
    ended = true;
    if (Buffer.isBuffer(data)) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      res.writeHead(statusCode);
      res.end(data);
      return;
    }
    if (typeof data === 'string') {
      res.writeHead(statusCode);
      res.end(data);
      return;
    }
    writeJson(res, statusCode, data);
  };

  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      res.setHeader('Content-Type', 'application/json');
      send(data);
      return this;
    },
    send(data: unknown) {
      send(data);
      return this;
    },
    setHeader(key: string, value: string) {
      res.setHeader(key, value);
    },
    end() {
      if (ended) return;
      ended = true;
      res.writeHead(statusCode);
      res.end();
    },
  };
};

/** Invoca un handler de `api/` con el contrato de _types y captura sus errores. */
const runHandler = async (
  parsed: ParsedRequest,
  res: ServerResponse,
  handler: (req: ApiRequest, res: ApiResponse) => unknown,
  errorMessage: string
): Promise<void> => {
  const req: ApiRequest = {
    method: parsed.method,
    url: parsed.path,
    query: parsed.query,
    headers: parsed.headers,
    body: parsed.body,
  };
  const apiRes = nodeResponse(res);

  if (applyCors(req, apiRes)) return;

  try {
    await handler(req, apiRes);
  } catch (err) {
    console.error('[server] handler error:', err);
    if (!res.writableEnded) {
      writeJson(res, 500, { error: errorMessage });
    }
  }
};

/**
 * Chat de IA en streaming (SSE).
 *
 * Equivalente al camino con streaming de `api/lambda/ai-handler.ts`, pero
 * escribiendo sobre la respuesta de Node. Se recorre proveedor por proveedor
 * (chatFallbacks ya devuelve la cadena con el orden de failover) y se cortan los
 * intentos agotados del presupuesto total, igual que en la Lambda: dar 22 s a
 * toda la cadena hacia que los proveedores de respaldo nunca llegaran a probarse.
 */
const streamChat = async (parsed: ParsedRequest, res: ServerResponse): Promise<void> => {
  const { chatFallbacks, GEMINI_BASE } = await import('../ai.js');
  const { CUENTA_SIN_FONDOS } = await import('../ai.js');

  const UPSTREAM_TIMEOUT_MS = 22000;
  const MAX_MESSAGES = 24;
  const MAX_CONTENT_CHARS = 4000;
  const DEFAULT_MAX_TOKENS = 4096;
  const MAX_MAX_TOKENS = 8192;

  const sse = (payload: Record<string, unknown>): string => `data: ${JSON.stringify(payload)}\n\n`;

  const nombreProveedor = (base: string): string =>
    base === GEMINI_BASE ? 'gemini' : base.includes('openai.com') ? 'openai' : 'groq';

  const motivoDe = (cuerpo: string): string => {
    const m = cuerpo.match(/"message"\s*:\s*"([^"]{0,110})/);
    if (m) return m[1];
    return cuerpo.replace(/\s+/g, ' ').trim().slice(0, 100) || '(sin detalle)';
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

  const upstreams = chatFallbacks();

  const payload = (parsed.body ?? {}) as Record<string, unknown>;
  const messages = sanitizeMessages(payload.messages);
  const src = (payload.params ?? {}) as Record<string, unknown>;
  const modeloPedido = typeof payload.model === 'string' ? payload.model : null;

  const params = {
    temperature: clamp(src.temperature, 0, 1, 0.8),
    top_p: clamp(src.top_p, 0, 1, 0.9),
    max_tokens: Math.round(clamp(src.max_tokens, 32, MAX_MAX_TOKENS, DEFAULT_MAX_TOKENS)),
  };

  const modelosPorProveedor = upstreams.map(u => ({
    upstream: u,
    models:
      u === upstreams[0] && modeloPedido && u.models.includes(modeloPedido)
        ? [modeloPedido]
        : u.models,
  }));

  // Las cabeceras CORS se escriben antes del primer write: el stream empieza
  // con writeHead y a partir de ahi Node ya no deja cambiarlas.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Accel-Buffering': 'no',
  });

  if (!messages) {
    res.write(sse({ type: 'error', reason: 'Mensajes inválidos' }));
    res.end();
    return;
  }

  if (!upstreams.some(u => u.key)) {
    res.write(sse({ type: 'error', reason: 'IA no configurada' }));
    res.end();
    return;
  }

  res.write(sse({ type: 'open' }));

  const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;

  try {
    let delivered = false;

    for (const { upstream, models } of modelosPorProveedor) {
      if (Date.now() >= deadline) break;
      if (!upstream.key) continue;
      console.warn(`[chat] probando ${nombreProveedor(upstream.base)} (${models.length} modelo/s)`);

      for (const model of models) {
        if (Date.now() >= deadline) break;
        // El cliente puede cortar la respuesta (cambia de pantalla, sale). Sin
        // esta comprobacion, seguir escribiendo sobre una respuesta cerrada
        // lanza ERR_STREAM_WRITE_AFTER_END y tumba el stream.
        if (res.writableEnded || res.destroyed) return;

        const controller = new AbortController();
        const restante = Math.max(1000, deadline - Date.now());
        const timer = setTimeout(() => controller.abort(), restante);

        try {
          const upstreamRes = await fetch(`${upstream.base}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upstream.key}` },
            body: JSON.stringify({ model, messages, stream: true, ...params }),
            signal: controller.signal,
          });

          if (!upstreamRes.ok || !upstreamRes.body) {
            if (upstreamRes.status === 429 || upstreamRes.status === 503) {
              const detalle = await upstreamRes.text().catch(() => '');
              console.warn(`[chat] ${nombreProveedor(upstream.base)}/${model} ${upstreamRes.status}: ${motivoDe(detalle)}`);
              // 429 de cuenta ("no credits") afecta a todos los modelos del
              // proveedor: seguir probando solo gasta tiempo.
              if (CUENTA_SIN_FONDOS.test(detalle)) break;
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
                const data = line.slice(5).trim();
                if (data === '[DONE]') {
                  guard = true;
                } else {
                  try {
                    const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta) {
                      delivered = true;
                      guard = true;
                      res.write(sse({ type: 'delta', text: delta }));
                    }
                  } catch {
                    /* fragmento incompleto */
                  }
                }
              }
              nl = buffer.indexOf('\n');
            }
          }

          reader.releaseLock();

          if (delivered || guard) {
            res.write(sse({ type: 'done', model }));
            res.end();
            return;
          }
        } catch (err) {
          if (Date.now() >= deadline) break;
          console.warn(`[chat] ${nombreProveedor(upstream.base)}/${model} fallo:`, err);
        } finally {
          clearTimeout(timer);
        }
      }
    }

    if (!res.writableEnded) {
      res.write(sse({ type: 'error', reason: 'IA no disponible' }));
      res.end();
    }
  } catch (err) {
    console.error('[chat] fallo el stream:', err);
    if (!res.writableEnded) {
      res.write(sse({ type: 'error', reason: 'IA no disponible' }));
      res.end();
    }
  }
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const parsed = await parse(req);

  // El dispatch de notificaciones lo invoca un cron externo con CRON_SECRET, no
  // un usuario: va por router.ts como cualquier otra ruta de la API.
  if (parsed.path === '/api/ai/chat' && parsed.method === 'POST') {
    await streamChat(parsed, res);
    return;
  }

  if (parsed.path === '/api/tts') {
    await runHandler(parsed, res, ttsHandler, 'TTS no disponible');
    return;
  }

  if (parsed.path === '/api/alerts') {
    await runHandler(parsed, res, alertsHandler, 'Alerta no disponible');
    return;
  }

  // Todo lo demas entra por el router de Lambda, que ya resuelve auth, moods,
  // assessments, planes, posts, admin y notificaciones.
  if (parsed.path.startsWith('/api/ai/')) {
    await runHandler(parsed, res, aiHandler, 'IA no disponible');
    return;
  }

  const result = await route({
    version: '2.0',
    rawPath: parsed.path,
    httpMethod: parsed.method,
    headers: parsed.headers,
    queryStringParameters: parsed.query,
    body: parsed.body === null ? undefined : JSON.stringify(parsed.body),
  });

  const headers: Record<string, string> = { ...result.headers };
  if (result.isBase64Encoded && result.body) {
    res.writeHead(result.statusCode, headers);
    res.end(Buffer.from(result.body, 'base64'));
    return;
  }
  res.writeHead(result.statusCode, headers);
  res.end(result.body);
};

const server = createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[server] error no controlado:', err);
    if (!res.writableEnded) {
      writeJson(res, 500, { error: 'Internal server error' });
    }
  });
});

// Los keep-alive del navegador se cierran antes de que lo haga nginx: si el
// socket del backend vive mas que el del proxy, nginx devuelve 502 al cliente
// aunque el backend este sano.
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

// Cierre ordenado para el deploy: sin esto, cada reinicio de systemd deja
// conexiones colgando y el navegador ve un error en lugar de un 502 limpio.
const shutdown = (signal: string) => {
  console.log(`[server] ${signal} recibido, cerrando`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log(`[server] ALIVIA escuchando en http://${HOST}:${PORT}`);
});