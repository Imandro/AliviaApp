/* ----------------------------------------------------
   ALIVIA - PROXY DE IA (Groq)
   El navegador NO lleva la clave de Groq: habla con esta
   Lambda, que la mantiene en process.env.GROQ_API_KEY y
   reenvia la peticion a Groq.

   Por que una Lambda aparte y no la del API: la Lambda de
   datos esta dentro del VPC (para llegar a RDS) y desde ahi
   no hay salida a internet sin pagar un NAT Gateway. Esto es
   el mismo motivo por el que el TTS tiene su propia Lambda.

   Este archivo es el handler con forma Vercel (api/ai.ts);
   el de Lambda es api/lambda/ai-handler.ts, que ademas
   transmite la respuesta en streaming.
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from './_types.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

/** El proxy nunca deberia ser mas lento que el modelo que llama. */
const UPSTREAM_TIMEOUT_MS = 22000;

/**
 * gpt-oss-20b va primero por velocidad (1000 tok/s) y precio ($0.075/$0.30
 * por 1M), que es lo que hace falta para absorber trafico en una app gratuita.
 */
const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

/**
 * El cliente decide el modo y envia el prompt ya construido. El proxy no los
 * conoce: solo valida forma y tamano, y reenvia. Asi el prompt sigue siendo
 * una decision del cliente y este endpoint no puede convertirse en una API
 * publica que cualquiera use con nuestra clave.
 */
const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export interface ProxyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const groqKey = (): string => (process.env.GROQ_API_KEY ?? '').trim();

const allowedModels = (): string[] => {
  const raw = (process.env.GROQ_MODELS ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return raw.length ? raw : FALLBACK_MODELS;
};

const isValidModel = (model: unknown): model is string =>
  typeof model === 'string' && allowedModels().includes(model);

/**
 * El cliente elige la temperatura segun el modo (baja en crisis). Se acotan
 * los valores para que una peticion manipulada no pueda pedir 2.0 en una
 * respuesta de crisis, donde lo que importa es la consistencia.
 */
const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

interface SanitizedParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

const sanitizeParams = (raw: unknown): SanitizedParams => {
  const src = (raw ?? {}) as Record<string, unknown>;
  return {
    temperature: clamp(src.temperature, 0, 1, 0.8),
    top_p: clamp(src.top_p, 0, 1, 0.9),
    max_tokens: Math.round(clamp(src.max_tokens, 32, 1024, 320)),
  };
};

/** Devuelve null si el mensaje no tiene forma de mensaje. */
const sanitizeMessage = (raw: unknown): ProxyMessage | null => {
  if (!raw || typeof raw !== 'object') return null;
  const { role, content } = raw as { role?: unknown; content?: unknown };
  if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
  if (typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  return { role, content: trimmed.slice(0, MAX_CONTENT_CHARS) };
};

const sanitizeMessages = (raw: unknown): ProxyMessage[] | null => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out: ProxyMessage[] = [];
  for (const item of raw) {
    const msg = sanitizeMessage(item);
    if (!msg) return null;
    out.push(msg);
  }
  // El sistema va primero: un historial con el system al final haria que el
  // modelo lo ignorase, y es justo la instruccion que nos protege.
  return [...out.filter(m => m.role === 'system').slice(0, 1), ...out.filter(m => m.role !== 'system')];
};

const readBody = async (req: ApiRequest): Promise<Record<string, unknown>> => {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return body as Record<string, unknown>;
};

const headerValue = (req: ApiRequest, name: string): string => {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
};

// ---------- limitacion de uso ----------

/**
 * Cubo de tokens en memoria por IP. No es un limite distribuido (esta Lambda
 * no tiene DB, esta fuera del VPC), asi que sirve para frenar el abuso
 * evidente y el runaway de un cliente con un bucle de reintentos, no para
 * contabilidad exacta. Si hiciera falta contabilidad real, el sitio tendria
 * que pasar por la Lambda del API, que si tiene Postgres.
 */
const BUCKET_CAPACITY = 30;
const REFILL_PER_MIN = 20;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

const allowRequest = (key: string): boolean => {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: BUCKET_CAPACITY - 1, updatedAt: now });
    return true;
  }
  const elapsedMin = (now - bucket.updatedAt) / 60000;
  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + elapsedMin * REFILL_PER_MIN);
  bucket.updatedAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
};

