import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Mic, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { getMoodHistory } from '../utils/localDb';
import { LUCHAS } from '../utils/luchas';

type Category = 'depresion' | 'ansiedad' | 'familia' | 'economia' | 'amistades' | 'noviazgo' | 'bienestar';

interface LibraryItem {
  id: string;
  type: 'libro' | 'articulo' | 'recurso';
  title: string;
  desc: string;
  category: Category[] | Category;
  age: string;
  url?: string;
}

const LIBRARY: LibraryItem[] = [
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
];

const LUCHA_META: Record<string, { emoji: string; color: string }> = {
  bienestar: { emoji: '🌿', color: 'var(--accent-sage)' },
};
LUCHAS.forEach(l => { LUCHA_META[l.id] = { emoji: l.emoji, color: l.color }; });

const CATEGORY_META = LUCHA_META;

const TYPE_ICONS = { libro: BookOpen, articulo: FileText, recurso: Mic };

export const LibraryView: React.FC = () => {
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const [moodBased, setMoodBased] = useState<Category | null>(null);

  useEffect(() => {
    // Recomendación inteligente basada en los registros de ánimo recientes
    (async () => {
      try {
        const history = await getMoodHistory();
        const last14 = history.slice(-14);
        if (last14.length < 3) return;
        const avg = last14.reduce((a, h) => a + h.score, 0) / last14.length;
        if (avg <= 2.4) setMoodBased('depresion');
        else if (avg <= 3.3) setMoodBased('ansiedad');
        else setMoodBased('bienestar');
      } catch {
        // sin datos: no hay recomendación automática
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const base = category === 'todas' ? LIBRARY : LIBRARY.filter(i =>
      Array.isArray(i.category) ? i.category.includes(category) : i.category === category);
    // La "biblioteca inteligente" ordena primero lo relevante a tu estado actual
    if (!moodBased) return base;
    const scored = base.map(item => {
      const matches = Array.isArray(item.category) ? item.category.includes(moodBased) : item.category === moodBased;
      return { item, score: matches ? 0 : 1 };
    });
    return scored.sort((a, b) => a.score - b.score).map(s => s.item);
  }, [category, moodBased]);

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Sparkles size={16} color="var(--accent-gold)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>BIBLIOTECA INTELIGENTE</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          {moodBased
            ? `Según tus últimos registros de ánimo, destacamos contenido relacionado con "${moodBased}". `
            : 'Contenido seleccionado por profesionales y validado, ordenado según registras tu ánimo diario. '}
          Conocerse y aprender son pasos de cuidado.
        </p>
        <div style={styles.topicRow}>
          {(['todas', ...Object.keys(CATEGORY_META)] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c as Category | 'todas')}
              style={{
                ...styles.topicBtn,
                ...(category === c ? { background: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)', borderColor: 'rgba(var(--accent-gold-rgb), 0.25)' } : {}),
              }}
            >
              {c === 'todas' ? '📚 Todas' : `${CATEGORY_META[c].emoji} ${c}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(item => {
          const Icon = TYPE_ICONS[item.type];
          const cat = Array.isArray(item.category) ? item.category[0] : item.category;
          const meta = CATEGORY_META[cat];
          return (
            <div key={item.id} className="glass-card fade-in" style={styles.itemCard}>
              <div
                style={{
                  ...styles.iconBox,
                  background: `rgba(var(--accent-gold-rgb), 0.08)`,
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
                }}
              >
                <Icon size={18} color="var(--accent-gold)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.itemTopRow}>
                  <h4 className="title-medium" style={{ fontSize: '13.5px', color: 'var(--text-primary)', textTransform: 'none', letterSpacing: 0 }}>
                    {item.title}
                  </h4>
                  <span style={styles.typeChip}>{item.type}</span>
                </div>
                <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.7, marginTop: '3px', lineHeight: 1.5 }}>
                  {item.desc}
                </p>
                <div style={styles.itemMeta}>
                  <span style={{ ...styles.catTag, color: meta.color, background: `rgba(var(--accent-gold-rgb), 0.08)` }}>
                    {meta.emoji} {cat}
                  </span>
                  <span style={styles.ageTag}>Edad {item.age}</span>
                </div>
              </div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.openBtn} title="Abrir contenido">
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.55, textAlign: 'center', padding: '0 12px' }}>
        El contenido es orientativo y no sustituye atención profesional. Si algo te sobrepasa, busca ayuda humana.
      </p>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  heroCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.07) 0%, rgba(var(--accent-lavender-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.12)',
    padding: '16px',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  topicRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  topicBtn: {
    padding: '8px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.15)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemCard: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '40px',
  },
  itemTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  typeChip: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    padding: '2px 7px',
    borderRadius: '8px',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  catTag: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-title)',
    padding: '3px 8px',
    borderRadius: '9px',
  },
  ageTag: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
  },
  openBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
};