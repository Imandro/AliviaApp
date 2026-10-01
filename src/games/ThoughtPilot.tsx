import React, { useState, useEffect, useCallback } from 'react';
import { chimeSound, tapSound, levelUpSound } from '../utils/sounds';

interface Thought {
  text: string;
  urgency: 'alta' | 'media' | 'baja';
}

const THOUGHTS: Thought[] = [
  { text: 'Tengo que resolver algo ahora mismo', urgency: 'alta' },
  { text: 'No voy a poder con todo esto', urgency: 'alta' },
  { text: 'Este sentiment no se va a ir nunca', urgency: 'media' },
  { text: 'Debería poder sentirme mejor ya', urgency: 'media' },
  { text: 'Un día a la vez, sin más', urgency: 'baja' },
  { text: 'Puedo volver a esto en un rato', urgency: 'baja' },
  { text: 'Esto también va a pasar', urgency: 'baja' },
];

const RESULT_TEXT: Record<Thought['urgency'], string> = {
  alta: 'Anotado. Ahora suéltalo: no lo resuelves, solo lo anotaste.',
  media: 'Lo que sea, puede esperar. Vuelve a lo que tienes delante.',
  baja: 'Eso ya lo tienes encaminado. Sigue.',
};

const NOTES = [
  'Los pensamientos no desaparecen por pensarlos: se les quita el peso de "tarea urgente".',
  'Anotar y soltar baja la rumiación más de lo que parece. El cerebro se calma al ver que ya está guardado.',
  'Nombrar "esto va a pasar" es una de las frases con más respaldo para la ansiedad.',
  'No tenías que resolver nada hoy. Solo sostener.',
];

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const ThoughtPilot: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<Thought | null>(null);
  const [released, setReleased] = useState(0);
  const [finished, setFinished] = useState(false);
  const TOTAL = 6;

  const next = useCallback(() => {
    if (round >= TOTAL) {
      setFinished(true);
      return;
    }
    tapSound();
    setCurrent(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
  }, [round]);

  useEffect(() => {
    if (finished) {
      levelUpSound();
      return;
    }
    if (current === null && round < TOTAL) next();
  }, [round, current, finished, next]);

  const release = useCallback(() => {
    if (!current) return;
    chimeSound();
    setReleased((r) => r + 1);
    setCurrent(null);
    setRound((r) => r + 1);
  }, [current]);

  const reset = useCallback(() => {
    setRound(0);
    setCurrent(null);
    setReleased(0);
    setFinished(false);
  }, []);

  if (finished) {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const stars = released >= TOTAL ? 3 : released >= 3 ? 2 : 1;
    return (
      <div style={shell}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🛫</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Vuelo completado</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
            {released}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>
            PENSAMIENTOS SUELTOS
          </div>
          <div style={{ fontSize: '20px', letterSpacing: '4px' }}>
            {'✦'.repeat(stars)}
            {'✦'.repeat(3 - stars)}
          </div>
          <p className="body-standard" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {note}
          </p>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
            <button
              className="cm-press"
              style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }}
              onClick={onExit}
            >
              Volver
            </button>
            <button
              className="cm-press"
              style={{ flex: 1.4, padding: '13px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }}
              onClick={reset}
            >
              Volar otra vez
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
            SUELTA EL PENSAMIENTO
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {released} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>de {TOTAL}</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: 140, lineHeight: 1.4 }}>
          No lo resuelvas. Solo suéltalo.
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          minHeight: 190,
          borderRadius: '22px',
          padding: '26px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(var(--accent-rose-rgb), 0.10) 0%, rgba(var(--accent-lavender-rgb), 0.06) 100%)',
          border: '1px solid var(--border-color)',
        }}
      >
        {current ? (
          <>
            <p
              className="title-medium"
              style={{ margin: 0, fontSize: '19px', lineHeight: 1.45, color: 'var(--text-primary)' }}
            >
              «{current.text}»
            </p>
          </>
        ) : (
          <div style={{ opacity: 0.4, fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
            PREPARANDO
          </div>
        )}
      </div>

      {current && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(var(--accent-sage-rgb), 0.10)',
              border: '1px solid rgba(var(--accent-sage-rgb), 0.18)',
              fontSize: '12.5px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            {RESULT_TEXT[current.urgency]}
          </div>
          <button
            className="cm-press"
            onClick={release}
            style={{
              padding: '14px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))',
              color: '#0c1810',
              fontFamily: 'var(--font-title)',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Anotar y soltar
          </button>
        </div>
      )}
    </div>
  );
};