import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ApiRequest, ApiResponse } from '../_types.js';

export type HttpHandler = (req: ApiRequest, res: ApiResponse) => unknown;
export type StreamHandler = (body: unknown, res: ServerResponse) => Promise<void>;

class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function responseAdapter(output: ServerResponse): ApiResponse {
  const result: ApiResponse = {
    status(code) { output.statusCode = code; return result; },
    setHeader(key, value) { if (!output.headersSent) output.setHeader(key, value); },
    json(value) {
      if (!output.writableEnded) {
        output.setHeader('Content-Type', 'application/json; charset=utf-8');
        output.end(JSON.stringify(value));
      }
      return result;
    },
    send(value) {
      if (!output.writableEnded) {
        if (Buffer.isBuffer(value) || typeof value === 'string') output.end(value);
        else result.json(value);
      }
      return result;
    },
    end() { if (!output.writableEnded) output.end(); },
  };
  return result;
}

async function readBody(input: IncomingMessage, path: string, limit: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of input) {
    size += chunk.length;
    if (size > limit) throw new RequestError(413, 'Petición demasiado grande');
    chunks.push(Buffer.from(chunk));
  }
  if (!size) return undefined;
  const data = Buffer.concat(chunks);
  const contentType = input.headers['content-type'] || '';
  if (path === '/api/ai/transcribe') {
    if (contentType.startsWith('multipart/form-data')) {
      try {
        const form = await new Response(new Uint8Array(data), {
          headers: { 'Content-Type': contentType },
        }).formData();
        const file = form.get('file');
        if (!(file instanceof Blob)) throw new Error('Missing file');
        return { size: file.size, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) };
      } catch {
        throw new RequestError(400, 'Audio multipart inválido');
      }
    }
    return { size: data.length, type: contentType, buffer: data };
  }
  if (contentType.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, 'Se requiere application/json');
  }
  try { return JSON.parse(data.toString('utf8')); }
  catch { throw new RequestError(400, 'JSON inválido'); }
}

export function createApiServer(options: {
  routes: Record<string, HttpHandler>;
  streamChat: StreamHandler;
  allowAiRequest: (req: ApiRequest) => boolean;
  readiness: () => Promise<void>;
  allowExternalNotifications?: boolean;
  maxBodyBytes?: number;
  revision?: string;
}) {
  const server = createServer(async (input, output) => {
    const res = responseAdapter(output);
    // Matches the existing API's public/native CORS contract; tokens use Bearer.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');
    if (input.method === 'OPTIONS') { res.status(204).end(); return; }
    try {
      const url = new URL(input.url || '/', 'http://localhost');
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (path === '/healthz' && input.method === 'GET') {
        res.json({ status: 'ok', revision: options.revision || null }); return;
      }
      if (path === '/readyz' && input.method === 'GET') {
        try { await options.readiness(); res.json({ status: 'ready' }); }
        catch { res.status(503).json({ error: 'Base de datos no disponible' }); }
        return;
      }
      const streaming = path === '/api/ai/chat' && input.method === 'POST';
      const handler = options.routes[path];
      if (!streaming && !handler) { res.status(404).json({ error: 'Not found' }); return; }
      if (!options.allowExternalNotifications && [
        '/api/alerts', '/api/notifications/dispatch', '/api/notifications/test',
      ].includes(path)) {
        res.status(503).json({ error: 'Envíos externos deshabilitados en este entorno de prueba' });
        return;
      }
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(input.headers)) {
        if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(', ') : value;
      }
      if (!headers['x-forwarded-for']) headers['x-forwarded-for'] = input.socket.remoteAddress || 'unknown';
      const req: ApiRequest = {
        method: input.method,
        url: path,
        query: Object.fromEntries(url.searchParams),
        headers,
        body: await readBody(input, path, options.maxBodyBytes ?? 10 * 1024 * 1024),
      };
      if (streaming) {
        if (!options.allowAiRequest(req)) {
          res.setHeader('Retry-After', '30');
          res.status(429).json({ error: 'Demasiadas peticiones' }); return;
        }
        output.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        output.setHeader('X-Accel-Buffering', 'no');
        output.flushHeaders();
        await options.streamChat(req.body, output);
        // The shared streamer owns response.end(), including its async work.
        return;
      }
      await handler(req, res);
      if (!output.writableEnded) res.end();
    } catch (error) {
      if (output.writableEnded) return;
      if (output.headersSent) { output.end(); return; }
      const known = error instanceof RequestError;
      if (!known) console.error('API request failed; internal error');
      res.status(known ? error.status : 500).json({
        error: known ? error.message : 'Internal server error',
      });
    }
  });
  server.requestTimeout = 120_000;
  server.headersTimeout = 30_000;
  return server;
}
