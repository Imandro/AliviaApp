/* ----------------------------------------------------
   ALIVIA - BIBLIOTECA INTERACTIVA
   Catálogo de guías cortas. Al tocar una tarjeta se
   abre la guía inmersiva con retos, quiz y progreso.
   ---------------------------------------------------- */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Sparkles } from 'lucide-react';
import { getMoodHistory } from '../utils/localDb';
import {
  LIBRARY,
  CATEGORY_META,
  TYPE_ICONS,
  getGuideMinutes,
  guidePrimaryCategory,
} from '../utils/libraryItems';
import type { GuideCategory } from '../utils/libraryContent';

const DoneKey = 'alivia-guides-done';

const loadDone = (): string[] => {
  try {
    const raw = localStorage.getItem(DoneKey);
    if (raw) return JSON.parse(raw);
  } catch { /* vacío */ }
  return [];
};

const TYPE_LABEL: Record<string, string> = { libro: 'Libro', articulo: 'Artículo', recurso: 'Guía' };

export const LibraryView: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<GuideCategory | 'todas'>('todas');
  const [moodBased, setMoodBased] = useState<GuideCategory | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>(() => loadDone());

  useEffect(() => {
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

  useEffect(() => {
    const onFocus = () => setDoneIds(loadDone());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const filtered = useMemo(() => {
    const base = category === 'todas' ? LIBRARY : LIBRARY.filter(i =>
      Array.isArray(i.category) ? i.category.includes(category) : i.category === category);
    if (!moodBased) return base;
    const scored = base.map(item => {
      const matches = Array.isArray(item.category)
        ? item.category.includes(moodBased)
        : item.category === moodBased;
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
            : 'Guías cortas, con retos clicables y mini-test. Se guarda tu avance y completas en minutos. '}
          Conocerse y aprender son pasos de cuidado.
        </p>
        <div style={styles.topicRow}>
          {(['todas', ...Object.keys(CATEGORY_META)] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c as GuideCategory | 'todas')}
              style={{
                ...styles.topicBtn,
                ...(category === c
                  ? { background: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)', borderColor: 'rgba(var(--accent-gold-rgb), 0.25)' }
                  : {}),
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
          const cat = guidePrimaryCategory(item);
          const meta = CATEGORY_META[cat];
          const minutes = getGuideMinutes(item.id);
          const completed = doneIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/library/${item.id}`)}
              className="library-item glass-card fade-in"
              style={styles.itemCard}
            >
              <div
                style={{
                  ...styles.iconBox,
                  background: `rgba(${meta ? 'var(--accent-gold-rgb)' : 'var(--accent-gold-rgb)'}, 0.08)`,
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
                }}
              >
                <Icon size={18} color="var(--accent-gold)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.itemTopRow}>
                  <h4 className="title-medium" style={{ fontSize: '13.5px', color: 'var(--text-primary)', textTransform: 'none', letterSpacing: 0, margin: 0 }}>
                    {item.title}
                  </h4>
                  {completed && (
                    <span style={styles.doneChip}>
                      <Check size={10} strokeWidth={4} /> Hecha
                    </span>
                  )}
                </div>
                <p className="body-standard" style={{ fontSize: '11.5px', opacity: 0.7, marginTop: '3px', lineHeight: 1.5, marginBottom: 0 }}>
                  {item.desc}
                </p>
                <div style={styles.itemMeta}>
                  <span style={styles.catTag}>
                    {meta.emoji} {cat}
                  </span>
                  <span style={styles.ageTag}>Edad {item.age}</span>
                  <span style={styles.typeTag}>{TYPE_LABEL[item.type]}</span>
                  <span style={styles.minTag}>
                    <Clock size={10} /> {minutes} min
                  </span>
                </div>
              </div>
            </button>
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
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
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
  doneChip: {
    fontSize: '10px',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    color: 'var(--accent-sage)',
    background: 'rgba(140, 176, 141, 0.12)',
    border: '1px solid rgba(140, 176, 141, 0.3)',
    padding: '2px 7px',
    borderRadius: '8px',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  catTag: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-title)',
    color: 'var(--accent-gold)',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    padding: '3px 8px',
    borderRadius: '9px',
  },
  ageTag: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
  },
  typeTag: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    border: '1px solid var(--border-color)',
    padding: '3px 8px',
    borderRadius: '9px',
  },
  minTag: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  },
};