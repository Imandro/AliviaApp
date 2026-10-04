/* ----------------------------------------------------
   ALIVIA - PROVEEDOR DE IA (Groq)
   Tres responsabilidades, en este orden:
   1. Decidir el modo de la conversacion (normal / crisis / salida).
   2. Pedir la respuesta al modelo, con failover y streaming.
   3. Degradar a las reglas locales si el modelo no esta disponible.
   La clave de Groq vive en el backend (proxy /api/ai); el bundle
   del cliente solo la lleva en desarrollo.
   ---------------------------------------------------- */

import { assessCrisis, describeCrisis, type CrisisAssessment } from './crisisSafety';
import {
  buildPrompt,
  mentionsHumanHelp,
  CRISIS_SUPPORT_REMINDER,
  PROMPT_VERSION,
  type GenerationParams,
  type PromptBundle,
  type PromptMode,
} from './aiPrompts';
import { getAiReply, getIntentSuggest } from './empatheticAI';

export type AiSource = 'groq' | 'rules';
export type AiTransport = 'proxy' | 'direct';

export interface AiSuggestion {
  label: string;
  path: string;
}

export interface AiReply {
  text: string;
  topics: string[];
  isCrisis: boolean;
  suggest: AiSuggestion[];
  source: AiSource;
  mode: PromptMode;
  crisisLevel: number;
  /** Nivel >= 2: ideacion concreta, metodo o plan. */
  urgent: boolean;
  /** true cuando se opto por salir del modo crisis en este turno. */
  exitedCrisis?: boolean;
}

export interface AiTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Solo se usa en desarrollo (VITE_AI_DIRECT=1). En produccion todo va por el
 * proxy, que es quien decide el upstream real. Chat a Gemini, voz a Groq.
 */
const GEMINI_CHAT_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

/**
 * Mismo orden que el proxy en api/ai.ts. Si difieren, el desarrollo no
 * reproduce produccion y ademas el proxy rechaza con 400 cualquier modelo que
 * no este en su lista.
 *
 * El orden no es por calidad en abstracto: Google devuelve 429 "high demand"
 * de forma intermitente en los Flash, asi que se prueban en cascada.
 */
const CHAT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

const LLM_TIMEOUT_MS = 20000;
const FIRST_TOKEN_TIMEOUT_MS = 12000;
const MAX_HISTORY_TURNS = 8;
const MAX_REPLY_CHARS = 420;
const MAX_RETRIES = 2;

const SUGGEST_SOS: AiSuggestion = { label: 'Ver líneas de ayuda (SOS)', path: '/sos' };
const SUGGEST_CONNECT: AiSuggestion = { label: 'Conecta con alguien de confianza', path: '/connect' };
const SUGGEST_DEFAULT: AiSuggestion[] = [
  { label: 'Ejercicio de respiración', path: '/breathe' },
  { label: 'Actividades de apoyo', path: '/coping' },
];

// ---------- configuracion ----------

