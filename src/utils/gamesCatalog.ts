export interface GameMeta {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  gradient: string;
  accent: string;
  minutes: string;
  forWhom: string[];
}

export const GAMES: GameMeta[] = [
  {
    id: 'burbujas',
    emoji: '◯',
    title: 'Burbujas Calma',
    desc: 'Revienta burbujas durante 30 segundos: tu atención se ancla en el presente y la ansiedad baja sola.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.12) 0%, rgba(var(--accent-sage-rgb), 0.06) 100%)',
    accent: 'var(--accent-lavender)',
    minutes: '30 seg',
    forWhom: ['Ansiedad', 'Estrés'],
  },
  {
    id: 'memoria',
    emoji: '❂',
    title: 'Memoria de Emociones',
    desc: 'Encuentra los pares de símbolos. Concentrarte con suavidad le da descanso a los pensamientos repetitivos.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.12) 0%, rgba(var(--accent-gold-rgb), 0.06) 100%)',
    accent: 'var(--accent-sage)',
    minutes: '3-4 min',
    forWhom: ['Enojo', 'Estrés'],
  },
  {
    id: 'grounding',
    emoji: '✵',
    title: 'Ancla 5-4-3-2-1',
    desc: 'Técnica guiada de enraizamiento para ataques de ansiedad o pánico: ver, tocar, oír, oler y saborear.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-warm-rgb), 0.12) 0%, rgba(var(--accent-rose-rgb), 0.06) 100%)',
    accent: 'var(--accent-warm)',
    minutes: '2 min',
    forWhom: ['Pánico', 'Ansiedad'],
  },
{
    id: 'secuencia',
    emoji: '✵',
    title: 'Secuencia VIA',
    desc: 'Observa, memoriza y repite secuencias de colores. Entrena tu atención cuando la mente da vueltas.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.12) 0%, rgba(var(--accent-lavender-rgb), 0.06) 100%)',
    accent: 'var(--accent-rose)',
    minutes: '2-4 min',
    forWhom: ['Tristeza', 'Soledad'],
  },
  {
    id: 'marea',
    emoji: '🌊',
    title: 'Marea Respira',
    desc: 'Respiración guiada 4-7-8. La exhalación larga baja el pulso y el sistema de alerta: útil en picos de ansiedad.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.16) 0%, rgba(var(--accent-sage-rgb), 0.08) 100%)',
    accent: 'var(--accent-lavender)',
    minutes: '2 min',
    forWhom: ['Ansiedad', 'Pánico'],
  },
  {
    id: 'cuadricula',
    emoji: '🌿',
    title: 'Cuadrícula de Anclaje',
    desc: 'Mira, toca, escucha y respira siguiendo una cuadrícula de 16 casillas. Corta la rumiación durante un minuto.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.16) 0%, rgba(var(--accent-warm-rgb), 0.08) 100%)',
    accent: 'var(--accent-sage)',
    minutes: '1-2 min',
    forWhom: ['Ansiedad', 'Estrés'],
  },
  {
    id: 'piloto',
    emoji: '🛫',
    title: 'Piloto de Pensamientos',
    desc: 'Anota el pensamiento y suéltalo. No tienes que resolverlo ahora: solo dejar de cargarlo en solitario.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.12) 0%, rgba(var(--accent-gold-rgb), 0.06) 100%)',
    accent: 'var(--accent-rose)',
    minutes: '2 min',
    forWhom: ['Rumiación', 'Ansiedad'],
  },
  {
    id: 'semilla',
    emoji: '🌱',
    title: 'Semilla que Crece',
    desc: 'Riega semillas y míralas crecer. Un acto pequeño de cuidarte sin que nadie tenga que verlo.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-warm-rgb), 0.16) 0%, rgba(var(--accent-sage-rgb), 0.08) 100%)',
    accent: 'var(--accent-warm)',
    minutes: '1 min',
    forWhom: ['Tristeza', 'Agotamiento'],
  },
];

export const getGame = (id: string): GameMeta | undefined => GAMES.find(g => g.id === id);