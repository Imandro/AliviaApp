import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameIcon } from '../utils/gameIcons';
import { GameBar } from '../components/GameBar';
import { CoinPolish } from '../games/CoinPolish';
import { BlockStack } from '../games/BlockStack';
import { Marimba } from '../games/Marimba';
import { Darts } from '../games/Darts';
import { Threading } from '../games/Threading';
import { SweepDust } from '../games/SweepDust';
import { PaperFold } from '../games/PaperFold';
import { SortTokens } from '../games/SortTokens';
import { getGame } from '../utils/gamesCatalog';

const GAME_COMPONENTS: Record<string, React.FC<{ onExit: () => void }>> = {
  moneda: CoinPolish,
  pila: BlockStack,
  marimba: Marimba,
  dardos: Darts,
  hilos: Threading,
  barrer: SweepDust,
  doblar: PaperFold,
  bandejas: SortTokens,
};

export const GameView: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const game = getGame(id);
  const Game = GAME_COMPONENTS[id];

  if (!game || !Game) {
    return (
      <div className="glass-card fade-in" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <GameIcon name="target" size={40} color="var(--accent-lavender)" />
        <h4 className="title-small">Juego no encontrado</h4>
        <button className="cm-press" style={{ padding: '12px 22px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sage))', color: '#0c1810', fontFamily: 'var(--font-title)', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/games')}>
          Ver todos los juegos
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col gap-3">
      <GameBar
        game={game}
        onExit={() => navigate('/games')}
        onSos={() => navigate('/sos')}
      />

      <Game onExit={() => navigate('/games')} />
    </div>
  );
};