const env = (key: string): string => {
  try {
    return ((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
  } catch {
    return '';
  }
};

/** En desarrollo directo, el chat va a Gemini y la voz a Groq. */
const directChatKey = (): string => env('VITE_GEMINI_API_KEY');
const directVoiceKey = (): string => env('VITE_GROQ_API_KEY');

/** El proxy es el camino normal en produccion; el directo, solo en desarrollo. */
const transport = (): AiTransport =>
  env('VITE_AI_DIRECT') === '1' && (directChatKey() || directVoiceKey()) ? 'direct' : 'proxy';

const aiBase = (): string => {
  const base = (import.meta.env.VITE_API_URL || '').trim();
  return base ? base.replace(/\/+$/, '') : '';
};

const configuredModels = (): string[] => {
  const list = env('VITE_CHAT_MODEL')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return list.length ? list : CHAT_MODELS;
};

export const hasOnlineAI = (): boolean => {
  if (transport() === 'direct') return directChatKey().length > 0;
  return aiBase().length > 0;
};

export const aiTransport = transport;

// ---------- limpieza de la respuesta del modelo ----------

export const collapseWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim();

export const trimReply = (content: string, max = MAX_REPLY_CHARS): string => {
  const cleaned = collapseWhitespace(content);
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
};

const stopWords = new Set([
  'de', 'la', 'que', 'el', 'en', 'lo', 'un', 'por', 'con', 'una', 'su', 'para', 'es', 'y',
  'me', 'mi', 'se', 'al', 'lo', 'ya', 'como', 'mas', 'pero', 'del', 'son', 'muy', 'todo',
  'the', 'and', 'you',
]);

const tokens = (s: string): string[] =>
  normalizeForEcho(s).split(' ').filter(w => w.length > 2 && !stopWords.has(w));

/**
 * Minusculas, sin tildes y sin puntuacion. El filtro anti-eco comparaba con un
 * rango de caracteres que no incluía las vocales acentuadas, asi que en la
 * practica cualquier respuesta en espanol con tilde escapaba del filtro.
 */
export const normalizeForEcho = (s: string): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Detecta que la respuesta sea una devolucion del mensaje. Antes solo comparaba
 * comparacion por inclusion de subcadena; ahora anade solapamiento de
 * palabras, que es lo que
 * detecta el eco parcial ("me siento muy solo" -> "sientes que estas solo").
 */
export const looksLikeEcho = (reply: string, userMsg: string): boolean => {
  const a = normalizeForEcho(reply);
  const b = normalizeForEcho(userMsg);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length > 8 && a.includes(b)) return true;

  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length < 2 || tb.length < 2) return false;
  const setA = new Set(ta);
  const shared = tb.filter(t => setA.has(t)).length;
  return shared / tb.length >= 0.7;
};

/** Quita el prefijo que algunos modelos Anteponen ("Livi:", "Respuesta:"). */
const stripPreamble = (text: string): string =>
  text.replace(/^\s*(livi|via|respuesta|assistant|ia)\s*[:\-—]\s*/i, '');

/**
 * Red de seguridad del modo crisis: si la respuesta no menciona ninguna salida
 * humana, se le anade un recordatorio. Un modelo puede responder con
  "piensa en algo bueno"
 * "respira y todo pasara"; la UI ofrece SOS justo debajo, pero el texto mismo
 * no debe dejar a alguien solo con una platitud.
 */
const enforceCrisisSupport = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return CRISIS_SUPPORT_REMINDER;
  if (mentionsHumanHelp(trimmed)) return trimmed;
  return `${trimmed.replace(/[.!?\s]+$/, '')}. ${CRISIS_SUPPORT_REMINDER}`;
};

const usableText = (text: string | null, userMsg: string): string | null => {
  if (!text) return null;
  const cleaned = stripPreamble(collapseWhitespace(text));
  if (!cleaned) return null;
  if (looksLikeEcho(cleaned, userMsg)) return null;
  return cleaned;
};

// ---------- planificacion del turno ----------

export interface ReplyOptions {
  history: AiTurn[];
  crisisMode: boolean;
  /** Textos previos de la conversacion, para que el clasificador herede contexto. */
  historyTexts?: string[];
}

interface Plan {
  mode: PromptMode;
  bundle: PromptBundle;
  assessment: CrisisAssessment;
  suggest: AiSuggestion[];
  rulesReply: ReturnType<typeof getAiReply>;
  suggestRuled: AiSuggestion[] | null;
  messages: AiTurn[];
}

const redactHistory = (turn: AiTurn): AiTurn => {
  if (turn.role === 'user' && assessCrisis(turn.content).isCrisis) {
    return {
      role: 'user',
      content: '[Mensaje omitido por privacidad: la persona mencionó riesgo de suicidio o autolesión.]',
    };
  }
  return turn;
};

