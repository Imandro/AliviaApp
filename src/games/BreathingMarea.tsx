import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chimeSound, levelUpSound } from '../utils/sounds';

type Phase = 'inhalar' | 'aguantar' | 'exhalar';

const PHASES: { key: Phase; secs: number; label: string }[] = [
  { key: 'inhalar', secs: 4, label: 'Inhala' },
  { key: 'aguantar', secs: 7, label: 'Aguanta' },
  { key: 'exhalar', secs: 8, label: 'Exhala' },
];

const CYCLES_TARGET = 4;

const NOTES = [
  'La exhalación larga es la llave: activa tu nervio vago y baja el pulso.',
  'Cuatro ciclos ya bajan la intensidad del sistema de alerta.',
  'No lo fuerces. Si te mareas, vuelve a respirar normal y sigue.',
  'Esta es una de las técnicas con más respaldo para ataques de pánico.',
];

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const BreathingMarea: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(PHASES[0].secs);
  const [cycles, setCycles] = useState(0);
  const [finished, setFinished] = useState(false);
  const [scale, setScale] = useState(0.6);
  const phase = PHASES[idx];

  // El circulo crece al inhalar y se encoge al exhalar. El size del circulo es lo
  // que le dice al ojo (sin leer nada) en que fase estas.
  const targetScale = phase.key === 'inhalar' ? 1 : phase.key === 'exhalar' ? 0.55 : 1;

  useEffect(() => {
    setScale(targetScale);
  }, [targetScale]);

  useEffect(() => {
    if (finished) return;
    if (count <= 0) {
      const next = (idx + 1) % PHASES.length;
      setIdx(next);
      setCount(PHASES[next].secs);
      if (next === 0) {
        setCycles((c) => c + 1);
        chimeSound();
      }
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, idx, finished]);

  useEffect(() => {
    if (!finished) return;
    levelUpSound();
  }, [finished]);

  const reset = useCallback(() => {
    setIdx(0);
    setCount(PHASES[0].secs);
    setCycles(0);
    setFinished(false);
    setScale(0.6);
  }, []);

  if (finished) {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const stars = cycles >= CYCLES_TARGET ? 3 : 2;
    return (
      <div style={shell}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🌊</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Marea completada</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>{cycles}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>CICLOS 4-7-8</div>
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
              Respirar otra vez
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
            RESPIRACIÓN 4-7-8
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {cycles} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>de {CYCLES_TARGET} ciclos</span>
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
          {count}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '300px',
          borderRadius: '22px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 45%, rgba(var(--accent-lavender-rgb), 0.18) 0%, rgba(0,0,0,0) 70%)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Anillos concentricos de fondo, muy suaves */}
        {[0.9, 0.75, 0.6].map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${s * 100}%`,
              aspectRatio: '1',
              borderRadius: '50%',
              border: '1px solid rgba(var(--accent-lavender-rgb), 0.10)',
            }}
          />
        ))}
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'radial-gradient(circle at 35% 30%, rgba(var(--accent-lavender-rgb), 0.55) 0%, rgba(var(--accent-sage-rgb), 0.30) 70%)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 0 60px rgba(var(--accent-lavender-rgb), 0.28)',
            transform: `scale(${scale})`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.14em', color: '#0c1810' }}>
            {phase.label.toUpperCase()}
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0c1810', lineHeight: 1 }}>
            {count}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.4,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
            flexDirection: 'column',
          }}
        >
          <div style={{ marginTop: 210, textAlign: 'center', padding: '0 20px' }}>
           Sigue el círculo con la mirada
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {PHASES.map((p, i) => (
          <div
            key={p.key}
            style={{
              flex: 1,
              height: 4,
              borderRadius: '2px',
              background: i === idx ? 'var(--accent-gold)' : 'var(--border-color)',
              transition: 'background 0.4s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};