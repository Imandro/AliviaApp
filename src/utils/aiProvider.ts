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
  'Reglas obligatorias:',
  '- Responde SIEMPRE en español, con calidez, sin juicios y con un tono cercano pero serio cuando haga falta.',
  '- Se EXTREMADAMENTE breve: 2 o 3 frases máximo, menos de 60 palabras. Prohibido usar markdown, listas o emojis repetidos.',
  '- NO eres un profesional clínico ni un terapeuta: eres un acompañamiento digital. No diagnostiques ni recetes.',
  '- Ofrece pasos concretos y pequeños para el momento presente, y usa recursos de la app (respiración, actividades, diario, radar de ánimo, planes) cuando encajen.',
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

const CRISIS_SYSTEM_PROMPT = [
  'CONTEXTO ACTUAL: la persona está en una conversación de crisis (acaba de mencionar suicidio, autolesión o no querer seguir viviendo).',
  'Reglas ESTRICTAS de este modo:',
  '- PERMANECE en el tema de la crisis. NO cambies de rumbo, no ofrezcas actividades recreativas, juegos ni herramientas de bienestar hasta que la persona diga claramente que está a salvo y fuera de peligro.',
  '- Valida su dolor sin minimizar ni dramatizar. Pregunta directamente y con cuidado por su seguridad y la de los demás, por ejemplo: "¿Estás a salvo en este momento?" o "¿Puedes poner tus pies en el suelo ahora mismo?".',
  '- Recuérdale siempre la posibilidad real de hablar HOY con una persona de confianza o con una línea de crisis gratuita (SOS en la app). Nunca prometas guardar silencio ni le pidas esperar sin apoyo.',
  '- Si ya hay un plan o intención inmediata, repite con seriedad que busque apoyo humano urgente (línea de crisis o emergencias).',
  '- Si la persona dice explícitamente que ya está en un lugar seguro y tranquilo, reconócelo con calidez, y solo entonces cierra suavemente con los recursos de apoyo. Nunca des por hecho la seguridad sin que ella lo diga.',
  '- Sé breve: 2 o 3 frases. Nunca agregues temas nuevos ni preguntas de otra índole.',
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

  if (isCrisis) {
    const crisis = getAiReply(message);
    return { ...crisis, source: 'rules' };
  }

  const ruledSuggest = getIntentSuggest(message);
  const lastTurns = history.slice(-MAX_HISTORY_TURNS);

  if (crisisMode) {
    const llmText = await queryGroq(
      [{ role: 'system', content: CRISIS_SYSTEM_PROMPT }, ...lastTurns.map(sanitizeForLLM), { role: 'user', content: message }],
    );
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

  const llmText = await queryGroq([...lastTurns.map(sanitizeForLLM), { role: 'user', content: message }]);
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