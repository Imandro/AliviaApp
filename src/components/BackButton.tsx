import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface BackButtonProps {
  /** Destino explicito. Si se omite, se devuelve en la historia de la app. */
  to?: string;
  /** Texto visible; sin el, el boton queda como icono circular. */
  label?: string;
  /** Nombre accesible. Por defecto usa `label` o "Volver". */
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

/**
 * Boton de regreso unico para las vistas de detalle.
 * Reemplaza los botones inline que cada vista duplicaba con su propio radio,
 * color e icono, para que guides y juegos compartan la misma pieza visual.
 */
export const BackButton: React.FC<BackButtonProps> = ({ to, label, ariaLabel, size = 'md' }) => {
  const navigate = useNavigate();
  const name = ariaLabel ?? label ?? 'Volver';

  const handleClick = () => {
    haptic();
    if (to) {
      navigate(to);
      return;
    }
    navigate(-1);
  };

  const classes = ['cm-back', `cm-back-${size}`, label ? '' : 'cm-back-icon'].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} onClick={handleClick} aria-label={name} title={name}>
      <span className="cm-back-icon" aria-hidden="true">
        <ArrowLeft size={size === 'sm' ? 16 : 18} />
      </span>
      {label ? <span className="cm-back-label">{label}</span> : null}
    </button>
  );
};