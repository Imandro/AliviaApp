import React from 'react';
import { Phone } from 'lucide-react';
import { hapticSos } from '../utils/haptics';

interface SosButtonProps {
  onClick: () => void;
}

/**
 * Botón SOS, pieza única del Header y de la barra de juego.
 *
 * Vive suelto porque el juego se juega sin Header: si el botón se duplicara,
 * el acceso a las líneas de crisis dejaría de ser el mismo control visual en
 * dos pantallas, que es justo lo que no puede pasar en una app de salud
 * mental. El pulso vive en index.css (keyframes pulseSOS).
 */
export const SosButton: React.FC<SosButtonProps> = ({ onClick }) => (
  <button
    onClick={() => { hapticSos(); onClick(); }}
    style={styles.button}
    title="Ayuda Inmediata (SOS)"
    aria-label="Ayuda inmediata, líneas de crisis (SOS)"
  >
    <div style={styles.pulse} />
    <div style={styles.pulse2} />
    <Phone size={14} color="#fff" aria-hidden="true" />
    <span style={styles.text}>SOS</span>
  </button>
);

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    position: 'relative',
    height: '44px',
    padding: '0 16px',
    borderRadius: '22px',
    border: 'none',
    background: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  text: {
    color: '#fff',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.06em',
  },
  pulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '22px',
    border: '2px solid rgba(229, 115, 115, 0.5)',
    animation: 'pulseSOS 2s infinite ease-out',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
  pulse2: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '22px',
    border: '2px solid rgba(229, 115, 115, 0.3)',
    animation: 'pulseSOS 2s infinite ease-out',
    animationDelay: '0.6s',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
};
