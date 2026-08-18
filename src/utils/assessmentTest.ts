/* ----------------------------------------------------
   ALIVIA - CONTENIDO DEL CHEQUEO DE BIENESTAR
   Preguntas de autoobservación (estrés, ansiedad, depresión)
   + recomendaciones de planes y herramientas según resultado.
   No es un diagnóstico clínico: es orientación.
   ---------------------------------------------------- */

export type DimensionKey = 'stress' | 'anxiety' | 'depression';

export interface TestQuestion {
  dimension: DimensionKey;
  text: string;
}

export const ANSWER_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'A veces' },
  { value: 2, label: 'A menudo' },
  { value: 3, label: 'Casi siempre' },
] as const;

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stress: 'Estrés',
  anxiety: 'Ansiedad',
  depression: 'Depresión',
};

export const TEST_QUESTIONS: TestQuestion[] = [
  { dimension: 'stress', text: 'He sentido tensión o molestias físicas (cabeza, estómago, hombros) por la presión' },
  { dimension: 'stress', text: 'Me ha costado relajarme o soltar la tensión del cuerpo' },
  { dimension: 'stress', text: 'Me he sentido desbordado(a) por las tareas y responsabilidades' },
  { dimension: 'stress', text: 'Me ha costado concentrarme por la cantidad de pendientes' },
  { dimension: 'stress', text: 'He sentido la cabeza "a mil" por el ritmo de mis días' },

  { dimension: 'anxiety', text: 'He sentido nervios o inquietud sin una razón clara' },
  { dimension: 'anxiety', text: 'Me ha costado controlar las preocupaciones' },
  { dimension: 'anxiety', text: 'He sentido el corazón acelerado, sudoración o sensación de ahogo' },
  { dimension: 'anxiety', text: 'He evitado situaciones que me generan miedo o incomodidad' },
  { dimension: 'anxiety', text: 'He tenido dificultad para dormir por darle vueltas a las cosas' },

  { dimension: 'depression', text: 'Me he sentido triste, vacío(a) o sin ganas de nada' },
  { dimension: 'depression', text: 'He perdido interés en cosas que antes me gustaban' },
  { dimension: 'depression', text: 'Me ha costado tener energía para lo básico del día' },
  { dimension: 'depression', text: 'Me he sentido desesperanzado(a) con respecto al futuro' },
  { dimension: 'depression', text: 'Me he sentido solo(a) o desconectado(a) de los demás' },
];

export type LevelKey = 'baja' | 'moderada' | 'alta';

const REC_COPING = {
  label: 'Actividades de apoyo',
  path: '/coping',
  tool: 'Actividades de apoyo',
};

const REC_BREATHE = {
  label: 'Respiración guiada',
  path: '/breathe',
  tool: 'Respiración guiada',
};

const REC_JOURNAL = {
  label: 'Escribir en el desahogo',
  path: '/journal',
  tool: 'Desahogo (Burn Journal)',
};

const REC_PLANS = {
  label: 'Mis planes de progreso',
  path: '/plans',
  tool: 'Planes de progreso',
};

export interface PlanRecommendation {
  area: string;
  reason: string;
  idea: string;
}

interface RecommendationSpec {
  level: LevelKey;
  dimension: DimensionKey;
  message: string;
  tools: { label: string; path: string }[];
  plans: PlanRecommendation[];
}

