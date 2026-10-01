/* ----------------------------------------------------
   ALIVIA - DETECCION DE SENALES DE CRISIS
   Clasificador por reglas que decide el nivel de acompanamiento
   que necesita una persona. Sesgo deliberado hacia el falso
   positivo: en una app de bienestar es mucho mas grave
   sobrar por un falso positivo que ignorar una senal, y ademas el
   modo crisis se puede cerrar desde la conversacion.
   ---------------------------------------------------- */

export type CrisisLevel = 0 | 1 | 2 | 3;

export interface CrisisSignal {
  /** Identificador estable, util para tests y telemetria. */
  id: string;
  /** Nivel que aporta esta senal por si sola. */
  level: CrisisLevel;
  /** Descripcion en espanol para inyectar en el prompt del modelo. */
  label: string;
}

export interface CrisisAssessment {
  /** Nivel maximo detectado. 0 = sin senales de crisis. */
  level: CrisisLevel;
  /** level >= 1: activar modo crisis. */
  isCrisis: boolean;
  /** level >= 2: hay ideacion explicita, metodo o plan. */
  urgent: boolean;
  /** Senales detectadas, de la mas grave a la menos. */
  evidence: CrisisSignal[];
  /** La persona dijo explicitamente que ya esta a salvo. */
  safeToExit: boolean;
  /** Texto normalizado, util para depurar casos. */
  normalized: string;
}

const LEVEL_BY_ID: Record<string, CrisisLevel> = {
  metodo: 3,
  inmediato: 3,
  'autolesion-activa': 3,
  'ideacion-suicida': 2,
  carga: 2,
  'sin-salida': 2,
  'no-aguanto': 2,
  'pensamientos-oscuros': 1,
  'deseo-muerte': 1,
  'pide-ayuda': 1,
};

const RANK_BY_ID: Record<string, number> = {
  metodo: 10,
  inmediato: 9,
  'autolesion-activa': 9,
  'ideacion-suicida': 8,
  carga: 7,
  'sin-salida': 6,
  'no-aguanto': 5,
  'pensamientos-oscuros': 4,
  'pide-ayuda': 3,
  'deseo-muerte': 3,
};

const LABEL_BY_ID: Record<string, string> = {
  metodo: 'menciona un metodo concreto para hacerse dano o quitarse la vida',
  inmediato: 'describe una intencion inmediata o un plan ya decidido',
  'autolesion-activa': 'dice que se esta haciendo dano ahora mismo',
  'ideacion-suicida': 'dice de forma explicita que quiere morir o quitarse la vida',
  carga: 'se percibe como una carga para los demas',
  'sin-salida': 'no ve salida ni solucion a su situacion',
  'no-aguanto': 'expresa un desbordamiento emocional grave',
  'pensamientos-oscuros': 'comparte pensamientos oscuros recurrentes',
  'deseo-muerte': 'ha deseado morir o desaparecer',
  'pide-ayuda': 'pide ayuda urgente o dice que no puede mas',
};

/**
 * Normaliza para comparar: minusculas, sin tildes, sin puntuacion.
 * Los patrones se escriben sin tildes porque el texto ya llega sin ellas.
 */
