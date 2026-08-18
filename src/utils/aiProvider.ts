import { detectCrisis, getAiReply, getIntentSuggest } from './empatheticAI';

export type AiSource = 'groq' | 'rules';

export interface AiReply {
  text: string;
  topics: string[];
  isCrisis: boolean;
  suggest: { label: string; path: string }[];
  source: AiSource;
}

export interface AiTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];
const LLM_TIMEOUT_MS = 18000;
const MAX_HISTORY_TURNS = 8;

const getGroqKey = (): string => {
  try {
    return (import.meta.env.VITE_GROQ_API_KEY as string) || '';
  } catch {
    return '';
  }
};

export const hasOnlineAI = (): boolean => getGroqKey().trim().length > 0;

const SYSTEM_PROMPT = [
  'Eres "VIA", la asistente virtual de la app Alivia, una app de bienestar emocional para jóvenes de Centroamérica. TE LLAMAS VIA: cuando te presentes o te pregunten tu nombre, dile "VIA".',
  'Rol y tono:',
  '- Habla como una amiga cálida, amable y serena que se preocupa de verdad. Sé afectuosa y empática: valida su sentir, reconócele su esfuerzo y dile que no está sola.',
  '- Usa un lenguaje bonito y suave: palabras de aliento, cuidado y esperanza. Trata a la persona con cariño y respeto. No seas clínica ni lejana, pero tampoco invasiva ni informal de más.',
  '- Comprende primero lo que le pasa y refiérete a sus propias palabras; luego acompáñala a dar un paso pequeño. Ofrece pasos concretos y usa los recursos de la app (respiración, actividades, diario, radar de ánimo, planes) cuando encajen.',
  'Reglas obligatorias:',
  '- Responde SIEMPRE en español, con calidez y sin juicios.',
  '- Se EXTREMADAMENTE breve: 2 o 3 frases máximo, menos de 60 palabras. Prohibido usar markdown, listas o emojis repetidos.',
  '- NUNCA repitas ni devuelvas el texto del usuario: no repliques palabra por palabra lo que dice. Responde desde tu amoroso rol, no como un eco; si algo no está claro, pregunta con suavidad.',
  '- NO eres un profesional clínico ni un terapeuta: eres un acompañamiento digital. No diagnostiques ni recetes.',
  '- Si la persona insiste en hacerse daño o no quiere vivir: valida sin minimizar, dale urgencia real, pídele que hable HOY con una persona de confianza o una línea de crisis gratuita, y sugiere el SOS de la app.',
  '- No uses el nombre de la persona salvo que lo haya dicho antes en la conversación.',
].join('\n');

const MAX_REPLY_CHARS = 420;

const trimReply = (content: string): string => {
  const cleaned = content.replace(/\s*\n\s*/g, ' ').trim();
  if (cleaned.length <= MAX_REPLY_CHARS) return cleaned;
  const cut = cleaned.slice(0, MAX_REPLY_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + '…';
};

const sanitizeForLLM = (turn: AiTurn): AiTurn => {
  if (turn.role === 'user' && detectCrisis(turn.content)) {
    return { role: 'user', content: '[Mensaje omitido por privacidad: la persona mencionó riesgo de suicidio o autolesión.]' };
  }
  return turn;
};

const normalize = (s: string): string => s.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, '').replace(/\s+/g, ' ').trim();

const looksLikeEcho = (reply: string, userMsg: string): boolean => {
  const a = normalize(reply);
  const b = normalize(userMsg);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length > 8 && a.includes(b)) return true;
  return false;
};

const usableText = (text: string | null, userMsg: string): string | null => {
  if (!text) return null;
  if (looksLikeEcho(text, userMsg)) return null;
  return text;
};

export interface JournalAnalysis {
  emotion: string;
  valence: number;
  topics: string[];
  crisis: boolean;
}

const JOURNAL_TOPICS: Array<[RegExp, string, number]> = [
  [/crisis|suicid|hacerme dañ|acab[ao].*vida|no quiero (?:vivir|seguir)/, 'crisis', -1],
  [/ansied|nervi|panic|estres|stress|presion|examen|acelerad/, 'ansiedad', -0.6],
  [/triste|deprimi|vac[ií]o|sin ganas|sin fuerza/, 'tristeza', -0.7],
  [/enojo|ira|rabia|frustra|molest/, 'enojo', -0.5],
  [/sol|sola|abandona|nadie me|me siento a solas/, 'soledad', -0.6],
  [/mied|temor|asusta|aterror/, 'miedo', -0.5],
  [/familia|mam[áa]|pap[áa]|herman|hijo/, 'familia', -0.4],
  [/sue[ñn]|insomnio|dormir|descans/, 'sueño', -0.4],
  [/consum|droga|alcohol|vicio|recaer|fumar/, 'consumo', -0.6],
  [/relacion|novi|pareja|coraz[óo]n|termin[óa]/, 'relaciones', -0.4],
  [/cansad|agot|sin energia|quemad/, 'agotamiento', -0.4],
  [/escuela|examen|tarea|nota|clase|estudi/, 'presión académica', -0.5],
];

export const analyzeJournalEntry = (text: string): JournalAnalysis => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { emotion: 'neutro', valence: 0, topics: [], crisis: false };
  if (detectCrisis(trimmed)) {
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
  if (/gracias|mejor|feliz|logr[ée]|super[ée]|orgullos|bien hoy|disfrut/.test(lower)) {
    valence = Math.max(valence, 0.6);
    if (!topics.includes('positivo')) topics.push('positivo');
  }
  return { emotion, valence, topics, crisis: false };
};

