import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chimeSound, tapSound, goodSound, levelUpSound } from '../utils/sounds';

interface Seed {
  id: number;
  x: number;
  y: number;
  growth: number;
  kind: 'flor' | 'brote' | 'hongo';
}

const KINDS: Seed['kind'][] = ['flor', 'brote', 'hongo'];
const TOTAL_MS = 45000;
const GROW_STEPS = 5;

const NOTES = [
  'Cada semilla que regaste fue un pequeño acto de cuidarte sin que nadie lo viera.',
  'Cuidar algo que crece baja la ansiedad más rápido de lo que parece.',
  'No hacía falta que nada creciera hoy. Con que regaste, ya hiciste algo.',
  'Esto no cura nada, pero te recuerda que tú también puedes.',
];

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const SeedGarden: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [watered, setWatered] = useState(0);
  const [left, setLeft] = useState(TOTAL_MS / 1000);
  const [finished, setFinished] = useState(false);
  const idRef = useRef(0);
  const growIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (finished) return;
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
  }, [finished]);

  // Cada planta crece sola poco a poco: regar acelera el primer paso, el resto
  // sigue por su cuenta (asi que no hay que quedarse mirando).
  useEffect(() => {
    if (finished) return;
    growIvRef.current = setInterval(() => {
      setSeeds((prev) =>
        prev.map((s) => (s.growth < 1 ? { ...s, growth: Math.min(1, s.growth + 0.06) } : s))
      );
    }, 900);
    return () => {
      if (growIvRef.current) clearInterval(growIvRef.current);
    };
  }, [finished]);

  useEffect(() => {
    if (!finished) return;
    if (growIvRef.current) clearInterval(growIvRef.current);
    levelUpSound();
  }, [finished]);

  const water = useCallback((id: number) => {
    tapSound();
    setSeeds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, growth: Math.min(1, s.growth + 0.25) } : s))
    );
    setWatered((w) => w + 1);
  }, []);

  const plant = useCallback(() => {
    setSeeds((prev) => {
      if (prev.length >= 6) return prev;
      return [
        ...prev,
        {
          id: idRef.current++,
          x: 12 + Math.random() * 68,
          y: 22 + Math.random() * 52,
          growth: 0.05,
          kind: KINDS[Math.floor(Math.random() * KINDS.length)],
        },
      ];
    });
  }, []);

  const reset = useCallback(() => {
    setSeeds([]);
    setWatered(0);
    setLeft(TOTAL_MS / 1000);
    setFinished(false);
  }, []);

  if (finished) {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const grown = seeds.filter((s) => s.growth >= 1).length;
    const stars = grown >= 4 ? 3 : grown >= 2 ? 2 : 1;
    return (
      <div style={shell}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🌱</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Jardín listo</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
            {grown}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>
            PLANTAS CRECIDAS
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
              Plantar otra vez
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
            REGA Y CRECE
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {seeds.filter((s) => s.growth >= 1).length}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> crecidas · {watered} riego</span>
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>
          {left}s
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '300px',
          borderRadius: '22px',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(var(--accent-sage-rgb), 0.10) 0%, rgba(var(--accent-warm-rgb), 0.10) 45%, rgba(var(--accent-warm-rgb), 0.18) 100%)',
          border: '1px solid var(--border-color)',
          touchAction: 'manipulation',
        }}
      >
        {/* Linea de tierra */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '18%',
            height: 2,
            background: 'rgba(var(--accent-warm-rgb), 0.35)',
          }}
        />
        {seeds.map((s) => {
          const size = 26 + s.growth * 34;
          const emoji = s.growth >= 0.9 ? '🌸' : s.growth >= 0.5 ? '🌿' : '🌱';
          return (
            <button
              key={s.id}
              onPointerDown={() => water(s.id)}
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: size,
                lineHeight: 1,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.4s var(--spring-smooth)',
                filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.25))`,
                opacity: 0.9,
              }}
              aria-label="Planta"
            >
              <span
                style={{
                  display: 'block',
                  transform: `scale(${1 + s.growth * 0.35})`,
                  transition: 'transform 0.6s var(--spring-smooth)',
                }}
              >
                {emoji}
              </span>
            </button>
          );
        })}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.4,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          {seeds.length === 0 ? 'TOCA EL BOTÓN PARA PLANTAR' : 'TOCA LAS PLANTAS PARA REGARLAS'}
        </div>
      </div>

      <button
        className="cm-press"
        onClick={() => {
          chimeSound();
          plant();
        }}
        disabled={seeds.length >= 6}
        style={{
          padding: '13px',
          borderRadius: '16px',
          border: '1px solid var(--border-color-glow)',
          background: seeds.length >= 6 ? 'rgba(0,0,0,0.10)' : 'rgba(var(--accent-sage-rgb), 0.12)',
          color: seeds.length >= 6 ? 'var(--text-muted)' : 'var(--accent-sage)',
          fontFamily: 'var(--font-title)',
          fontWeight: 800,
          cursor: seeds.length >= 6 ? 'default' : 'pointer',
          opacity: seeds.length >= 6 ? 0.6 : 1,
        }}
      >
        {seeds.length >= 6 ? 'Jardín lleno' : 'Plantar una semilla'}
      </button>
    </div>
  );
};