export const normalize = (input: string): string =>
  (input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Sin espacios: detecta texto con las letras separadas ("q u e r o  m o r i r"). */
const compact = (s: string): string => s.replace(/\s+/g, '');

interface Rule {
  id: string;
  /** Se evalua contra el texto normalizado, con espacios. */
  re: RegExp;
  /** Variante sin espacios ni limites de palabra, para texto con letras separadas. */
  reCompact?: RegExp;
  /**
   * Si coincide, la senal se cancela. Contexto acumulado (mensaje + historial)
   * para no repetir senuelos: "no quiero seguir con la novela" no es ideation.
   */
  unless?: RegExp;
}

const RULES: Rule[] = [
  // --- Nivel 3: metodo concreto o intencion inmediata ---
  {
    id: 'metodo',
    re: /\b(ahorc\w+|colgarme|encuel\w+|asfixi\w+|cortarme las venas|me corte las venas|romperme las venas|sobredosis|sobredosificar|arma en la mano|tengo el arma|con el arma|tengo las pastillas|tome las pastillas|me tome las pastillas|tragarme las pastillas|pastillas para no despertar|saltarme de (un|el|la)|tirarme al (agua|carro|tren|metro|puente|abismo)|tirarme del (techo|puente|quinto|edificio))\b/,
  },
  {
    id: 'inmediato',
    re: /\b(ya lo (hice|ice)|ya me (lo|hice)|me muero (hoy|ahora|esta noche|manana)|me voy a morir (hoy|ahora)|no llego a manana|esta es la ultima (vez|noche)|para despedirme|para despedir\w+|me quedo con el (movil|celular|telefono) en la mano)\b/,
  },
  {
    id: 'autolesion-activa',
    re: /\b(me (estoy )?cortando|me cort\w+|me (estoy )?lastim\w+ (ahora|ya)|me rasco (hasta|los brazos)|me quemo (a proposito|deliberadamente)|me hago dano (ahora|ya))\b/,
  },

  // --- Nivel 2: ideacion suicida o autolesion explicita ---
  {
    id: 'ideacion-suicida',
    re: /\b(quiero morir|queria morir|quiero morirme|no quiero vivir|no quiero seguir viv\w+|no quiero existir|no quiero estar viv\w+|acabar con mi vida|acabar con todo|terminar con mi vida|quitarme la vida|sacarme de aqui|sacarme de esta vida|desaparecer para siempre|morirme (ya|ahora|hoy|esta noche)|matarme|suicidarme|suicid\w+|me quiero morir|me quiero matar|hacerme dano|hacerme dano|lastimarme)\b/,
    reCompact: /(quiero)?morir(e)?|sacarmedeaqui|desaparecerparasiempre|quitarmelavida|suicidarm(e)?|matarm(e)?/,
    unless: /\bno quiero (seguir (con|estudi|trabaj)|morir (de|por))\b/,
  },
  {
    id: 'carga',
    re: /\b(mejor si (no estuviera|no existiera|me muriera|falleciera|no naciera)|(mis|los) (padres|familia) (estan|estaran) mejor sin mi|desearia no haber nacido|no deberia haber nacido|soy un (estorbo|peso|inutil|invisible)|soy una carga|mi familia (estara|esta) mejor sin mi|me custa (mucho|demasiado) seguir aqui)\b/,
  },
  {
    id: 'sin-salida',
    re: /\b(no veo (salida|solucion)|no hay (salida|solucion|nada que (haga|ayude))|nada (va a|me va a) (cambiar|ayudar|mejorar)|se acabo para mi|todo es inutil|prefiero no estar|nadie (me (queria|notara) si no (estuviera|fuera))|que no estuviera aqui)\b/,
  },
  {
    id: 'no-aguanto',
    re: /\bno aguanto mas\b/,
    reCompact: /noaguantomas/,
    unless: /\bno aguanto mas a\b/,
  },

  // --- Nivel 1: senales tempranas ---
  {
    id: 'pensamientos-oscuros',
    re: /\b(pienso en (morirme|suicidarme|matarme|hacerme dano)|se me ocurre (matarme|suicidarme|quitarme la vida)|a veces pienso que (estoy de mas|sobra en)|me quiero morir casi todos los dias|pienso en hacerme dano)\b/,
  },
  {
    id: 'deseo-muerte',
    re: /\b(queria morirme|quisiera morirme|ojala no existiera|ojala no hubiera nacido|deseo morir|desea morir|prefiero estar muerto|estoy muerto|se me va la vida|se me van las ganas|no le veo el sentido a nada)\b/,
    reCompact: /(quisiera)?morirme|ojalanoexistiera/,
    unless: /\bmuerto de (hambre|riesa|cansancio|verguenza|rabia)\b/,
  },
  {
    id: 'pide-ayuda',
    re: /\b(no puedo mas|no puedo con esto|ayudame por favor|necesito ayuda ya|ayuda urgente|por favor ayudame|ayudame porfa|quisiera morir|me rindo)\b/,
  },
];

/** Frases con las que la persona confirma que ya no esta en peligro. */
const SAFE_EXIT: RegExp[] = [
  /\b(ya estoy (bien|sano|sana|tranquil\w+|a salvo)|estoy (bien|tranquil\w+|a salvo) (ahora|de nuevo|ya)|ya no (quiero|me quiero|pienso en|pienso en) (morir|morirme|suicidarme|matarme|quitarme la vida|hacerme dano)|ya no me hago dano|ya no tengo ganas de morir|sali de la crisis|ya sali de la crisis|estoy a salvo|lo supere|ya lo supere|estoy mejor)\b/,
  /\bno (quiero|pensaba|pienso) (morir|morirme|suicidarme|matarme)\b/,
];

/** Frases cortas que solo tienen sentido si el historial aporta el contexto. */
const IMPLIED: RegExp = /\b(si lo hago|si me lo hago|lo voy a hacer|hoy lo hago|ya lo decidi|lo decidi|si muero|si no despierto|cuando muera|manana no voy a estar)\b/;

const hit = (re: RegExp, text: string): boolean => re.test(text);

/**
 * True cuando el texto viene deliberadamente partido para evadir la deteccion:
 * una sola palabra pegada ("quieromorirme") o letras sueltas ("q u i e r o").
 * Los patrones sin espacios solo se aplican en ese caso; si no, cualquier frase
 * normal que contenga "morir" (un chiste, una clase de biologia)eria un falso
 * positivo de nivel 2.
 */
const looksObfuscated = (normalized: string): boolean => {
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return tokens[0].length >= 8;
  const singles = tokens.filter(t => t.length === 1).length;
  return tokens.length >= 6 && singles / tokens.length >= 0.6;
};

const EMPTY: CrisisAssessment = {
  level: 0,
  isCrisis: false,
  urgent: false,
  evidence: [],
  safeToExit: false,
  normalized: '',
};

/**
 * Evalua un mensaje y devuelve el nivel de crisis con la evidencia detectada.
 * `history` son los mensajes previos de la conversacion: permite que una frase
 * breve herede el contexto, de modo que "si lo hago" en un hilo donde ya se
 * hablo de un metodo sigue siendo nivel 3.
 */
export const assessCrisis = (input: string, history: string[] = []): CrisisAssessment => {
  const normalized = normalize(input);
  if (!normalized) return { ...EMPTY };

  const tight = compact(normalized);
  const obfuscated = looksObfuscated(normalized);
  const prev = history.map(normalize).filter(Boolean);
  const context = [normalized, ...prev].join(' . ');
  const contextTight = [tight, ...prev.map(compact)].join('');

  const matched = new Set<string>();

  for (const rule of RULES) {
    let found = hit(rule.re, normalized);
    if (!found && obfuscated && rule.reCompact) found = hit(rule.reCompact, tight);
    if (found && rule.unless && hit(rule.unless, context)) found = false;
    if (found) matched.add(rule.id);
  }

  if (matched.size === 0 && prev.length > 0 && hit(IMPLIED, normalized)) {
    for (const rule of RULES) {
      if ((LEVEL_BY_ID[rule.id] ?? 0) < 2) continue;
      if (hit(rule.re, context) || (obfuscated && rule.reCompact && hit(rule.reCompact, contextTight))) {
        matched.add(rule.id);
      }
    }
  }

  const saidSafe = SAFE_EXIT.some(re => hit(re, normalized));

  if (matched.size === 0) {
    return { ...EMPTY, normalized, safeToExit: saidSafe };
  }

  const ids = [...matched].sort((a, b) => (RANK_BY_ID[b] ?? 0) - (RANK_BY_ID[a] ?? 0));
  let level: CrisisLevel = 0;
  for (const id of ids) level = Math.max(level, LEVEL_BY_ID[id] ?? 1) as CrisisLevel;

  return {
    level,
    isCrisis: true,
    urgent: level >= 2,
    evidence: ids.map(id => ({ id, level: LEVEL_BY_ID[id] ?? 1, label: LABEL_BY_ID[id] ?? id })),
    safeToExit: saidSafe && level < 3,
    normalized,
  };
};

export const detectCrisisSignals = (input: string, history: string[] = []): CrisisSignal[] =>
  assessCrisis(input, history).evidence;

export const hasUrgentCrisis = (input: string, history: string[] = []): boolean =>
  assessCrisis(input, history).urgent;

export const isCrisisSafeExit = (input: string, history: string[] = []): boolean =>
  assessCrisis(input, history).safeToExit;

/** Resumen en espanol de lo detectado, para inyectar en el prompt del modelo. */
export const describeCrisis = (assessment: CrisisAssessment): string =>
  assessment.evidence.map(e => e.label).join('; ');