const SPECS: RecommendationSpec[] = [
  {
    level: 'baja',
    dimension: 'stress',
    message: 'Tu nivel de estrés es manejable. Mantén tus rutinas de descanso y sigue con tus planes: la constancia es lo que sostiene el equilibrio.',
    tools: [REC_BREATHE, REC_PLANS],
    plans: [],
  },
  {
    level: 'moderada',
    dimension: 'stress',
    message: 'Estás cargando presión de más. Divide tus pendientes en bloques de 10 minutos y usa respiración guiada para bajar la tensión del cuerpo.',
    tools: [REC_BREATHE, REC_COPING, REC_PLANS],
    plans: [
      { area: 'ansiedad', reason: 'El estrés sostenido dispara la ansiedad', idea: 'Trabajar mi estrés con pasos pequeños y respiración diaria' },
    ],
  },
  {
    level: 'alta',
    dimension: 'stress',
    message: 'Tu cuerpo está en alerta constante: es importante bajar la carga HOY, no "cuando termine todo". Prioriza descanso real y pide apoyo para repartir responsabilidades.',
    tools: [REC_BREATHE, REC_COPING, REC_PLANS],
    plans: [
      { area: 'ansiedad', reason: 'Tu estrés está en nivel elevado', idea: 'Plan de 10 minutos diarios y una sola tarea por bloque' },
    ],
  },

  {
    level: 'baja',
    dimension: 'anxiety',
    message: 'Tu ansiedad está en un rango tranquilo. Mantén hábitos que ya te funcionan y observa cómo cambia tu ánimo en el radar.',
    tools: [REC_BREATHE, REC_JOURNAL],
    plans: [],
  },
  {
    level: 'moderada',
    dimension: 'anxiety',
    message: 'Hay ansiedad presente: tu alarma está con el volumen alto. Respira 4-7-8 al menos tres veces al día y escribe lo que te ronda para observarlo, no para alimentarlo.',
    tools: [REC_BREATHE, REC_JOURNAL, REC_COPING],
    plans: [
      { area: 'ansiedad', reason: 'Tu ansiedad está en nivel moderado', idea: 'Identificar disparadores y hacer 5 minutos de respiración diaria' },
    ],
  },
  {
    level: 'alta',
    dimension: 'anxiety',
    message: 'La ansiedad está en un nivel elevado: cuerpo en alerta casi constante. Además de las herramientas, hoy es un buen momento para hablar con alguien real o con una línea de crisis gratuita. No la cargues a solas.',
    tools: [REC_BREATHE, REC_COPING, REC_JOURNAL],
    plans: [
      { area: 'ansiedad', reason: 'Tu ansiedad está en nivel elevado', idea: 'Manejarme mejor con la ansiedad (respiración y anclaje 5-4-3-2-1)' },
    ],
  },

  {
    level: 'baja',
    dimension: 'depression',
    message: 'Tu ánimo tiene espacio: sigue con tus rutinas, sol y movimiento. Son el mejor seguro contra los días grises.',
    tools: [REC_JOURNAL, REC_PLANS],
    plans: [],
  },
  {
    level: 'moderada',
    dimension: 'depression',
    message: 'La tristeza o el desánimo están presentes. Los días difíciles se atenúan con pasos diminutos: sol en la mañana, una actividad física corta y anotar 3 logros pequeños al día.',
    tools: [REC_JOURNAL, REC_COPING, REC_PLANS],
    plans: [
      { area: 'depresion', reason: 'Tu ánimo está bajo', idea: 'Plan de pasos pequeños: sol, bitácora de logros y movimiento' },
    ],
  },
  {
    level: 'alta',
    dimension: 'depression',
    message: 'El desánimo está en un nivel alto. Además de usar las herramientas, hoy es importante que lo cuentes a una persona de confianza o a una línea de crisis: el apoyo humano acelera la salida del hoyo.',
    tools: [REC_JOURNAL, REC_PLANS, REC_COPING],
    plans: [
      { area: 'depresion', reason: 'Tu ánimo está en nivel elevado', idea: 'Avisar a alguien de confianza y planificar cuidados pequeños' },
    ],
  },
];

export const buildRecommendations = (scores: Record<DimensionKey, number>): string[] => {
  const results: string[] = [];
  (Object.keys(scores) as DimensionKey[]).forEach((dim) => {
    const level = scores[dim] <= 4 ? 'baja' : scores[dim] <= 9 ? 'moderada' : 'alta';
    const spec = SPECS.find((s) => s.dimension === dim && s.level === level);
    if (!spec) return;
    results.push(`${DIMENSION_LABELS[dim]} (${level}): ${spec.message}`);
    spec.plans.forEach((p) => results.push(`Plan sugerido · ${p.area}: ${p.idea}`));
  });
  return results.slice(0, 12);
};

const toolLinksFor = (scores: Record<DimensionKey, number>): { label: string; path: string; area?: string }[] => {
  const links: { label: string; path: string; area?: string }[] = [];
  (Object.keys(scores) as DimensionKey[]).forEach((dim) => {
    const level = scores[dim] <= 4 ? 'baja' : scores[dim] <= 9 ? 'moderada' : 'alta';
    const spec = SPECS.find((s) => s.dimension === dim && s.level === level);
    if (!spec) return;
    spec.tools.forEach((t) => {
      if (!links.some((l) => l.path === t.path)) links.push(t);
    });
    spec.plans.forEach((p) => {
      if (!links.some((l) => l.path === '/plans' && l.area === p.area)) {
        links.push({ label: `Plan: ${p.area}`, path: '/plans', area: p.area });
      }
    });
  });
  return links;
};

export const planAreasFor = (scores: Record<DimensionKey, number>): string[] => {
  const areas = new Set<string>();
  (Object.keys(scores) as DimensionKey[]).forEach((dim) => {
    const level = scores[dim] <= 4 ? 'baja' : scores[dim] <= 9 ? 'moderada' : 'alta';
    const spec = SPECS.find((s) => s.dimension === dim && s.level === level);
    spec?.plans.forEach((p) => areas.add(p.area));
  });
  return [...areas];
};

export const composeAiPrompt = (scores: Record<DimensionKey, number>): string => {
  const parts = (Object.keys(scores) as DimensionKey[])
    .map((dim) => `${DIMENSION_LABELS[dim].toLowerCase()} ${scores[dim] <= 4 ? 'baja' : scores[dim] <= 9 ? 'moderada' : 'alta'} (${scores[dim]}/15)`)
    .join(', ');
  return `Acabo de hacer mi chequeo de bienestar en Alivia y me salió: ${parts}. Dame un mensaje breve de orientación para este momento.`;
};

export { toolLinksFor };