const planTurn = (message: string, opts: ReplyOptions): Plan => {
  const assessment = assessCrisis(message, opts.historyTexts ?? []);
  const rulesReply = getAiReply(message);
  const suggestRuled = getIntentSuggest(message);

  // Dentro del modo crisis, una frase de "ya estoy bien" cierra el accompany.
  // El modelo solo no puede decidir esto: el cambio de modo lo pide la persona.
  if (opts.crisisMode && !assessment.isCrisis && assessment.safeToExit) {
    const bundle = buildPrompt('crisis-exit');
    return {
      mode: 'crisis-exit',
      bundle,
      assessment,
      suggest: [],
      rulesReply: { ...rulesReply, isCrisis: false, suggest: [] },
      suggestRuled: null,
      messages: [
        { role: 'system', content: bundle.system },
        ...opts.history.slice(-MAX_HISTORY_TURNS).map(redactHistory),
        { role: 'user', content: message },
      ],
    };
  }

  if (assessment.isCrisis) {
    const bundle = buildPrompt('crisis', assessment);
    return {
      mode: 'crisis',
      bundle,
      assessment,
      suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
      rulesReply,
      suggestRuled,
      messages: [
        { role: 'system', content: bundle.system },
        ...opts.history.slice(-MAX_HISTORY_TURNS).map(redactHistory),
        { role: 'user', content: message },
      ],
    };
  }

  if (opts.crisisMode) {
    // El modo crisis sigue activo aunque este turno no tenga señales nuevas:
    // cambiar de prompt a mitad de una crisis es exactamente lo que hay que
    // evitar, y la persona puede hablar de otra cosa sin que eso la saque.
    const bundle = buildPrompt('crisis', assessCrisis(message, opts.historyTexts ?? []));
    return {
      mode: 'crisis',
      bundle,
      assessment,
      suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
      rulesReply,
      suggestRuled,
      messages: [
        { role: 'system', content: bundle.system },
        ...opts.history.slice(-MAX_HISTORY_TURNS).map(redactHistory),
        { role: 'user', content: message },
      ],
    };
  }

  const bundle = buildPrompt('normal');
  return {
    mode: 'normal',
    bundle,
    assessment,
    suggest: suggestRuled ?? SUGGEST_DEFAULT,
    rulesReply,
    suggestRuled,
    messages: [
      { role: 'system', content: bundle.system },
      ...opts.history.slice(-MAX_HISTORY_TURNS).map(redactHistory),
      { role: 'user', content: message },
    ],
  };
};

const finalize = (plan: Plan, raw: string | null, message: string): AiReply => {
  const isCrisis = plan.mode === 'crisis';
  const usable = usableText(raw, message);
  if (usable) {
    const text = isCrisis
      ? enforceCrisisSupport(trimReply(usable, 500))
      : trimReply(usable);
    return {
      text,
      topics: [],
      isCrisis,
      suggest: plan.suggest,
      source: 'groq',
      mode: plan.mode,
      crisisLevel: plan.assessment.level,
      urgent: plan.assessment.urgent,
      exitedCrisis: plan.mode === 'crisis-exit' || undefined,
    };
  }

  if (plan.mode === 'crisis-exit') {
    return {
      text: rulesReplyExitText(plan),
      topics: [],
      isCrisis: false,
      suggest: SUGGEST_DEFAULT,
      source: 'rules',
      mode: plan.mode,
      crisisLevel: 0,
      urgent: false,
      exitedCrisis: true,
    };
  }

  return {
    ...plan.rulesReply,
    isCrisis,
    suggest: plan.suggest,
    source: 'rules',
    mode: plan.mode,
    crisisLevel: plan.assessment.level,
    urgent: plan.assessment.urgent,
  };
};

/* La interpolacion anterior metia el condicional dentro de la frase y dejaba un
   espacio colgando cuando valia false ("eso, y que te cueste menos"). Ahora se
   arma la frase y se une con espacios, sin recortar a mano. */
