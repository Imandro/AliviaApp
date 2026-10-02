/**
 * Catálogo de juegos sensoriales.
 *
 * Son deliberadamente aburridos: mecánicas repetitivas, lentas y sin meta.
 * No hay puntuación, ni estrellas, ni fallos, ni niveles, ni reloj. No se
 * gana nada y no se pierde nada. Solo una tarea que puedes repetir el
 * tiempo que aguantes.
 *
 * Sin imports de React ni del DOM: este módulo se puede probar en node.
 * El mapeo `icon` -> componente está en `gameIcons.tsx`.
 */

export type GameIconName = 'coins' | 'blocks' | 'marimba' | 'target' | 'thread' | 'broom' | 'paper' | 'trays';

export interface GameMeta {
  id: string;
  icon: GameIconName;
  title: string;
  desc: string;
  gradient: string;
  accent: string;
  /** Etiqueta de ritmo. Estos juegos no tienen final, así que nunca es un tiempo. */
  pace: string;
  forWhom: string[];
}

export const GAMES: GameMeta[] = [
  {
    id: 'moneda',
    icon: 'coins',
    title: 'Moneda Vieja',
    desc: 'Frota una moneda oxidada con el pulgar hasta que vuelve a brillar. No hay prisa ni final.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-warm-rgb), 0.14) 0%, rgba(var(--accent-gold-rgb), 0.07) 100%)',
    accent: 'var(--accent-warm)',
    pace: 'Sin reloj',
    forWhom: ['Ansiedad', 'Rumiación'],
  },
  {
    id: 'pila',
    icon: 'blocks',
    title: 'Pila de Bloques',
    desc: 'Apila tablitas una sobre otra arrastrándolas con el dedo. La torre se asienta sola y nunca se cae del todo.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.14) 0%, rgba(var(--accent-lavender-rgb), 0.07) 100%)',
    accent: 'var(--accent-sage)',
    pace: 'Sin reloj',
    forWhom: ['Enojo', 'Estrés'],
  },
  {
    id: 'marimba',
    icon: 'marimba',
    title: 'Marimba Chiquita',
    desc: 'Ocho barras de madera y nada más que hacer: tocarlas y escucharlas. El orden no importa.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.16) 0%, rgba(var(--accent-rose-rgb), 0.08) 100%)',
    accent: 'var(--accent-lavender)',
    pace: 'Sin reloj',
    forWhom: ['Pánico', 'Ansiedad'],
  },
  {
    id: 'dardos',
    icon: 'target',
    title: 'Dardos al Corcho',
    desc: 'Lanza dardos a un corcho fijo. Ni suma ni resta: solo el zumbido del vuelo y el golpe seco de la punta.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.14) 0%, rgba(var(--accent-warm-rgb), 0.07) 100%)',
    accent: 'var(--accent-rose)',
    pace: 'Sin reloj',
    forWhom: ['Enojo', 'Tristeza'],
  },
  {
    id: 'hilos',
    icon: 'thread',
    title: 'Enhebrar Cuentas',
    desc: 'Pasar cuentas al hilo, una por una. El hilo se afloja con el peso y las cuentas van apareciendo solas.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.14) 0%, rgba(var(--accent-warm-rgb), 0.07) 100%)',
    accent: 'var(--accent-gold)',
    pace: 'Sin reloj',
    forWhom: ['Rumiación', 'Soledad'],
  },
  {
    id: 'barrer',
    icon: 'broom',
    title: 'Barrer Polvo',
    desc: 'Empuja el polvo de la mesa hasta el borde con el dedo. Vuelve a caer más lento. Se puede repetir eternamente.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.14) 0%, rgba(var(--accent-sage-rgb), 0.07) 100%)',
    accent: 'var(--accent-lavender)',
    pace: 'Sin reloj',
    forWhom: ['Ansiedad', 'Agotamiento'],
  },
  {
    id: 'doblar',
    icon: 'paper',
    title: 'Doblar Papel',
    desc: 'Pliega la hoja una y otra vez. Cada doblez se queda marcado y el siguiente aparece en otro sitio.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.14) 0%, rgba(var(--accent-warm-rgb), 0.07) 100%)',
    accent: 'var(--accent-sage)',
    pace: 'Sin reloj',
    forWhom: ['Enojo', 'Estrés'],
  },
  {
    id: 'bandejas',
    icon: 'trays',
    title: 'Ordenar Fichas',
    desc: 'Reparte fichas en tres bandejas. Cualquier ficha sirve en cualquier bandeja: no hay forma correcta.',
    gradient: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.14) 0%, rgba(var(--accent-lavender-rgb), 0.07) 100%)',
    accent: 'var(--accent-rose)',
    pace: 'Sin reloj',
    forWhom: ['Tristeza', 'Pánico'],
  },
];

export const getGame = (id: string): GameMeta | undefined => GAMES.find(g => g.id === id);
