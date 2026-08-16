/* ----------------------------------------------------
   ALIVIA - IA DE ORIENTACIÓN EMOCIONAL (sin API externa)
   Detecta temas clave y genera respuestas empáticas
   con orientación, herramientas y derivación a SOS.
   ---------------------------------------------------- */

export interface AiResponse {
  text: string;
  topics: string[];
  isCrisis: boolean;
  suggest: { label: string; path: string }[];
}

interface TopicRule {
  keywords: string[];
  response: string[];
  suggest?: { label: string; path: string }[];
}

const CRISIS_KEYWORDS = [
  'suicid', 'matarme', 'querer morir', 'no quiero vivir', 'acabar con mi vida',
  'lastimarme', 'autolesion', 'cortarme', 'autoneterse',
];

const SUGGEST_SOS = { label: 'Ver líneas de ayuda (SOS)', path: '/sos' };
const SUGGEST_BREATHE = { label: 'Ejercicio de respiración', path: '/breathe' };
const SUGGEST_JOURNAL = { label: 'Escribir en el desahogo', path: '/journal' };
const SUGGEST_COPING = { label: 'Actividades de apoyo', path: '/coping' };
const SUGGEST_CONNECT = { label: 'Conecta con alguien', path: '/connect' };
const SUGGEST_PLANS = { label: 'Crear un plan de progreso', path: '/plans' };
const SUGGEST_RADAR = { label: 'Ver mi radar de bienestar', path: '/radar' };

