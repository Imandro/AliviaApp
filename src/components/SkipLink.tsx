import React, { useEffect, useRef } from 'react';

/**
 * SkipLink - Enlace para saltar al contenido principal
 * Accesible con Tab desde el inicio de la página
 */
export const SkipLink: React.FC = () => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const firstFocusable = document.querySelector<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable && firstFocusable !== linkRef.current) {
          // El skip link ya recibió focus, siguiente Tab va al contenido
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <a
      ref={linkRef}
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-100%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '12px 24px',
        background: 'var(--accent-gold)',
        color: '#0c1810',
        fontFamily: 'var(--font-title)',
        fontWeight: 700,
        fontSize: '14px',
        borderRadius: '8px',
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'top 0.2s ease-out',
        whiteSpace: 'nowrap',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '16px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100%';
      }}
    >
      Saltar al contenido principal
    </a>
  );
};

export default SkipLink;
