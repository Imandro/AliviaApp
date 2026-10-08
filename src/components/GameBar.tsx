import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { GameIcon } from '../utils/gameIcons';
import { SosButton } from './SosButton';
import type { GameMeta } from '../utils/gamesCatalog';

interface GameBarProps {
  game: GameMeta;
  onExit: () => void;
  onSos: () => void;
}

/**
 * Barra de la pantalla de juego.
 *
 * Sustituye al Header global mientras se juega. No es solo estética: el Header
 * mide 84px con el safe-area y empuja el escenario hacia abajo hasta que hay
 * que desplazar, y al desplazar el escenario acaba bajo la navbar, que roba
 * los toques. Aquí solo queda volver, el nombre del juego y el SOS.
 */
export const GameBar: React.FC<GameBarProps> = ({ game, onExit, onSos }) => (
  <div style={styles.bar}>
    <button
      className="cm-press"
      style={styles.back}
      onClick={onExit}
      aria-label="Volver a juegos"
      title="Volver a juegos"
    >
      <ChevronLeft size={18} color="var(--text-secondary)" />
    </button>

    <div style={styles.title}>
      <GameIcon name={game.icon} size={19} color={game.accent} />
      <h3 className="title-small" style={styles.titleText}>{game.title}</h3>
    </div>

    <SosButton onClick={onSos} />
  </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: 'calc(8px + env(safe-area-inset-top)) 0 2px',
    /* En tablet/escritorio el escenario se limita a 640px; la barra sigue ese
       mismo ancho para que volver, título y SOS queden alineados con el juego. */
    width: '100%',
    maxWidth: '640px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  back: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
  },
  titleText: {
    margin: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
