/* ----------------------------------------------------
   ALIVIA - CATÁLOGO DE LA BIBLIOTECA
   Metadatos de las entradas (títulos, temas, edades).
   El contenido interactivo vive en libraryContent.ts.
   ---------------------------------------------------- */

import { BookOpen, Mic, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LUCHAS } from './luchas';
import type { GuideCategory } from './libraryContent';
import { GUIDE_MINUTES } from './libraryContent';

export type LibraryType = 'libro' | 'articulo' | 'recurso';

export interface LibraryItem {
  id: string;
  type: LibraryType;
  title: string;
  desc: string;
  category: GuideCategory[] | GuideCategory;
  age: string;
  url?: string;
}

export const LIBRARY: LibraryItem[] = [
  {
    id: 'l1', type: 'libro', title: 'El arte de no amargarse la vida',
    desc: 'Una guía práctica sobre cómo afrontar los problemas cotidianos sin que se vuelvan angustia.',
    category: ['ansiedad', 'bienestar'], age: '12+',
  },
  {
    id: 'l2', type: 'libro', title: 'Tu mente en 18 minutos',
    desc: 'Cómo calmar la mente acelerada con hábitos breves y diarios.',
    category: ['ansiedad', 'bienestar'], age: '14+',
  },
  {
    id: 'l3', type: 'articulo', title: 'La tristeza también es una respuesta válida',
    desc: 'Validar la tristeza y distinguirla de la depresión para saber cuándo pedir ayuda.',
    category: 'depresion', age: '12+',
  },
  {
    id: 'l4', type: 'recurso', title: 'Guía de primeros auxilios emocionales',
    desc: 'Respuestas rápidas para momentos de crisis: pánico, enojo y desborde emocional.',
    category: ['bienestar', 'ansiedad'], age: '12+',
  },
  {
    id: 'l5', type: 'libro', title: 'Cómo hacer amigos incluso siendo tímido(a)',
    desc: 'Estrategias pequeñas para construir vínculos sanos sin forzarte a ser otra persona.',
    category: 'amistades', age: '12+',
  },
  {
    id: 'l6', type: 'articulo', title: 'Familias complicadas: límites sin culpa',
    desc: 'Cómo proteger tu paz dentro de un hogar conflictivo sin dejarte llevar por el caos.',
    category: 'familia', age: '14+',
  },
  {
    id: 'l7', type: 'recurso', title: 'Técnicas rápidas para dormir (mente en reposo)',
    desc: 'Protocolo 4-7-8 y rutina para apagar la mente antes de dormir.',
    category: 'bienestar', age: '10+',
  },
  {
    id: 'l8', type: 'articulo', title: 'Cómo hablar de lo que sientes con alguien de confianza',
    desc: 'El guion paso a paso para pedir apoyo sin tener que explicarlo todo.',
    category: ['amistades', 'depresion'], age: '12+',
  },
  {
    id: 'l9', type: 'recurso', title: 'Radar emocional: cómo llevar una bitácora de tu ánimo',
    desc: 'La ciencia detrás del registro diario de emociones y cómo hacerlo sin agobiarte.',
    category: 'bienestar', age: '12+',
  },
  {
    id: 'l10', type: 'articulo', title: 'Estrés escolar: el plan de 10 minutos',
    desc: 'Divide en bloques pequeños la presión académica sin quemarte.',
    category: ['ansiedad', 'bienestar'], age: '12+',
  },
  {
    id: 'l11', type: 'articulo', title: 'Amistades que drenan: las 8 señales',
    desc: 'Cómo reconocer la burla disfrazada de cariño, el control y el uso en tus amistades.',
    category: 'amistades', age: '12+',
  },
  {
    id: 'l12', type: 'articulo', title: 'Banderas rojas en el noviazgo',
    desc: 'Celos, control del teléfono y aislamiento: por qué no son amor y cómo salir de ahí.',
    category: 'noviazgo', age: '14+',
  },
  {
    id: 'l13', type: 'libro', title: 'Romper en paz: terminar una relación tóxica',
    desc: 'Un plan paso a paso para salir acompañado(a), sin volver a caer y con el corazón entero.',
    category: 'noviazgo', age: '14+',
  },
  {
    id: 'l14', type: 'recurso', title: 'Economía para jóvenes sin morir en el intento',
    desc: 'Presupuesto simple, ahorro mínimo y primeras ideas para generar ingresos.',
    category: 'economia', age: '13+',
  },
  {
    id: 'l15', type: 'recurso', title: 'Becas y apoyos que existen en tu país',
    desc: 'Dónde buscar programas gratuitos de estudio, empleo y emprendimiento juvenil.',
    category: 'economia', age: '13+',
  },
  {
    id: 'l16', type: 'articulo', title: 'Sobrevivir al ambiente en casa',
    desc: 'Hipervigilancia, mediación y culpa: cómo cuidarte sin escapar de tu hogar.',
    category: 'familia', age: '12+',
  },
  {
    id: 'l17', type: 'libro', title: 'Entender la depresión en jóvenes',
    desc: 'Qué se siente, por qué pasa y cómo se distingue de la tristeza normal.',
    category: 'depresion', age: '12+',
  },
  {
    id: 'l18', type: 'recurso', title: 'Cómo calmar un ataque de pánico',
    desc: 'Pasos concretos para cuando el cuerpo se dispara: agua fría, 4-7-8 y anclaje.',
    category: 'ansiedad', age: '12+',
  },
  {
    id: 'l19', type: 'articulo', title: 'Adicciones y juventud: entender para salir',
    desc: 'Cómo funciona el ciclo del consumo en el cerebro joven y qué estrategias reales funcionan.',
    category: 'adicciones', age: '13+',
  },
  {
    id: 'l20', type: 'recurso', title: 'Recursos de apoyo contra las adicciones',
    desc: 'Centros, líneas y comunidades de Centroamérica donde pedir ayuda sin pena ni juicios.',
    category: 'adicciones', age: '13+',
  },
  {
    id: 'l21', type: 'recurso', title: 'Líneas de ayuda de Centroamérica ',
    desc: 'Teléfonos gratuitos de crisis por país. Si estás en peligro, llama ahora: están para escucharte.',
    category: 'suicidio', age: '10+',
  },
  {
    id: 'l22', type: 'articulo', title: 'Cómo pedir ayuda: qué decir y a quién',
    desc: 'Un guion paso a paso para hablar del suicidio con un adulto o profesional, sin quedarte en el intento.',
    category: 'suicidio', age: '12+',
  },
  {
    id: 'l23', type: 'articulo', title: 'Dormir no es perder el tiempo',
    desc: 'Higiene del sueño para mentes jóvenes: horarios, pantallas, cafeína y qué hacer cuando la cabeza no apaga.',
    category: ['bienestar', 'ansiedad'], age: '12+',
  },
  {
    id: 'l24', type: 'recurso', title: 'Ataque de pánico paso a paso',
    desc: 'Qué hacer minuto a minuto durante una crisis de pánico y cómo acompañar la ola hasta que baje.',
    category: ['ansiedad'], age: '12+',
  },
  {
    id: 'l25', type: 'articulo', title: 'Si tu amigo no está bien',
    desc: 'Cómo escuchar sin juzgar, preguntar directo por el suicidio y buscar ayuda con él sin traicionar su confianza.',
    category: ['amistades', 'suicidio'], age: '13+',
  },
];

