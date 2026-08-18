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
    emoji: '✦',
    title: 'Burbujas Calma',
    desc: 'Revienta burbujas durante 30 segundos: tu atención se ancla en el presente y la ansiedad baja sola.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.12) 0%, rgba(var(--accent-sage-rgb), 0.06) 100%)',
    accent: 'var(--accent-lavender)',
    minutes: '30 seg',
    forWhom: ['Ansiedad', 'Estrés'],
  },
  {
    id: 'memoria',
    emoji: '✦',
    title: 'Memoria de Emociones',
    desc: 'Encuentra los pares de emojis. Concentrarte con suavidad le da descanso a los pensamientos repetitivos.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.12) 0%, rgba(var(--accent-gold-rgb), 0.06) 100%)',
    accent: 'var(--accent-sage)',
    minutes: '3-4 min',
    forWhom: ['Enojo', 'Estrés'],
  },
  {
    id: 'grounding',
    emoji: '✦',
    title: 'Ancla 5-4-3-2-1',
    desc: 'Técnica guiada de enraizamiento para ataques de ansiedad o pánico: ver, tocar, oír, oler y saborear.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-warm-rgb), 0.12) 0%, rgba(var(--accent-rose-rgb), 0.06) 100%)',
    accent: 'var(--accent-warm)',
    minutes: '2 min',
    forWhom: ['Pánico', 'Ansiedad'],
  },
  {
    id: 'secuencia',
    emoji: '⌖',
    title: 'Secuencia VIA',
    desc: 'Observa, memoriza y repite secuencias de colores. Entrena tu atención cuando la mente da vueltas.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.12) 0%, rgba(var(--accent-lavender-rgb), 0.06) 100%)',
    accent: 'var(--accent-rose)',
    minutes: '2-4 min',
    forWhom: ['Tristeza', 'Soledad'],
  },
];

export const getGame = (id: string): GameMeta | undefined => GAMES.find(g => g.id === id);