// Poda periodica para no retener IPs indefinidamente en una Lambda caliente.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < cutoff) buckets.delete(key);
    }
  }, 60000);
  // No mantiene la Lambda viva entre invocaciones.
  (timer as unknown as { unref?: () => void }).unref?.();
}

const clientKey = (req: ApiRequest): string =>
  headerValue(req, 'x-forwarded-for').split(',')[0].trim() ||
  headerValue(req, 'cloudfront-viewer-address').trim() ||
  'unknown';

const sendError = (res: ApiResponse, status: number, message: string): void => {
  res.status(status).json({ error: message });
};

// ---------- handlers ----------

export interface ChatProxyResult {
  status: number;
  body: { text?: string; model?: string; error?: string };
}

const handleChat = async (req: ApiRequest, res: ApiResponse): Promise<void> => {
  const key = groqKey();
  if (!key) return sendError(res, 503, 'IA no configurada');

  const body = await readBody(req);
  const messages = sanitizeMessages(body.messages);
  if (!messages) return sendError(res, 400, 'Mensajes invÃ¡lidos');

  const params = sanitizeParams(body.params);
  const models = isValidModel(body.model) ? [body.model] : allowedModels();

  const payload = (model: string): string =>
    JSON.stringify({ model, messages, stream: false, ...params });

  let lastStatus = 502;
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: payload(model),
        signal: controller.signal,
      });

      if (upstream.ok) {
        const data = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim()) {
          res.status(200).json({ text, model });
          return;
        }
        lastStatus = 502;
      } else if (upstream.status === 429) {
        // Limite de cuota de Groq: no tiene sentido reintentar con otro modelo,
        // la cuota es por cuenta. El cliente cae a las reglas locales.
        res.status(429).json({ error: 'IA saturada' });
        return;
      } else {
        lastStatus = upstream.status === 401 || upstream.status === 403 ? 500 : 502;
      }
    } catch {
      lastStatus = 502;
    } finally {
      clearTimeout(timer);
    }
  }

  res.status(lastStatus).json({ error: 'IA no disponible' });
};

const handleTranscribe = async (req: ApiRequest, res: ApiResponse): Promise<void> => {
  const key = groqKey();
  if (!key) return sendError(res, 503, 'IA no configurada');

  const raw = req.body;
  if (!raw || typeof (raw as { size?: unknown }).size !== 'number') {
    return sendError(res, 400, 'Audio ausente');
  }

  const audio = raw as { size: number; type?: string; buffer?: (enc?: string) => string };
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return sendError(res, 413, 'Audio demasiado grande');
  }

  const form = new FormData();
  const filename = audio.type?.includes('mp4') ? 'audio.mp4' : 'audio.webm';
  form.append('file', new Blob([audio.buffer as BlobPart], { type: audio.type || 'audio/webm' }), filename);
  form.append('model', WHISPER_MODEL);
  form.append('language', 'es');
  form.append('temperature', '0');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    if (!upstream.ok) return sendError(res, 502, 'TranscripciÃ³n no disponible');
    const data = (await upstream.json()) as { text?: string };
    res.status(200).json({ text: (data?.text ?? '').trim() });
  } catch {
    sendError(res, 502, 'TranscripciÃ³n no disponible');
  } finally {
    clearTimeout(timer);
  }
};

export default async function aiHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return sendError(res, 405, 'MÃ©todo no permitido');

  const path = (req.url ?? '').split('?')[0].replace(/\/+$/, '');
  if (path !== '/api/ai/chat' && path !== '/api/ai/transcribe') {
    return sendError(res, 404, 'Not found');
  }

  if (!allowRequest(clientKey(req))) {
    res.setHeader?.('Retry-After', '30');
    return sendError(res, 429, 'Demasiadas peticiones');
  }

  if (path === '/api/ai/transcribe') return handleTranscribe(req, res);
  return handleChat(req, res);
}