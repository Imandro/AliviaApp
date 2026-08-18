import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Timer, Play, Gamepad2 } from 'lucide-react';
import { GAMES } from '../utils/gamesCatalog';

const STORAGE_KEY = 'alivia-games-played';

export const GamesView: React.FC = () => {
  const navigate = useNavigate();
  const [played, setPlayed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlayed(new Set(JSON.parse(raw)));
    } catch {
      /* noop */
    }
  }, []);

  const openGame = (id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...played, id])]));
    } catch {
      /* noop */
    }
    navigate(`/games/${id}`);
  };

  return (
    <div className="fade-in flex flex-col gap-4" style={{ paddingBottom: '8px' }}>
      <div className="cm-card" style={{ padding: '20px 18px', background: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.12) 0%, rgba(var(--accent-sage-rgb), 0.05) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cm-float" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(var(--accent-lavender-rgb), 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Gamepad2 size={24} color="var(--accent-lavender)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="title-small" style={{ margin: 0, color: 'var(--text-primary)' }}>Juegos Mente-Activos</h3>
            <p className="body-standard" style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Mini-juegos diseñados para momentos difíciles: calman, enfocan y te regalan pequeñas victorias.
            </p>
          </div>
        </div>
      </div>

      {GAMES.map((game) => (
        <div
          key={game.id}
          className="glass-card cm-press"
          style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', background: game.gradient, border: '1px solid var(--border-color)' }}
          onClick={() => openGame(game.id)}
          role="button"
        >
          <div
            className="cm-float"
            style={{ width: '58px', height: '58px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.07)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', flexShrink: 0 }}
          >
            {game.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4 className="title-small" style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{game.title}</h4>
              {played.has(game.id) && (
                <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent-sage)', background: 'rgba(var(--accent-sage-rgb), 0.12)', borderRadius: '999px', padding: '3px 10px' }}>JUGADO ✓</span>
              )}
            </div>
            <p className="body-standard" style={{ margin: '5px 0 8px', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{game.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <Timer size={11} /> {game.minutes}
              </span>
              {game.forWhom.map(w => (
                <span key={w} style={{ fontSize: '9.5px', fontWeight: 700, color: game.accent, background: 'rgba(0,0,0,0.10)', border: `1px solid ${game.accent}33`, borderRadius: '999px', padding: '2.5px 9px' }}>
                  para {w}
                </span>
              ))}
            </div>
          </div>
          <button
            className="cm-press"
            style={{ flexShrink: 0, width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: game.accent, color: '#0c1810', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            aria-label={`Jugar ${game.title}`}
          >
            <Play size={17} fill="#0c1810" />
          </button>
        </div>
      ))}

      <button
        className="cm-press"
        style={{ marginTop: '4px', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.12)', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        onClick={() => navigate('/explore')}
      >
        Más herramientas de bienestar <ArrowRight size={15} />
      </button>

      <p className="body-standard" style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--text-muted)', margin: 0 }}>
        Los juegos acompañan, no sustituyen la atención profesional.
      </p>
    </div>
  );
};