const rulesReplyExitText = (plan: Plan): string =>
  [
    'Qué bueno que me cuentes eso',
    plan.assessment.normalized ? 'y que de verdad te cueste menos ahora' : '',
    'Gracias por haberlo contado: eso ya es un paso grande. El SOS y las líneas de ayuda siguen aquí cuando las necesites, sin prisa.',
    'Si quieres, hoy basta con algo pequeño: caminar un poco, escribir una línea en tu diario o hablar con alguien que te importa.',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------- red ----------

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

/** Espera indicada por Retry-After (segundos) o un backoff exponencial acotado. */
const backoffMs = (attempt: number, retryAfter: string | null): number => {
  const hinted = Number(retryAfter);
  if (Number.isFinite(hinted) && hinted > 0) return Math.min(hinted * 1000, 5000);
  return Math.min(600 * 2 ** attempt, 3000) + Math.random() * 250;
};

const withTimeout = (ms: number): { signal: AbortSignal; done: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

const groqBody = (plan: Plan, model: string, stream: boolean): string =>
  JSON.stringify({
    model,
    stream,
    ...plan.bundle.params,
    messages: plan.messages,
  });

const proxyBody = (plan: Plan, stream: boolean, model?: string): string =>
  JSON.stringify({
    messages: plan.messages,
    params: plan.bundle.params,
    promptVersion: plan.bundle.version,
    mode: plan.mode,
    model,
    stream,
  });

interface AttemptResult {
  text: string | null;
  status: number;
  retryAfter: string | null;
}

const parseRetryAfter = (res: { headers: { get(name: string): string | null } }): string | null => {
  try {
    return res.headers?.get?.('retry-after') ?? null;
  } catch {
    return null;
  }
};

const readJson = async (res: Response): Promise<any> => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const callDirect = async (plan: Plan, model: string, signal: AbortSignal): Promise<AttemptResult> => {
  const key = directChatKey();
  if (!key) return { text: null, status: 0, retryAfter: null };
  const res = await fetch(GEMINI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: groqBody(plan, model, false),
    signal,
  });
  if (!res.ok) return { text: null, status: res.status, retryAfter: parseRetryAfter(res) };
  const data = await readJson(res);
  return { text: data?.choices?.[0]?.message?.content ?? null, status: 200, retryAfter: null };
};

const callProxy = async (
  plan: Plan,
  model: string | undefined,
  signal: AbortSignal,
): Promise<AttemptResult> => {
  const res = await fetch(`${aiBase()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: proxyBody(plan, false, model),
    signal,
  });
  if (!res.ok) return { text: null, status: res.status, retryAfter: parseRetryAfter(res) };
  const data = await readJson(res);
  return { text: data?.text ?? null, status: 200, retryAfter: null };
};

const isRateLimited = (status: number): boolean => status === 429;
const isTransient = (status: number): boolean => status === 0 || status === 408 || status >= 500;

/** Un fallo de red no mejora reintentando: no hay servidor al que preguntar. */
const isNetworkFailure = (err: unknown): boolean =>
  err instanceof TypeError || (err as Error)?.name === 'AbortError';

/**
 * Recorre la lista de modelos reintentando los errores transitorios del
 * servidor (429 y 5xx). Antes un fallo de red en el primer modelo abortaba toda
 * la cadena (`catch` con `return null`), dejando al usuario sin IA aunque
 * quedaran modelos libres.
 */
const queryModels = async (
  plan: Plan,
  signal: AbortSignal,
  onModel?: (model: string) => void,
): Promise<string | null> => {
  const models = configuredModels();
  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      onModel?.(model);
      try {
        const result =
          transport() === 'direct'
            ? await callDirect(plan, model, signal)
            : await callProxy(plan, model, signal);
        if (result.text) return result.text;
        if (isRateLimited(result.status) || isTransient(result.status)) {
          if (attempt < MAX_RETRIES) {
            await sleep(backoffMs(attempt, result.retryAfter));
            continue;
          }
        }
        break;
      } catch (err) {
        if (signal.aborted || isNetworkFailure(err)) return null;
        break;
      }
    }
  }
  return null;
};

export const getModelReply = async (message: string, opts: ReplyOptions): Promise<AiReply> => {
  const plan = planTurn(message, opts);
  const { signal, done } = withTimeout(LLM_TIMEOUT_MS);
  try {
    const raw = await queryModels(plan, signal);
    return finalize(plan, raw, message);
  } catch {
    return finalize(plan, null, message);
  } finally {
    done();
  }
};

// ---------- streaming ----------

export interface StreamHandlers {
  onDelta?: (delta: string, full: string) => void;
  signal?: AbortSignal;
}

interface SseEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  model?: string;
  reason?: string;
}

/**
 * Lee un cuerpo SSE y agrupa los `data:` en eventos. Se exporta para poder
 * probarlo con un stream falso: el parseo de SSE es donde mas facil se rompe
 * un cliente de chat (fragmentos partido entre dos chunks de red).
 */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const payload = raw
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('');
        if (!payload) {
          boundary = buffer.indexOf('\n\n');
          continue;
        }
        if (payload === '[DONE]') {
          yield { type: 'done' };
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.type === 'delta' && typeof parsed.text === 'string') {
            yield { type: 'delta', text: parsed.text };
          } else if (parsed?.type === 'done') {
            yield { type: 'done', model: parsed.model };
          } else if (parsed?.type === 'error') {
            yield { type: 'error', reason: parsed.reason };
          }
        } catch {
          /* fragmento incompleto: se ignora */
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const streamDirect = async (plan: Plan, model: string, handlers: StreamHandlers): Promise<string | null> => {
  const key = directChatKey();
  if (!key) return null;
  const res = await fetch(GEMINI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: groqBody(plan, model, true),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) return null;
  return collectGroqStream(res.body, handlers);
};

const collectGroqStream = async (
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers,
): Promise<string | null> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const feed = (line: string): void => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) {
        full += delta;
        handlers.onDelta?.(delta, full);
      }
    } catch {
      /* fragmento incompleto */
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf('\n');
      while (nl !== -1) {
        feed(buffer.slice(0, nl).replace(/\r$/, ''));
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');
      }
    }
    if (buffer.trim()) feed(buffer.trim());
  } finally {
    reader.releaseLock();
  }
  return full;
};

const streamProxy = async (
  plan: Plan,
  model: string | undefined,
  handlers: StreamHandlers,
): Promise<string | null> => {
  const res = await fetch(`${aiBase()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: proxyBody(plan, true, model),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) return null;

  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/event-stream')) {
    // El proxy puede responder sin streaming si no lo soporta: se acepta igual.
    const data = await readJson(res);
    const text: string | null = data?.text ?? null;
    if (text) handlers.onDelta?.(text, text);
    return text;
  }

  let full = '';
  for await (const event of parseSse(res.body)) {
    if (event.type === 'delta' && event.text) {
      full += event.text;
      handlers.onDelta?.(event.text, full);
    } else if (event.type === 'error') {
      return null;
    } else if (event.type === 'done') {
      break;
    }
  }
  return full;
};

const streamModels = async (
  plan: Plan,
  handlers: StreamHandlers,
): Promise<string | null> => {
  const { signal, done } = withTimeout(FIRST_TOKEN_TIMEOUT_MS);
  const userSignal = handlers.signal;
  const relay = userSignal
    ? AbortSignal.any([signal, userSignal])
    : signal;

  try {
    for (const model of configuredModels()) {
      if (relay.aborted) return null;
      try {
        const full =
          transport() === 'direct'
            ? await streamDirect(plan, model, { ...handlers, signal: relay })
            : await streamProxy(plan, model, { ...handlers, signal: relay });
        if (full) return full;
      } catch (err) {
        if (userSignal?.aborted) return null;
        if (relay.aborted && !userSignal?.aborted) return null;
        if (!(err instanceof TypeError) && (err as Error)?.name !== 'AbortError') continue;
      }
    }
    return null;
  } finally {
    done();
  }
};

/**
 * Reply con streaming. Si el modelo no devuelve nada (sin red, sin clave, 429),
 * cae a las reglas locales con la misma garantia del camino sin streaming.
 */
export const streamAiReply = async (
  message: string,
  opts: ReplyOptions,
  handlers: StreamHandlers = {},
): Promise<AiReply> => {
  const plan = planTurn(message, opts);
  let raw: string | null = null;
  try {
    raw = await streamModels(plan, handlers);
  } catch {
    raw = null;
  }
  return finalize(plan, raw, message);
};

// ---------- analisis del diario ----------

export interface JournalAnalysis {
  emotion: string;
  valence: number;
  topics: string[];
  crisis: boolean;
}

const JOURNAL_TOPICS: Array<[RegExp, string, number]> = [
  [/crisis|suicid|hacerme da[nñ]o|acabar con mi vida|no quiero (vivir|seguir)/, 'crisis', -1],
  [/ansied|nervi|panic|estres|stress|presion|examen|acelerad/, 'ansiedad', -0.6],
  [/triste|deprimi|vacio|sin ganas|sin fuerza/, 'tristeza', -0.7],
  [/enojo|ira|rabia|frustra|molest/, 'enojo', -0.5],
  [/sol|sola|abandona|nadie me|me siento a solas/, 'soledad', -0.6],
  [/mied|temor|asusta|aterror/, 'miedo', -0.5],
  [/familia|mama|papa|herman|hijo/, 'familia', -0.4],
  [/suen|insomnio|dormir|descans/, 'sueño', -0.4],
  [/consum|droga|alcohol|vicio|recaer|fumar/, 'consumo', -0.6],
  [/relacion|novi|pareja|corazon|termina/, 'relaciones', -0.4],
  [/cansad|agot|sin energia|quemad/, 'agotamiento', -0.4],
  [/escuela|examen|tarea|nota|clase|estudi/, 'presión académica', -0.5],
];

export const analyzeJournalEntry = (text: string): JournalAnalysis => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { emotion: 'neutro', valence: 0, topics: [], crisis: false };
  if (assessCrisis(trimmed).isCrisis) {
    return { emotion: 'crisis', valence: -1, topics: ['crisis'], crisis: true };
  }
  const lower = trimmed.toLowerCase();
  const topics: string[] = [];
  let emotion = 'neutro';
  let valence = 0.2;
  for (const [regex, label, v] of JOURNAL_TOPICS) {
    if (regex.test(lower)) {
      if (!topics.includes(label)) topics.push(label);
      emotion = label;
      if (v < valence) valence = v;
    }
  }
  // "logr[ée]" no cubria "logro", que es como se escribe la mayor parte del
  // tiempo: una entrada positiva se puntuaba como neutra.
  if (/gracias|mejor|feliz|logro|logr[ée]|super|orgullos|bien hoy|disfrut/.test(lower)) {
    valence = Math.max(valence, 0.6);
    if (!topics.includes('positivo')) topics.push('positivo');
  }
  return { emotion, valence, topics, crisis: false };
};

// ---------- transcripcion de voz ----------

export const transcribeAudio = async (blob: Blob): Promise<string> => {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', WHISPER_MODEL);
  form.append('language', 'es');
  form.append('temperature', '0');

  try {
    if (transport() === 'proxy' && aiBase()) {
      const res = await fetch(`${aiBase()}/api/ai/transcribe`, { method: 'POST', body: form });
      if (!res.ok) return '';
      const data = await readJson(res);
      return (data?.text ?? '').trim();
    }

    const key = directVoiceKey();
    if (!key) return '';
    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return '';
    const data = await readJson(res);
    return (data?.text ?? '').trim();
  } catch {
    return '';
  }
};

export { PROMPT_VERSION, describeCrisis };