const CRISIS_SYSTEM_PROMPT = [
  'CONTEXTO ACTUAL: la persona está en una conversación de crisis (mencionó suicidio, autolesión, no querer seguir viviendo o un peligro inminente).',
  'Tu rol AHORA: acompañar con mucho cariño y calma, darle seguridad y guiarla paso a paso según exactamente lo que comparte. No respondas con consejos genéricos ni listas. Trátala con ternura: dile que te importa, que no está sola y que vale mucho.',
  'Reglas ESTRICTAS de este modo:',
  '- PERMANECE en el tema de la crisis. NO cambies de rumbo ni ofrezcas actividades recreativas o herramientas de bienestar; queda en acompañar el momento presente.',
  '- Valida su dolor sin minimizar y sin dramatizar. Refleja lo que acaba de decir para que se sienta escuchada y guíala según sus propias palabras.',
  '- Ofrece de inmediato UNA ancla de calma concreta para el momento presente (respirar lento contando hasta 4, agua fría en la cara o muñecas, pies firmes en el suelo, nombrar 5 cosas que ve), en una sola frase, y luego pregúntale con cuidado: "¿Estás a salvo en este momento?" o "¿Quieres que respiremos juntos?".',
  '- Ajusta el siguiente paso según su respuesta: si dice que puede respirar, acompáñala en la respiración; si dice que tiene un plan o una intención inmediata, dile con seriedad que busque apoyo humano urgente AHORA (persona de confianza o línea de crisis, SOS en la app) y que nadie debe enfrentar esto sola.',
  '- Asígnale una micro-tarea alcanzable para los próximos minutos (un vaso de agua, sentarse junto a una ventana, escribir una palabra en su diario). Nunca dejes la conversación en un "mantente bien".',
  '- Recuérdale siempre que puede hablar HOY con alguien de confianza o una línea gratuita; no prometas guardar silencio ni pidas esperar sin apoyo.',
  '- Si la persona dice explícitamente que ya está a salvo y tranquila, reconócelo con calidez, cierra suavemente y ofrece el respaldo de la app. Nunca des por hecho la seguridad sin que ella la confirme.',
  '- Sé breve y sereno: 2 o 3 frases, máximo 60 palabras. NO uses markdown ni emojis.',
].join('\n');

const SUGGEST_SOS = { label: 'Ver líneas de ayuda (SOS)', path: '/sos' };
const SUGGEST_CONNECT = { label: 'Conecta con alguien de confianza', path: '/connect' };

const TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

export const transcribeWithGroq = async (blob: Blob): Promise<string> => {
  const key = getGroqKey();
  if (!key) return '';
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', WHISPER_MODEL);
  form.append('language', 'es');
  form.append('temperature', '0');
  try {
    const res = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data?.text ?? '').trim();
  } catch {
    return '';
  }
};

const queryGroq = async (history: AiTurn[]): Promise<string | null> => {
  const key = getGroqKey();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const models = (import.meta.env.VITE_GROQ_MODEL as string)
      ? [import.meta.env.VITE_GROQ_MODEL as string]
      : GROQ_MODELS;

    for (const model of models) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.85,
            max_tokens: 320,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          }),
          signal: controller.signal,
        });

        if (res.status === 429) return null;
        if (!res.ok) continue;

        const data = await res.json();
        const content: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
        if (content.length > 0) return trimReply(content);
      } catch {
        return null;
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const getAiReplyHybrid = async (message: string, history: AiTurn[], crisisMode = false): Promise<AiReply> => {
  const isCrisis = detectCrisis(message);
  const lastTurns = history.slice(-MAX_HISTORY_TURNS);

  if (isCrisis) {
    const crisis = getAiReply(message);
    const llmText = usableText(await queryGroq([
      { role: 'system', content: CRISIS_SYSTEM_PROMPT },
      ...lastTurns.map(sanitizeForLLM),
      { role: 'user', content: message },
    ]), message);
    if (llmText) {
      return {
        text: llmText,
        topics: [],
        isCrisis: true,
        suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
        source: 'groq',
      };
    }
    return { ...crisis, isCrisis: true, source: 'rules' };
  }

  const ruledSuggest = getIntentSuggest(message);

  if (crisisMode) {
    const llmText = usableText(await queryGroq(
      [{ role: 'system', content: CRISIS_SYSTEM_PROMPT }, ...lastTurns.map(sanitizeForLLM), { role: 'user', content: message }],
    ), message);
    if (llmText) {
      return {
        text: llmText,
        topics: [],
        isCrisis: false,
        suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
        source: 'groq',
      };
    }
    const rules = getAiReply(message);
    return { ...rules, suggest: [SUGGEST_SOS, SUGGEST_CONNECT], source: 'rules' };
  }

  const llmText = usableText(await queryGroq([...lastTurns.map(sanitizeForLLM), { role: 'user', content: message }]), message);
  if (llmText) {
    return {
      text: llmText,
      topics: [],
      isCrisis: false,
      suggest: ruledSuggest ?? [{ label: 'Ejercicio de respiración', path: '/breathe' }, { label: 'Actividades de apoyo', path: '/coping' }],
      source: 'groq',
    };
  }

  const lastUserTopic = [...history].reverse().find(h => h.role === 'user')?.content ?? undefined;
  const rules = getAiReply(message, lastUserTopic);
  return { ...rules, source: 'rules' };
};