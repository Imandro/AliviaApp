/* ----------------------------------------------------
   ALIVIA - CLIENTE API OFFLINE-FIRST
   1. GET: caché local; sin red sirve la última respuesta.
   2. Escrituras: si no hay red se encolan y se sincronizan
      solas al reconectar (orden FIFO preservado).
   ---------------------------------------------------- */

import { API_BASE } from './apiBase';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class NetworkError extends Error {}
export class OfflineQueuedError extends Error {}

export const isHttpError = (e: unknown): e is HttpError => e instanceof HttpError;

/** Id temporal negativo para registros optimistas offline (el real llega al sincronizar). */
export const tempId = (): number => -(Date.now() % 100000000) - Math.floor(Math.random() * 999);

const CACHE_PREFIX = 'alivia_cache:';
const OUTBOX_KEY = 'alivia_outbox';

interface OutboxItem {
  id: string;
  path: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
  ts: number;
}

export const readCache = <T>(path: string): T | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
};

export const writeCache = <T>(path: string, data: T): void => {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    /* noop */
  }
};

const readOutbox = (): OutboxItem[] => {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
};

const writeOutbox = (items: OutboxItem[]): void => {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
};

const emitPending = (): void => {
  window.dispatchEvent(new CustomEvent('alivia:pending', { detail: { count: readOutbox().length } }));
};

const rawFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${API_BASE}${path}`, init);

const timeoutSignal = (ms: number): AbortSignal => {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

/** GET con respaldo de caché offline. */
export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  try {
    const res = await rawFetch(path, { method: 'GET', headers, signal: timeoutSignal(15000) });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new HttpError(res.status, body?.error || `Error ${res.status}`);
    }
    const json = (await res.json()) as T;
    writeCache(path, json);
    void flushOutbox();
    return json;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const cached = readCache<T>(path);
    if (cached !== null) return cached;
    throw new NetworkError(err instanceof Error ? err.message : 'Sin conexión');
  }
}

/** Mutación que se encola automáticamente si no hay red. */
export async function apiMutate(
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<void> {
  const { method = 'POST', body, headers } = options;
  try {
    const res = await rawFetch(path, { method, body, headers, signal: timeoutSignal(15000) });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new HttpError(res.status, errBody?.error || `Error ${res.status}`);
    }
    void flushOutbox();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const items = readOutbox();
    items.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      path,
      method,
      body,
      headers: headers ?? {},
      ts: Date.now(),
    });
    writeOutbox(items);
    emitPending();
    throw new OfflineQueuedError(`${method} ${path}`);
  }
}

// ---------- Sincronización ----------

let flushing = false;

export const pendingCount = (): number => readOutbox().length;

/** Endpoints que se revalidan en segundo plano tras sincronizar. */
const REVALIDATE_PATHS = ['/api/moods', '/api/activities', '/api/contacts', '/api/posts', '/api/plans', '/api/assessments'];

let authHeaderProvider: () => Record<string, string> = () => ({});

export const setAuthHeaderProvider = (fn: () => Record<string, string>): void => {
  authHeaderProvider = fn;
};

const revalidateCaches = (): void => {
  const headers = authHeaderProvider();
  for (const p of REVALIDATE_PATHS) {
    rawFetch(p, { method: 'GET', headers })
      .then(async (res) => {
        if (res.ok) writeCache(p, await res.json());
      })
      .catch(() => {
        /* best-effort */
      });
  }
};

/** Reenvía la cola al servidor en orden. Los 4xx se descartan; los fallos de red pausan el reintento. */
export async function flushOutbox(): Promise<void> {
  if (flushing || !readOutbox().length) return;
  flushing = true;
  window.dispatchEvent(new CustomEvent('alivia:flushing'));
  try {
    const items = readOutbox();
    while (items.length) {
      const item = items[0];
      try {
        const res = await rawFetch(item.path, {
          method: item.method,
          body: item.body,
          headers: item.headers,
          signal: timeoutSignal(15000),
        });
        if (res.status >= 200 && res.status < 500) {
          items.shift();
          writeOutbox(items);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }

  if (!readOutbox().length) {
    window.dispatchEvent(new CustomEvent('alivia:synced'));
    revalidateCaches();
  } else {
    emitPending();
  }
}

// Arranque y reintentos automáticos (solo navegador/WebView)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushOutbox());
  window.setTimeout(() => void flushOutbox(), 4000);
  window.setInterval(() => void flushOutbox(), 30000);
}
