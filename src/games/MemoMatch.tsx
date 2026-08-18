import React, { useState, useEffect, useCallback } from 'react';
import { flipSound, goodSound, badSound, fanfareSound } from '../utils/sounds';

const EMOJIS = ['✦', '✦', '♥', '♥', '❂', '❂', '◈', '◈'];
const PAIRS = [...EMOJIS, ...EMOJIS];

const AFFIRMATIONS = [
  'Tu memoria y tu calma trabajando juntas: eso es autocuidado en acción.',
  'Cada par que encuentras entrena tu atención. Así se nota más tranquila la mente.',
  'Bien hecho. Concentrarte en algo presente calma el ruido mental.',
  'Ese juego es una pausa para tu cerebro. Regresa por más cuando quieras.',
];

const CARD_BACK = 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.5) 0%, rgba(var(--accent-sage-rgb), 0.35) 100%)';

const shuffle = (arr: string[]): string[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const MemoMatch: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [cards, setCards] = useState<string[]>(() => shuffle(PAIRS));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const won = matched.size === cards.length;

  useEffect(() => {
    if (won) fanfareSound();
  }, [won]);

  const flip = useCallback((idx: number) => {
    if (lock || flipped.includes(idx) || matched.has(idx)) return;
    flipSound();
    const next = [...flipped, idx];
    setFlipped(next);
    setMoves(m => m + 1);
    if (next.length === 2) {
      const [a, b] = next;
      if (cards[a] === cards[b]) {
        setTimeout(() => {
          setMatched(prev => new Set([...prev, a, b]));
          setFlipped([]);
          goodSound();
        }, 420);
      } else {
        setLock(true);
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
          badSound();
        }, 750);
      }
    }
  }, [cards, flipped, lock, matched]);

  const restart = () => {
    setCards(shuffle(PAIRS));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
  };

  if (won) {
    const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }} className="cm-float">✦</div>
          <h4 className="title-small" style={{ fontSize: '19px' }}>¡Memoria completa!</h4>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Lo lograste en <b style={{ color: 'var(--accent-gold)' }}>{moves} movimientos</b>
          </div>
          <p className="body-standard" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{affirmation}</p>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
            <button className="cm-press" style={{ flex: 1, padding: '13px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, cursor: 'pointer' }} onClick={onExit}>Volver</button>
            <button className="cm-press" style={{ flex: 1.4, padding: '13px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }} onClick={restart}>Jugar otra vez</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>MEMORIA DE EMOCIONES</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{matched.size / 2}/{EMOJIS.length} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>pares</span></div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>{moves} mov.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {cards.map((emoji, idx) => {
          const isUp = flipped.includes(idx) || matched.has(idx);
          return (
            <button
              key={idx}
              onClick={() => flip(idx)}
              className="cm-press"
              style={{
                aspectRatio: '1',
                borderRadius: '16px',
                border: `1px solid ${matched.has(idx) ? 'rgba(var(--accent-sage-rgb), 0.6)' : 'var(--border-color)'}`,
                background: isUp ? 'var(--bg-elevated)' : CARD_BACK,
                fontSize: isUp ? '26px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isUp ? 'var(--shadow-card)' : 'none',
                opacity: matched.has(idx) ? 0.75 : 1,
              }}
              aria-label="Carta"
            >
              {isUp && <span className="fade-in">{emoji}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
        Encuentra los pares iguales. Tu mente en calma los recuerda mejor.
      </div>
    </div>
  );
};