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
  'lastimarme', 'autolesion', 'cortarme', 'autoneterse', 'quitarme la vida',
  'acabar con todo', 'no quiero seguir', 'no quiero seguir existiendo',
  'desaparecer para siempre', 'hacerme daño', 'hacerme dano', 'ahorcarme',
  'sobredosis', 'tomar pastillas para no despertar', 'no aguanto más', 'no aguanto mas',
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
      'Qué difícil se siente ese cuerpo acelerado, y gracias por contármelo. ¿Qué te está pasando hoy? ¿Algo encendió esta ansiedad o llegó sin avisar? Cuéntame.',
      'Prueba esto ahora: inhala por la nariz contando 4, sostén 4, exhala por la boca contando 6. Repítelo tres veces. Mientras, apoya ambos pies en el suelo y siente el peso de tu cuerpo en la silla.',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_SOS],
  },
  {
    keywords: ['triste', 'tristeza', 'llorar', 'lloro', 'deprimido', 'depresion', 'vacío', 'vacias', 'sin ganas', 'desgana', 'apagado', 'apagada'],
    response: [
      'Gracias por confiar en mí lo que estás sintiendo. ¿Qué te tiene triste hoy? Cuéntame qué pasó o desde cuándo pesa esto: quiero entenderte antes de proponerte algo.',
      'Hoy alcanza con: hidratarte, abrir una ventana o ventana que te dé luz, y escribir dos líneas de lo que sientes en tu diario. Mañana, otra cosa pequeña. La constancia construye el cambio, no la fuerza.',
    ],
    suggest: [SUGGEST_JOURNAL, SUGGEST_PLANS, SUGGEST_RADAR],
  },
  {
    keywords: ['consumir', 'drogas', 'fumar', 'falta un porro', 'adiccion', 'adicto', 'recaida', 'craving', 'hambre', 'tentacion', 'querer fumar'],
    response: [
      'Gracias por ser honestx conmigo y contarlo. ¿Qué te llevó a ese momento de tentación? Cuéntame qué está pasando a tu alrededor hoy.',
      'La urgencia de consumir es una ola: sube rápido, pero también rompe y baja si no la alimentas. Ahora mismo: cambia la temperatura de tu cuerpo (agua fría en muñecas o cara), califica la urgencia del 1 al 10 y ponte a hacer algo neutro. Cada ola que no consumiste es progreso real.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_CONNECT, SUGGEST_SOS],
  },
  {
    keywords: ['solo', 'sola', 'soledad', 'nadie me entiende', 'sin amigos', 'no tengo a nadie', 'abandono', 'invisible'],
    response: [
      'Sentirse solo/a pesa muchísimo, gracias por decírmelo. ¿Qué te está haciendo sentir así en estos días? Cuéntame, quiero escucharte.',
      'Un primer paso pequeño: escribe a una persona de confianza un mensaje breve ("no ando bien, ¿podemos hablar?") o participa en la comunidad con un mensaje anónimo. Conectar se entrena como un músculo.',
    ],
    suggest: [SUGGEST_CONNECT, { label: 'Comunidad global', path: '/community' }, SUGGEST_SOS],
  },
  {
    keywords: ['enojo', 'ira', 'molesto', 'molesta', 'rabia', 'frustrado', 'frustrada', 'odio', 'explota', 'grifando', 'gritar'],
    response: [
      'Tienes derecho a estar enojadx. ¿Qué te sacó de quicio hoy? Cuéntame qué pasó para poder entenderte.',
      'Haz una pausa somática: suelta los hombros, apoya los pies, y espera 90 segundos antes de responder o decidir. El enojo químico baja; después decides desde la calma, no desde el volcán.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_BREATHE, SUGGEST_JOURNAL],
  },
  {
    keywords: ['sueño', 'dormir', 'insomnio', 'no duermo', 'despertar', 'pesadillas', 'cansado', 'cansada', 'agotado', 'agotada'],
    response: [
      'No descansar desgasta el ánimo entero, y gracias por decírmelo. ¿Qué te tiene despierta/o? ¿Piensas en algo que no te suelta o el cuerpo no se aquieta?',
      'Esta noche prueba: pantallas fuera 45 min antes, una ducha tibia, y una respiración 4-7-8 (inhala 4, sostén 7, exhala 8) repetida. La regularidad se construye por pequeños consistentes.',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_PLANS, SUGGEST_RADAR],
  },
  {
    keywords: ['familia', 'padres', 'mama', 'papa', 'discusion', 'peleo', 'gritan', 'casa', 'hogar', 'insultos', 'peles'],
    response: [
      'Los conflictos en casa golpean en un lugar muy hondo. ¿Qué pasó hoy? Cuéntame, estoy aquí para escucharte sin juzgarte.',
      'Puedes retirarte sin explicarte: audífonos, otra habitación, una caminata corta. Nombra en tu mente: "su caos no es mi culpa". Y cuando duela mucho, no lo cargues a solas: habla con alguien de confianza o con nosotros en la comunidad.',
    ],
    suggest: [SUGGEST_COPING, SUGGEST_CONNECT, SUGGEST_SOS],
  },
  {
    keywords: ['presion', 'examen', 'estres', 'tareas', 'estudio', 'universidad', 'secola', 'sobrecarga', 'no doy abasto', 'rendirme'],
    response: [
      'Ese nivel de exigencia agota de verdad. ¿Qué tarea o situación te está presionando más ahora mismo? Cuéntame.',
      'Elige UNA sola tarea al 50% de perfección, pon 10 minutos en el reloj y hazla. Después descansa 5. Divide, no multipliques: cada bloque completado es una victoria que se registra.',
    ],
    suggest: [{ label: 'Plan de 10 min', path: '/coping' }, SUGGEST_PLANS, SUGGEST_BREATHE],
  },
  {
    keywords: ['relacion', 'novio', 'novia', 'terminar', 'ex', 'pareja', 'amor', 'corazon roto', 'engano', 'infidelidad', 'me dejaron'],
    response: [
      'El duelo por una relación se siente en el cuerpo, y gracias por contármelo. ¿Qué pasó? ¿Quieres decirme cómo te dejó sintiéndote?',
      'Un día a la vez: llora lo que necesites, habla con una persona que no te juzgue, y usa el radar para observar cómo cambia tu ánimo con el tiempo. El dolor agudo no es para siempre.',
    ],
    suggest: [SUGGEST_JOURNAL, SUGGEST_CONNECT, SUGGEST_RADAR],
  },
  {
    keywords: ['gracias', 'graciass'],
    response: ['Estoy aquí para eso. Cuidarte es un acto de valentía, y ya lo estás haciendo. Si vuelve a sentirse pesado, este espacio sigue aquí. '],
    suggest: [],
  },
  {
    keywords: ['feo', 'fea', 'no me gusto', 'odio mi cuerpo', 'no valgo', 'inutil', 'estupido', 'estupida', 'fracaso', 'no sirvo para nada', 'avergonzado', 'avergonzada'],
    response: [
      'Esa voz que te dice que no vales miente con volumen. ¿De dónde viene hoy? ¿Algo la disparó o lleva días ahí sonando? Cuéntame.',
      'Hoy haz esto: escribe UNA cosa que lograste esta semana, por pequeña que sea, y léela en voz alta. Repite la que quieras dejar de creer: eso la desactiva poco a poco.',
    ],
    suggest: [SUGGEST_JOURNAL, SUGGEST_RADAR, SUGGEST_PLANS],
  },
  {
    keywords: ['miedo', 'miedo de', 'asustado', 'asustada', 'terror', 'panico', 'panico', 'fobia', 'paralizado', 'paralizada'],
    response: [
      'El miedo se siente enorme cuando está encendido. ¿A qué le tienes miedo ahora mismo? Cuéntame con tus palabras, sin apuro.',
      'Para este momento: nombra el miedo en voz baja ("tengo miedo de…"), pon una mano en el pecho y respira largo. El miedo baja cuando lo observas, no cuando lo pelea.',
    ],
    suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_JOURNAL],
  },
  {
    keywords: ['hola', 'hey', 'buenas', 'que tal', 'holi'],
    response: [
      'Hola, soy VIA.  ¿Qué traes hoy? Puedes contarme cómo te sientes o pedirme una herramienta para este momento.',
      '¡Hola! Soy VIA, tu acompañamiento emocional. Cuéntame cómo va tu día o qué necesitas en este momento.',
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

const CONTINUE_TOPIC_REPLY = (topic: string) =>
  `Sigo aquí contigo. Me cuentas de "${topic}" y quiero seguir escuchándote: ¿qué ha cambiado desde que hablamos? Respira profundo: acompañarte no es apresurarte.`;

const LAST_TOPIC = (lastTopic: string): string | null => {
  const topic = getTopicByText(lastTopic);
  if (!topic) return null;
  if (FALLBACK_ROUTES.some(k => lastTopic.includes(k))) return null;
  return topic;
};

const FALLBACK_ROUTES = ['no se', 'no sé', 'no lo se', 'no lo sé', 'no quiero hablar', 'nada', 'no se que'];

export const getAiReply = (message: string, lastTopic?: string): { text: string; topics: string[]; isCrisis: boolean; suggest: { label: string; path: string }[] } => {
  const lower = message.toLowerCase();
  const text = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  const isCrisis = CRISIS_KEYWORDS.some(k => text.includes(k));
  if (isCrisis) {
    return {
      isCrisis: true,
      topics: ['crisis'],
      text:
        'Lo que me estás compartiendo es muy serio, y quiero que lo tomes como lo es: una señal de que necesitas apoyo humano real HOY, no solo herramientas digitales. ' +
        'No tienes que cargar esto a solas. Ahora mismo puedes: llamar a una línea de crisis gratuita, hablar con una persona de confianza o ir a emergencias si hay peligro inmediato.',
      suggest: [SUGGEST_SOS, SUGGEST_CONNECT],
    };
  }

  const navIntent = getNavigationIntent(message);
  if (navIntent) {
    return {
      isCrisis: false,
      topics: [navIntent.label],
      text: getNavReply(navIntent),
      suggest: [],
    };
  }

  for (const rule of RULES) {
    const matched = rule.keywords.find(k => text.includes(k));
    if (matched) {
      const alreadyDiscussed = lastTopic ? lastTopic.toLowerCase().includes(matched) : false;
      const askWhyFirst = !alreadyDiscussed && rule.response.length > 1;
      const response = askWhyFirst
        ? rule.response[0]
        : rule.response[Math.floor(Math.random() * rule.response.length)];
      return {
        isCrisis: false,
        topics: [matched],
        text: response,
        suggest: rule.suggest ?? [],
      };
    }
  }

  const detectedTopic = getTopicByText(text);
  const last = lastTopic ? LAST_TOPIC(lastTopic) : null;

  return {
    isCrisis: false,
    topics: detectedTopic ? [detectedTopic] : [],
    text: detectedTopic
      ? WITH_TOPIC_REPLY(detectedTopic)
      : last
        ? CONTINUE_TOPIC_REPLY(last)
        : FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
    suggest: detectedTopic ? [SUGGEST_JOURNAL, SUGGEST_RADAR] : last ? [SUGGEST_JOURNAL, SUGGEST_RADAR] : [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_JOURNAL],
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

export const detectCrisis = (message: string): boolean => {
  const lower = message.toLowerCase();
  const text = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return CRISIS_KEYWORDS.some(k => text.includes(k));
};

export const getIntentSuggest = (message: string): { label: string; path: string }[] | null => {
  const lower = message.toLowerCase();
  const text = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  if (detectCrisis(message)) return [SUGGEST_SOS, SUGGEST_CONNECT];
  for (const rule of RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.suggest ?? null;
  }
  return null;
};

export interface NavIntent {
  path: string;
  label: string;
}

const INTENT_VERBS = [
  'quiero hacer', 'quiero usar', 'quiero ir', 'quiero abrir', 'quiero empezar', 'quiero probar',
  'hagamos', 'vamos a', 'vamos al', 'vamos a la', 'vamos a las', 'llévame', 'llevame', 'abre',
  'abrir', 'pásame', 'pasame', 'empecemos', 'inicia', 'ponme', 'quiero hacer el',
  'quiero hacer un', 'quiero hacer una', 'quiero', 'necesito hacer', 'necesito',
];

const FEATURE_INTENTS: Array<{ path: string; label: string; keywords: string[] }> = [
  { path: '/assessment', label: 'chequeo de bienestar', keywords: ['chequeo', 'chequearme', 'evaluacion', 'evaluación', 'evaluarme', 'test', 'test de', 'diagnostico', 'diagnóstico', 'medir mi estado', 'saber como estoy', 'saber cómo estoy'] },
  { path: '/breathe', label: 'ejercicio de respiración', keywords: ['respirar', 'respiracion', 'respiración', 'respiremos', 'respirando', 'ejercicio de respiracion', 'calmar la ansiedad'] },
  { path: '/journal', label: 'diario de desahogo', keywords: ['diario', 'desahogo', 'desahogarme', 'escribir lo que siento', 'escribir como me siento', 'soltar', 'desahogar', 'soltar todo'] },
  { path: '/coping', label: 'actividades de apoyo', keywords: ['actividad', 'actividades', 'coping', 'distraerme', 'distraer', 'algo que hacer', 'plan de 10', 'apoyo'] },
  { path: '/radar', label: 'radar de bienestar', keywords: ['radar', 'ver mi animo', 'ver mi ánimo', 'estado de animo', 'estado de ánimo', 'registrar mi animo'] },
  { path: '/plans', label: 'plan de progreso', keywords: ['plan', 'planes', 'metas', 'progreso', 'seguimiento'] },
  { path: '/connect', label: 'conexión con alguien', keywords: ['conectar', 'conectarme', 'hablar con alguien', 'alguien de confianza', 'escuchar'] },
  { path: '/community', label: 'comunidad', keywords: ['comunidad', 'foro', 'gente como yo', 'mensaje anonimo', 'mensaje anónimo'] },
  { path: '/games', label: 'juegos de relajación', keywords: ['juego', 'juegos', 'jugar', 'mini juego'] },
  { path: '/sos', label: 'líneas de ayuda', keywords: ['sos', 'linea de ayuda', 'lineas de ayuda', 'línea de ayuda', 'líneas de ayuda', 'ayuda urgente', 'emergencia'] },
];

export const getNavigationIntent = (message: string): NavIntent | null => {
  if (detectCrisis(message)) return null;
  const lower = message.toLowerCase();
  const text = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const wantsAction = INTENT_VERBS.some(v => text.includes(v));
  if (!wantsAction) return null;
  for (const f of FEATURE_INTENTS) {
    if (f.keywords.some(k => text.includes(k))) {
      return { path: f.path, label: f.label };
    }
  }
  return null;
};

export const getNavReply = (nav: NavIntent): string =>
  `¡Claro que sí! Te llevo al ${nav.label} ahora mismo. Mientras llegamos, respira lento: este paso que estás dando es un acto de autocuidado.`;

export const getAiIntro = (): { text: string; topics: string[]; isCrisis: boolean; suggest: { label: string; path: string }[] } => ({
  isCrisis: false,
  topics: [],
  text:
    'Hola, soy VIA.  Cuéntame cómo te sientes y te acompaño con pasos pequeños y sin juicios. Si estás en crisis, hablar con una persona real es importante.',
  suggest: [SUGGEST_BREATHE, SUGGEST_COPING, SUGGEST_SOS],
});