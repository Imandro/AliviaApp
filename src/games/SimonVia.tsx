import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tapSound, goodSound, badSound, levelUpSound, fanfareSound, noteSound } from '../utils/sounds';

const PADS = [
  { name: 'S', color: '#7fd6a1', dim: 'rgba(127, 214, 161, 0.25)', freq: 392 },
  { name: 'G', color: '#f6d365', dim: 'rgba(246, 211, 101, 0.25)', freq: 523 },
  { name: 'L', color: '#a78bfa', dim: 'rgba(167, 139, 250, 0.25)', freq: 659 },
  { name: 'R', color: '#f4a8c3', dim: 'rgba(244, 168, 195, 0.25)', freq: 784 },
];

const AFFIRMATIONS = [
  'Repetir secuencias entrena tu atención: una herramienta de oro contra el ruido mental.',
  'Cada nivel completado es una pequeña victoria. Tu cerebro lo recuerda.',
  'Bien hecho. Concentrarte así le da un descanso a la preocupación.',
  'Eso fue foco puro. La calma también se entrena jugando.',
];

type Phase = 'idle' | 'showing' | 'input' | 'over';

export const SimonVia: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [cursor, setCursor] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startGame = useCallback(() => {
    setSequence([Math.floor(Math.random() * 4)]);
    setLevel(0);
    setCursor(0);
    setPhase('showing');
  }, []);

  useEffect(() => {
    if (phase !== 'showing') return;
    let i = 0;
    const step = () => {
      if (i >= sequence.length) {
        setPhase('input');
        setCursor(0);
        return;
      }
      const pad = sequence[i];
      noteSound(PADS[pad].freq);
      setLit(pad);
      timerRef.current = window.setTimeout(() => {
        setLit(null);
        i += 1;
        timerRef.current = window.setTimeout(step, 420);
      }, 520);
    };
    const t = window.setTimeout(step, 700);
    return () => {
      window.clearTimeout(t);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [phase, sequence]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const pressPad = (idx: number) => {
    if (phase !== 'input') return;
    tapSound();
    noteSound(PADS[idx].freq);
    setLit(idx);
    window.setTimeout(() => setLit(null), 220);

    if (sequence[cursor] === idx) {
      if (cursor === sequence.length - 1) {
        const nextLevel = level + 1;
        if (nextLevel >= 8) {
          fanfareSound();
          setPhase('over');
          return;
        }
        levelUpSound();
        setLevel(nextLevel);
        setSequence(prev => [...prev, Math.floor(Math.random() * 4)]);
        setCursor(0);
        setPhase('showing');
      } else {
        goodSound();
        setCursor(c => c + 1);
      }
    } else {
      badSound();
      setPhase('over');
    }
  };

  const phaseToLabel = phase === 'showing' ? 'Observa la secuencia…' : phase === 'input' ? 'Tu turno: repítela' : '';
  const finished = phase === 'over' && sequence.length > 0;
  const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

  if (finished) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">⌖</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Secuencia terminada</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-lavender)' }}>{level}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>NIVELES COMPLETADOS</div>
          <p className="body-standard" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{affirmation}</p>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
            <button className="cm-press" style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }} onClick={onExit}>Volver</button>
            <button className="cm-press" style={{ flex: 1.4, padding: '13px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-gold))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }} onClick={startGame}>Jugar otra vez</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>SECUENCIA VIA</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{phaseToLabel || '¿Listo para empezar?'}</div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-lavender)' }}>{level}<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> nvl</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {PADS.map((pad, i) => {
          const active = lit === i;
          return (
            <button
              key={pad.name}
              onClick={() => pressPad(i)}
              className="cm-press"
              style={{
                aspectRatio: '1.2',
                borderRadius: '22px',
                border: 'none',
                background: active ? pad.color : pad.dim,
                boxShadow: active ? `0 0 34px ${pad.color}aa, inset 0 0 24px rgba(255,255,255,0.35)` : 'inset 0 2px 10px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={`Pad ${i + 1}`}
            />
          );
        })}
      </div>

      {phase === 'idle' && (
        <button
          className="cm-press"
          style={{
            padding: '15px',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-gold))',
            color: '#0c1810',
            fontFamily: 'var(--font-title)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 10px 26px rgba(var(--accent-lavender-rgb), 0.3)',
          }}
          onClick={startGame}
        >
          Empezar secuencia
        </button>
      )}

      <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
        Un juego de atención: ver, recordar y repetir. Ideal cuando la mente da vueltas.
      </div>
    </div>
  );
};