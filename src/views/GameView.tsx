import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Timer, Info } from 'lucide-react';
import { getGame } from '../utils/gamesCatalog';
import { BubblePop } from '../games/BubblePop';
import { MemoMatch } from '../games/MemoMatch';
import { Grounding } from '../games/Grounding';
import { SimonVia } from '../games/SimonVia';

const GAME_COMPONENTS: Record<string, React.FC<{ onExit: () => void }>> = {
  burbujas: BubblePop,
  memoria: MemoMatch,
  grounding: Grounding,
  secuencia: SimonVia,
};

export const GameView: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const game = getGame(id);
  const Game = GAME_COMPONENTS[id];

  if (!game || !Game) {
    return (
      <div className="glass-card fade-in" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontSize: '44px' }}>✦</div>
        <h4 className="title-small">Juego no encontrado</h4>
        <button className="cm-press" style={{ padding: '12px 22px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/games')}>
          Ver todos los juegos
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col gap-3" style={{ paddingBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="cm-press"
          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/games')}
          aria-label="Volver a juegos"
        >
          <ChevronLeft size={18} color="var(--text-secondary)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="title-small" style={{ margin: 0 }}>{game.emoji} {game.title}</h3>
          <p className="body-standard" style={{ margin: '2px 0 0', fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Timer size={11} /> {game.minutes} · para {game.forWhom.join(' y ')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', borderRadius: '14px', background: 'rgba(var(--accent-gold-rgb), 0.07)', border: '1px solid rgba(var(--accent-gold-rgb), 0.15)' }}>
        <Info size={13} color="var(--accent-gold)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <p className="body-standard" style={{ margin: 0, fontSize: '11px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {game.desc}
        </p>
      </div>

      <Game onExit={() => navigate('/games')} />
    </div>
  );
};