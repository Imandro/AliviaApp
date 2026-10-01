import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tapSound, chimeSound, levelUpSound } from '../utils/sounds';

const PHASES = [
  { label: 'Mira', text: 'Recorre mentalmente las 16 casillas del 1 al 16, mirándolas con calma.' },
  { label: 'Toca', text: 'Toca cada casilla en orden, una por una, sin apurarte.' },
  { label: 'Escucha', text: 'Quédate quieto unos segundos y solo escucha el ambiente.' },
  { label: 'Respira', text: 'Inhala y exhala tres veces sin forzar nada.' },
];

const TOTAL_MS = 60000;

const NOTES = [
  'Nombrar cosas concreto es una de las formas más rápidas de cortar la rumiación.',
  'Tocar mientras miras ancla la mente en el cuerpo y baja la ansiedad.',
  'No necesitas sentirte bien para hacerlo. Solo necesitas hacerlo.',
  'Esta técnica se usó en estudios con ataques de pánico: funciona en minutos.',
];

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const GridGrounding: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [phase, setPhase] = useState(0);
  const [tapped, setTapped] = useState<number[]>([]);
  const [left, setLeft] = useState(TOTAL_MS / 1000);
  const [finished, setFinished] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setFinished(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (finished) levelUpSound();
  }, [finished]);

  // Cada fase dura un cuarto del tiempo, pero se puede avanzar antes.
  const nextPhase = useCallback(() => {
    chimeSound();
    setPhase((p) => (p + 1) % PHASES.length);
  }, []);

  const tapCell = useCallback(
    (i: number) => {
      if (phase !== 1) return;
      if (tapped.includes(i)) return;
      tapSound();
      setTapped((t) => {
        const next = [...t, i];
        if (next.length === 16) chimeSound();
        return next;
      });
    },
    [phase, tapped]
  );

  const reset = useCallback(() => {
    setPhase(0);
    setTapped([]);
    setLeft(TOTAL_MS / 1000);
    setFinished(false);
    startedRef.current = false;
  }, []);

  if (finished) {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const stars = tapped.length >= 16 ? 3 : tapped.length >= 8 ? 2 : 1;
    return (
      <div style={shell}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🌿</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Anclaje completado</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
            {tapped.length}
            <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/16</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>
            CASILLAS TOCADAS
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
              Anclar otra vez
            </button>
          </div>
        </div>
      </div>
    );
  }

  const p = PHASES[phase];
  const canTap = phase === 1;

  return (
    <div style={shell}>
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
            PASO {phase + 1}/4
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {p.label}
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
          {left}s
        </div>
      </div>

      <div
        className="glass-card"
        style={{ padding: '14px 16px', fontSize: '12.5px', lineHeight: 1.55, color: 'var(--text-secondary)' }}
      >
        {p.text}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          opacity: canTap ? 1 : 0.4,
          transition: 'opacity 0.3s ease',
        }}
      >
        {Array.from({ length: 16 }, (_, i) => {
          const on = tapped.includes(i);
          return (
            <button
              key={i}
              onClick={() => tapCell(i)}
              disabled={!canTap}
              style={{
                aspectRatio: '1',
                borderRadius: '14px',
                border: `1px solid ${on ? 'var(--accent-sage)' : 'var(--border-color)'}`,
                background: on
                  ? 'linear-gradient(135deg, rgba(var(--accent-sage-rgb), 0.42), rgba(var(--accent-gold-rgb), 0.28))'
                  : 'rgba(0,0,0,0.14)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '15px',
                cursor: canTap ? 'pointer' : 'default',
                transition: 'all 0.25s var(--spring-fast)',
                transform: on ? 'scale(0.95)' : 'none',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {canTap && (
        <div className="fade-in" style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-sage)' }}>
          {tapped.length}/16 · sigue en orden
        </div>
      )}

      <button
        className="cm-press"
        onClick={nextPhase}
        style={{
          padding: '13px',
          borderRadius: '16px',
          border: '1px solid var(--border-color-glow)',
          background: 'rgba(var(--accent-gold-rgb), 0.10)',
          color: 'var(--accent-gold)',
          fontFamily: 'var(--font-title)',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {phase === 3 ? 'Volver a empezar' : 'Siguiente paso'}
      </button>
    </div>
  );
};