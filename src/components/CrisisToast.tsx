import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, X, ChevronRight } from 'lucide-react';

/**
 * CrisisToast - Toast global para detectar contexto de crisis y ofrecer ayuda
 * Se muestra automáticamente cuando se detectan señales de crisis:
 * - Mood 1-2 en Dashboard
 * - Keywords de crisis en Chat (VIA)
 * - Score alto en Assessment
 * - Navegación a /sos
 */

interface CrisisToastProps {
  message?: string;
  onDismiss?: () => void;
}

const CRISIS_MESSAGES = [
  '¿Te sientes abrumado? Hay ayuda real cerca de ti.',
  'No tienes que pasar por esto solo. Recursos verificados a un toque.',
  '¿Necesitas hablar con alguien ahora? Líneas de crisis 24/7.',
  'Hay hospitales y centros cerca de ti. Toca para ver los más cercanos.',
];

export const CrisisToast: React.FC<CrisisToastProps> = ({ 
  message, 
  onDismiss 
}) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message || CRISIS_MESSAGES[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  const showToast = useCallback((customMessage?: string) => {
    setCurrentMessage(customMessage || CRISIS_MESSAGES[0]);
    setVisible(true);
    // Auto-rotate messages every 8s if visible
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % CRISIS_MESSAGES.length);
      setCurrentMessage(CRISIS_MESSAGES[messageIndex]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, []);

  const handleAction = useCallback(() => {
    navigate('/resources');
    setVisible(false);
  }, [navigate]);

  // Listen for global crisis events
  useEffect(() => {
    const onCrisisDetected = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      showToast(detail?.message);
    };
    window.addEventListener('alivia:crisis-detected', onCrisisDetected as EventListener);
    return () => window.removeEventListener('alivia:crisis-detected', onCrisisDetected as EventListener);
  }, [showToast]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(104px + env(safe-area-inset-bottom))',
        zIndex: 900,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'auto',
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.15) 0%, rgba(211, 47, 47, 0.08) 100%)',
          border: '1px solid rgba(211, 47, 47, 0.25)',
          boxShadow: '0 16px 48px rgba(211, 47, 47, 0.25), 0 0 0 1px rgba(211, 47, 47, 0.1)',
          color: '#fff',
          fontFamily: 'var(--font-body)',
          fontSize: '13.5px',
          lineHeight: 1.5,
          maxWidth: 'calc(100vw - 32px)',
          animation: 'slideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          <Shield size={20} color="#ff8a80" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '14px', color: '#ffccbc' }}>
            ¿Necesitas ayuda ahora?
          </p>
          <p style={{ margin: 0, opacity: 0.95, fontSize: '13px' }}>
            {currentMessage}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--font-title)',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(211, 47, 47, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Shield size={14} />
            Ver recursos cercanos
            <ChevronRight size={13} />
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-title)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={13} /> Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};

// Export helper to trigger from anywhere
export function triggerCrisisToast(message?: string) {
  window.dispatchEvent(new CustomEvent('alivia:crisis-detected', { 
    detail: { message } 
  }));
}

// Global singleton for easy access
declare global {
  interface Window {
    aliviaCrisisToast?: { show: (message?: string) => void };
  }
}

// Initialize global accessor
if (typeof window !== 'undefined') {
  window.aliviaCrisisToast = {
    show: triggerCrisisToast,
  };
}

export default CrisisToast;
