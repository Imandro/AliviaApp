import React, { useState, useEffect, useRef, useCallback } from 'react';
import { popSound, fanfareSound } from '../utils/sounds';

interface Bubble {
  id: number;
  x: number;
  size: number;
  dur: number;
  color: string;
}

const COLORS = ['#f6d365', '#8fd3f4', '#a8e6a3', '#e6a8f6', '#f4a8c3', '#a3d8f4'];
const ROUND_MS = 30000;
const SPAWN_MS = 620;

const AFFIRMATIONS = [
  'En 30 segundos tu sistema respiró más lento. Eso ya es calma que construyes.',
  'Cada burbuja que reventaste fue un pequeño momento de foco. Así se entrena la mente.',
  'Bien hecho. Este juego baja la ansiedad porque tu atención se ancla en el presente.',
  'Esa pausa jugada es un regalo para tu sistema nervioso. Vuelve cuando lo necesites.',
];

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const BubblePop: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pops, setPops] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS / 1000);
  const [finished, setFinished] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (finished) return;
    const spawn = () => {
      setBubbles(prev => [...prev, {
        id: idRef.current++,
        x: 4 + Math.random() * 82,
        size: 46 + Math.random() * 46,
        dur: 5.5 + Math.random() * 3.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }]);
    };
    for (let i = 0; i < 3; i++) setTimeout(spawn, i * 250);
    const spawnIv = setInterval(spawn, SPAWN_MS);
    const tick = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(tick);
          clearInterval(spawnIv);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(spawnIv); clearInterval(tick); };
  }, [finished]);

  const pop = useCallback((id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setPops(p => p + 1);
    popSound();
  }, []);

  const rating = pops >= 26 ? 3 : pops >= 17 ? 2 : 1;
  const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
  const done = finished && pops === 0;

  if (finished) {
    return (
      <div style={shell}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">🫧</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>Tirada terminada</h4>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>{pops}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>BURBUJAS REVENTADAS</div>
          <div style={{ fontSize: '20px', letterSpacing: '4px' }}>{'⭐'.repeat(rating)}{'☆'.repeat(3 - rating)}</div>
          <p className="body-standard" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{affirmation}</p>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
            <button className="cm-press" style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }} onClick={onExit}>Volver</button>
            <button
              className="cm-press"
              style={{ flex: 1.4, padding: '13px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }}
              onClick={() => { setPops(0); setTimeLeft(ROUND_MS / 1000); setFinished(false); setBubbles([]); }}
            >
              Jugar otra vez
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
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>REVIENTA LAS BURBUJAS</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{pops} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>burbujas</span></div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', color: timeLeft <= 5 ? 'var(--accent-rose)' : 'var(--accent-gold)' }}>{timeLeft}s</div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '300px',
          borderRadius: '22px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(var(--accent-lavender-rgb), 0.10) 0%, rgba(var(--accent-sage-rgb), 0.06) 100%)',
          border: '1px solid var(--border-color)',
          touchAction: 'manipulation',
        }}
      >
        {bubbles.map(b => (
          <button
            key={b.id}
            onPointerDown={() => pop(b.id)}
            style={{
              position: 'absolute',
              bottom: -b.size,
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.85) 0%, ${b.color} 60%, ${b.color} 100%)`,
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              animation: `bubbleFloat ${b.dur}s linear forwards`,
              animationPlayState: 'running',
              touchAction: 'manipulation',
            }}
            aria-label="Burbuja"
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.35, fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
          TOCA LAS BURBUJAS
        </div>
      </div>

      {pops >= 10 && (
        <div className="fade-in" style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-sage)' }}>
          ¡Ya llevas {pops}! Tu foco está en el presente. 🌿
        </div>
      )}
    </div>
  );
};