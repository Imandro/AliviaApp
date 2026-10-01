/* ----------------------------------------------------
   ALIVIA - PROVEEDOR DE IA (hibrido)
   El navegador NO lleva ninguna clave: habla con la Lambda
   `alivia-ai`, que decide el upstream segun el endpoint.

   Chat        -> OpenAI  (gpt-4.1-mini: mejor en espanol)
   Transcripcion -> Groq  (Whisper v3 turbo, $0.04/hora)

   Se separan porque las economias no coinciden: el chat mejora
   claramente en OpenAI, mientras que la voz alli cuesta ~$0.006
   por minuto frente a $0.04 por hora. Llevar la transcripcion a
   OpenAI multiplicaria su costo por unas nueve veces.

   Groq y OpenAI hablan el mismo formato (compatible con la API de
   OpenAI), asi que el proxy cambia de base y modelo, no de codigo.

   Por que una Lambda aparte y no la del API: la Lambda de datos esta
   dentro del VPC (para llegar a RDS) y desde ahi no hay salida a
   internet sin pagar un NAT Gateway. Es el mismo motivo que el TTS.

   Este archivo es el handler con forma Vercel (api/ai.ts); el de
   Lambda es api/lambda/ai-handler.ts, que ademas transmite la
   respuesta en streaming.
   ---------------------------------------------------- */

import type { ApiRequest, ApiResponse } from './_types.js';

export type Upstream = 'openai' | 'groq';

export interface UpstreamConfig {
  base: string;
  key: string;
  defaultModel: string;
  models: string[];
}

/**
 * Modelos de chat en orden de preferencia. gpt-4.1-mini primero: es el
 * equilibrio razonable entre calidad en espanol y costo ($0.40/$1.60 por
 * 1M). Si se degrada, nano es la misma familia mas barata; 4o-mini es
 * el ultimo recurso porque responde peor en conversacion empatica.
 */
export const OPENAI_MODELS = ['gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o-mini'];

/** Groq solo aparece como respaldo del chat si OpenAI no responde. */
export const GROQ_CHAT_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

const OPENAI_BASE = 'https://api.openai.com/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const WHISPER_MODEL = 'whisper-large-v3-turbo';

/** El proxy nunca deberia ser mas lento que el modelo que llama. */
const UPSTREAM_TIMEOUT_MS = 22000;

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

const listFrom = (raw: string | undefined, fallback: string[]): string[] => {
  const items = (raw ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
};

/**
 * Si OPENAI_API_KEY no esta configurada, el chat cae a Groq. Asi el deploy
 * de una Lambda que solo tiene la clave de Groq sigue funcionando (es lo
 * que pasa hoy), y migrar a OpenAI es solo anadir el secreto.
 */
export const chatUpstream = (): UpstreamConfig => {
  const openaiKey = (process.env.OPENAI_API_KEY ?? '').trim();
  if (openaiKey) {
    return {
      base: OPENAI_BASE,
      key: openaiKey,
      defaultModel: OPENAI_MODELS[0],
      models: listFrom(process.env.OPENAI_MODELS, OPENAI_MODELS),
    };
  }
  return {
    base: GROQ_BASE,
    key: (process.env.GROQ_API_KEY ?? '').trim(),
    defaultModel: GROQ_CHAT_MODELS[0],
    models: listFrom(process.env.GROQ_MODELS, GROQ_CHAT_MODELS),
  };
};

/** La transcripcion siempre va a Groq: alli Whisper es mucho mas barato. */
export const transcribeUpstream = (): UpstreamConfig => ({
  base: GROQ_BASE,
  key: (process.env.GROQ_API_KEY ?? '').trim(),
  defaultModel: WHISPER_MODEL,
  models: [WHISPER_MODEL],
});

const isValidModel = (model: unknown, allowed: string[]): model is string =>
  typeof model === 'string' && allowed.includes(model);

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

const handleChat = async (req: ApiRequest, res: ApiResponse): Promise<void> => {
  const upstream = chatUpstream();
  if (!upstream.key) return sendError(res, 503, 'IA no configurada');

  const body = await readBody(req);
  const messages = sanitizeMessages(body.messages);
  if (!messages) return sendError(res, 400, 'Mensajes inválidos');

  const params = sanitizeParams(body.params);
  const models = isValidModel(body.model, upstream.models)
    ? [body.model]
    : upstream.models;

  const payload = (model: string, stream: boolean): string =>
    JSON.stringify({
      model,
      messages,
      stream,
      // OpenAI rechaza max_completion_tokens en algunos modelos y pide
      // max_tokens en otros; ambos aceptan max_tokens hoy, asi que se envia
      // ese. include_usage no hace falta porque no medimos tokens.
      ...params,
    });

  let lastStatus = 502;
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res2 = await fetch(`${upstream.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upstream.key}` },
        body: payload(model, false),
        signal: controller.signal,
      });

      if (res2.ok) {
        const data = (await res2.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim()) {
          res.status(200).json({ text, model });
          return;
        }
        lastStatus = 502;
      } else if (res2.status === 429) {
        // Limite de cuota: no tiene sentido reintentar con otro modelo, la
        // cuota es por cuenta. El cliente cae a las reglas locales.
        res.status(429).json({ error: 'IA saturada' });
        return;
      } else {
        lastStatus = res2.status === 401 || res2.status === 403 ? 500 : 502;
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
  const upstream = transcribeUpstream();
  if (!upstream.key) return sendError(res, 503, 'IA no configurada');

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
  form.append('model', upstream.defaultModel);
  form.append('language', 'es');
  form.append('temperature', '0');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamRes = await fetch(`${upstream.base}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${upstream.key}` },
      body: form,
      signal: controller.signal,
    });
    if (!upstreamRes.ok) return sendError(res, 502, 'Transcripción no disponible');
    const data = (await upstreamRes.json()) as { text?: string };
    res.status(200).json({ text: (data?.text ?? '').trim() });
  } catch {
    sendError(res, 502, 'Transcripción no disponible');
  } finally {
    clearTimeout(timer);
  }
};

export default async function aiHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido');

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