const RULES: TopicRule[] = [
  {
    keywords: ['ansiedad', 'ansioso', 'ansiosa', 'nervio', 'inquieto', 'angustia', 'pecho apretado', 'corazon', 'palpitacion'],
    response: [
      'Qué difícil se siente ese cuerpo acelerado. Quiero que sepas que el pánico que sientes ahora mismo tiene un pico: sube, se rompe y baja. No es peligroso, aunque se sienta enorme.',
      'Prueba esto ahora: inhala por la nariz contando 4, sostén 4, exhala por la boca contando 6. Repítelo tres veces. Mientras, apoya ambos pies en el suelo y siente el peso de tu cuerpo en la silla.',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_SOS],
  },
  {
    keywords: ['triste', 'tristeza', 'llorar', 'lloro', 'deprimido', 'depresion', 'vacío', 'vacias', 'sin ganas', 'desgana', 'apagado', 'apagada'],
    response: [
      'Gracias por confiar en mí lo que estás sintiendo. La tristeza y el vacío pesan, y no tienes que cargarlos solx. No hay una solución instantánea, pero sí hay pasos pequeños que sostienen.',
      'Hoy alcanza con: hidratarte, abrir una ventana o ventana que te dé luz, y escribir dos líneas de lo que sientes en tu diario. Mañana, otra cosa pequeña. La constancia construye el cambio, no la fuerza.',
    ],
    suggest: [SUGGEST_JOURNAL, SUGGEST_PLANS, SUGGEST_RADAR],
  },
  {
    keywords: ['consumir', 'drogas', 'fumar', 'falta un porro', 'adiccion', 'adicto', 'recaida', 'craving', 'hambre', 'tentacion', 'querer fumar'],
    response: [
      'La urgencia de consumir es una ola: sube rápido, pero también rompe y baja si no la alimentas. No tienes que pelear contra ella; tienes que atravesarla diez minutos a la vez.',
      'Ahora mismo: cambia la temperatura de tu cuerpo (agua fría en muñecas o cara), califica la urgencia del 1 al 10 y ponte a hacer algo neutro. Date un registro de cada ola que no consumiste: eso es progreso real.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_CONNECT, SUGGEST_SOS],
  },
  {
    keywords: ['solo', 'sola', 'soledad', 'nadie me entiende', 'sin amigos', 'no tengo a nadie', 'abandono', 'invisible'],
    response: [
      'Sentirse "nadie me entiende" es de las cargas más pesadas que existen, y no es porque no valgas: la soledad distorsiona cómo vemos el mundo.',
      'Un primer paso pequeño: escribe a una persona de confianza un mensaje breve ("no ando bien, ¿podemos hablar?") o participa en la comunidad con un mensaje anónimo. Conectar se entrena como un músculo.',
    ],
    suggest: [SUGGEST_CONNECT, { label: 'Comunidad global', path: '/community' }, SUGGEST_SOS],
  },
  {
    keywords: ['enojo', 'ira', 'molesto', 'molesta', 'rabia', 'frustrado', 'frustrada', 'odio', 'explota', 'grifando', 'gritar'],
    response: [
      'Tienes derecho a estar enojadx: el enojo también es información de que algo te daña o te duele. Lo que pide cuidado es el impulso de actuar en caliente.',
      'Haz una pausa somática: suelta los hombros, apoya los pies, y espera 90 segundos antes de responder o decidir. El enojo químico baja; después decides desde la calma, no desde el volcán.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_BREATHE, SUGGEST_JOURNAL],
  },
  {
    keywords: ['sueño', 'dormir', 'insomnio', 'no duermo', 'despertar', 'pesadillas', 'cansado', 'cansada', 'agotado', 'agotada'],
    response: [
      'Dormir mal afecta absolutamente todo: tu ánimo, tu paciencia y tu claridad. No estás "roto"; tu sistema está pidiendo descanso.',
      'Esta noche prueba: pantallas fuera 45 min antes, una ducha tibia, y una respiración 4-7-8 (inhala 4, sostén 7, exhala 8) repetida. La regularidad se construye por pequeños consistentes.',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_PLANS, SUGGEST_RADAR],
  },
  {
    keywords: ['familia', 'padres', 'mama', 'papa', 'discusion', 'peleo', 'gritan', 'casa', 'hogar', 'insultos', 'peles'],
    response: [
      'Los conflictos en casa golpean en un lugar muy hondo, sobre todo cuando no puedes elegir el escenario. Tienes derecho a proteger tu sistema nervioso aunque los demás no lo entiendan.',
      'Puedes retirarte sin explicarte: audífonos, otra habitación, una caminata corta. Nombra en tu mente: "su caos no es mi culpa". Y cuando duela mucho, no lo cargues a solas: habla con alguien de confianza o con nosotros en la comunidad.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_CONNECT, SUGGEST_SOS],
  },
  {
    keywords: ['presion', 'examen', 'estres', 'tareas', 'estudio', 'universidad', 'secola', 'sobrecarga', 'no doy abasto', 'rendirme'],
    response: [
      'El estrés de la exigencia puede sentirse como un río que te arrastra. Se sobrevive con pasos pequeños, no con fuerza bruta: el "plan de 10 minutos" existe exactamente para esto.',
      'Elige UNA sola tarea al 50% de perfección, pon 10 minutos en el reloj y hazla. Después descansa 5. Divide, no multipliques: cada bloque completado es una victoria que se registra.',
    ],
    suggest: [{ label: 'Plan de 10 min', path: '/coping' }, SUGGEST_PLANS, SUGGEST_BREATHE],
  },
  {
    keywords: ['relacion', 'novio', 'novia', 'terminar', 'ex', 'pareja', 'amor', 'corazon roto', 'engano', 'infidelidad', 'me dejaron'],
    response: [
      'El duelo por una relación es real y duele en el cuerpo, no solo en la mente. Que duela no significa que la decisión fuera equivocada.',
      'Un día a la vez: llora lo que necesites, habla con una persona que no te juzgue, y usa el radar para observar cómo cambia tu ánimo con el tiempo. El dolor agudo no es para siempre.',
    ],
    suggest: [SUGGEST_JOURNAL, SUGGEST_CONNECT, SUGGEST_RADAR],
  },
  {
    keywords: ['gracias', 'graciass'],
    response: ['Estoy aquí para eso. Cuidarte es un acto de valentía, y ya lo estás haciendo. Si vuelve a sentirse pesado, este espacio sigue aquí. 💛'],
    suggest: [],
  },
  {
    keywords: ['hola', 'hey', 'buenas', 'que tal', 'holi'],
    response: [
      'Hola, qué gusto que estés aquí. 💛 Soy tu espacio de orientación emocional: puedes contarme cómo te sientes (ansiedad, tristeza, enojo, estrés…) o pedir una herramienta para este momento.',
      'No soy un profesional clínico, pero puedo orientarte con pasos concretos y llevarte a los recursos de Alivia. ¿Qué traes hoy?',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_JOURNAL],
  },
];

const FALLBACK_RESPONSES = [
  'Gracias por compartir eso conmigo. No tienes que tenerlo resuelto: describir lo que sientes ya es un paso adelante.',
  'Estoy contigo en esto. Cuéntame un poco más: ¿hace cuánto te sientes así? ¿Hay un momento del día en que pesa más?',
  'Entiendo que esto te está costando. Una pregunta que ayuda: ¿qué necesitas EN ESTE momento, no para siempre? ¿Agua, aire, escribir, hablar, llorar?',
  'Aunque no tenga todas las respuestas, sí puedo acompañarte y compartirte herramientas. ¿Quieres que intentemos una actividad de apoyo ahora?',
];

const WITH_TOPIC_REPLY = (topic: string) =>
  `He notado que mencionas "${topic}". Quiero reconocer lo que estás diciendo y ofrecerte un espacio seguro para seguirlo: ¿cómo se siente físicamente tu cuerpo ahora mismo?`;

export const getAiReply = (message: string): { text: string; topics: string[]; isCrisis: boolean; suggest: { label: string; path: string }[] } => {
  const lower = message.toLowerCase();
  const text = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  const isCrisis = CRISIS_KEYWORDS.some(k => text.includes(k));
  if (isCrisis) {
    return {
      isCrisis: true,
      topics: ['crisis'],
      text:
        'Lo que me estás compartiendo es muy serio, y quiero que lo tomes como lo que es: una señal de que necesitas apoyo humano real HOY, no solo herramientas digitales. ' +
        'No tienes que cargar esto a solas. Ahora mismo puedes: llamar a una línea de crisis gratuita, hablar con una persona de confianza o ir a emergencias si hay peligro inmediato.',
      suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
    };
  }

  for (const rule of RULES) {
    const matched = rule.keywords.find(k => text.includes(k));
    if (matched) {
      const response = rule.response[Math.floor(Math.random() * rule.response.length)];
      return {
        isCrisis: false,
        topics: [matched],
        text: response,
        suggest: rule.suggest ?? [],
      };
    }
  }

  const detectedTopic = getTopicByText(text);

  return {
    isCrisis: false,
    topics: detectedTopic ? [detectedTopic] : [],
    text: detectedTopic
      ? WITH_TOPIC_REPLY(detectedTopic)
      : FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
    suggest: detectedTopic ? [SUGGEST_JOURNAL, SUGGEST_RADAR] : [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_JOURNAL],
  };
};

const TOPIC_LABELS: [string, string][] = [
  ['ansied', 'ansiedad'], ['triste', 'tristeza'], ['enojo', 'enojo'], ['consum', 'ganas de consumir'],
  ['solo', 'soledad'], ['familia', 'conflicto familiar'], ['sueño', 'sueño'], ['examen', 'estrés'],
  ['relacion', 'relaciones'], ['ira', 'enojo'], ['stress', 'estrés'], ['presion', 'presión'],
];

const getTopicByText = (text: string): string | null => {
  for (const [key, label] of TOPIC_LABELS) {
    if (text.includes(key)) return label;
  }
  return null;
};

export const getAiIntro = (): { text: string; topics: string[]; isCrisis: boolean; suggest: { label: string; path: string }[] } => ({
  isCrisis: false,
  topics: [],
  text:
    'Hola, soy Alivia. 💛 Puedes contarme cómo te sientes o qué te está pasando: te ofrezco orientación emocional, herramientas y recursos, siempre sin juicios. ' +
    'Recuerda que soy un apoyo digital, no un profesional clínico — si estás en crisis, es importante hablar con una persona real.',
  suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_SOS],
});