const LUCHA_META: Record<string, { emoji: string; color: string }> = {
  bienestar: { emoji: '✦', color: 'var(--accent-sage)' },
};
LUCHAS.forEach(l => { LUCHA_META[l.id] = { emoji: l.emoji, color: l.color }; });

export const CATEGORY_META = LUCHA_META;

export const TYPE_ICONS: Record<LibraryType, LucideIcon> = { libro: BookOpen, articulo: FileText, recurso: Mic };

export const getLibraryItem = (id: string): LibraryItem | undefined =>
  LIBRARY.find(i => i.id === id);

export const getGuideMinutes = (id: string): number => GUIDE_MINUTES[id] ?? 3;

export const CATEGORY_BIG_EMOJI: Record<GuideCategory, string> = {
  depresion: '✦',
  ansiedad: '✦',
  familia: '✦',
  economia: '✦',
  amistades: '✦',
  noviazgo: '✦',
  adicciones: '✦',
  suicidio: '✦',
  bienestar: '✦',
};

export const CATEGORY_RGB: Record<GuideCategory, string> = {
  depresion: 'var(--accent-rose-rgb)',
  ansiedad: 'var(--accent-lavender-rgb)',
  familia: 'var(--accent-warm-rgb)',
  economia: 'var(--accent-gold-rgb)',
  amistades: 'var(--accent-sage-rgb)',
  noviazgo: 'var(--accent-rose-rgb)',
  adicciones: 'var(--accent-warm-rgb)',
  suicidio: 'var(--accent-rose-rgb)',
  bienestar: 'var(--accent-sage-rgb)',
};

export const guidePrimaryCategory = (item: LibraryItem): GuideCategory =>
  Array.isArray(item.category) ? item.category[0] : item.category;