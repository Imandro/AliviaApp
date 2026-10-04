import React, { useEffect, useState } from 'react';

/**
 * LiveRegion - Componente para anuncios a screen readers
 * Usa aria-live para anunciar cambios dinámicos
 */
interface LiveRegionProps {
  /** 'polite' | 'assertive' - prioridad del anuncio */
  politeness?: 'polite' | 'assertive';
  /** ID único para la región */
  id?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  politeness = 'polite', 
  id = 'alivia-live-region' 
}) => {
  const [message, setMessage] = useState('');

  // Función para anunciar mensajes
  const announce = (text: string, priority: 'polite' | 'assertive' = 'polite') => {
    setMessage('');
    // Forzar re-render para que screen readers lean el nuevo mensaje
    setTimeout(() => {
      setMessage(text);
    }, 0);
  };

  // Exponer función globalmente
  useEffect(() => {
    (window as any).aliviaAnnounce = announce;
    return () => {
      delete (window as any).aliviaAnnounce;
    };
  }, []);

  return (
    <div
      id={id}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="live-region"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  );
};

export default LiveRegion;
